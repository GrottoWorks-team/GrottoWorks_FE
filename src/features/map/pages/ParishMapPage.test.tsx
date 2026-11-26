import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/lib/i18n'
import { api, ApiError } from '@/lib/api'
import { uploadFileViaGateway } from '@/features/files/api'
import ParishMapPage from './ParishMapPage'

const mocks = vi.hoisted(() => ({ parishId: 'parish-a', toast: vi.fn() }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/api')>(),
  api: vi.fn(),
}))
vi.mock('@/features/files/api', () => ({ uploadFileViaGateway: vi.fn(), getFileDownloadUrl: vi.fn() }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { role: 'PARISH' } }) }))
vi.mock('@/components/ui/toast', () => ({ useToast: () => mocks.toast }))
vi.mock('@/features/areas/api', () => ({ useAreas: () => ({ data: [] }), useSeasons: () => ({ data: [] }) }))
vi.mock('@/features/season/season-context', () => ({ useSeasonContext: () => ({}) }))
vi.mock('@/features/parish/hooks', () => ({
  useParishScope: () => ({ parishId: mocks.parishId, canPickParish: false }),
}))
vi.mock('@/features/areas/components/AreaCard', () => ({ AREA_ICONS: {} }))
vi.mock('@/features/designs/components/ImageReviewCanvas', () => ({ ImageReviewCanvas: () => null }))
vi.mock('../localStore', () => ({ mapStore: { listPins: () => ({}), removeMap: vi.fn() } }))

const pendingError = () => new ApiError(503, 'Backend pending message', 'FILE_ATTACHMENT_PENDING')
const processingText = 'Ảnh đang được xử lý. Vui lòng thử lại sau.'
const uploaded = { fileId: 'file-a', fileName: 'server-map.png', contentType: 'image/png', sizeBytes: 3 }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function mount(embedded = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const ui = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter><ParishMapPage embedded={embedded} /></MemoryRouter>
    </QueryClientProvider>
  )
  const result = render(ui())
  const invalidation = vi.spyOn(client, 'invalidateQueries')
  return { ...result, client, invalidation, changeParish: (id: string) => {
    mocks.parishId = id
    result.rerender(ui())
  } }
}

function pick(container: HTMLElement, name = 'local-map.png') {
  const file = new File(['png'], name, { type: 'image/png' })
  fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } })
  return file
}

function puts() {
  return vi.mocked(api).mock.calls.filter(([, options]) => options?.method === 'PUT')
}

beforeEach(async () => {
  vi.clearAllMocks()
  mocks.parishId = 'parish-a'
  await i18n.changeLanguage('vi')
  vi.mocked(uploadFileViaGateway).mockResolvedValue(uploaded)
  vi.mocked(api).mockResolvedValue(null)
})

describe('parish map attachment retry', () => {
  it.each([false, true])('retries only PUT with the original uploaded metadata (embedded=%s)', async (embedded) => {
    let attempt = 0
    vi.mocked(api).mockImplementation(async (_url, options) => {
      if (options?.method !== 'PUT') return null
      if (++attempt < 3) throw pendingError()
      return { imageFileId: uploaded.fileId, fileName: uploaded.fileName }
    })
    const { container, invalidation } = mount(embedded)
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    const file = pick(container)
    await screen.findByText(processingText)
    expect(invalidation).not.toHaveBeenCalled()
    expect(mocks.toast).not.toHaveBeenCalledWith('Đã lưu bản đồ giáo xứ')
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(puts()).toHaveLength(2))
    await waitFor(() => expect((screen.getByRole('button', { name: 'Thử lại' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('Đã lưu bản đồ giáo xứ'))
    expect(uploadFileViaGateway).toHaveBeenCalledExactlyOnceWith(file, 'MAP_IMAGE')
    expect(puts()).toHaveLength(3)
    for (const [url, options] of puts()) {
      expect(url).toBe('/api/v1/parishes/parish-a/map')
      expect(JSON.parse(options!.body as string)).toEqual({ fileId: uploaded.fileId, fileName: uploaded.fileName })
    }
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['parishMaps', 'parish-a'] })
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  })

  it('blocks duplicate uploads and retries throughout upload and save', async () => {
    const upload = deferred<typeof uploaded>()
    const save = deferred<null>()
    vi.mocked(uploadFileViaGateway).mockReturnValueOnce(upload.promise)
    vi.mocked(api).mockImplementation(async (_url, options) => options?.method === 'PUT' ? save.promise : null)
    const { container } = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(container)
    pick(container)
    expect(uploadFileViaGateway).toHaveBeenCalledTimes(1)
    expect((container.querySelector('input') as HTMLInputElement).disabled).toBe(true)
    for (const button of screen.getAllByRole('button', { name: 'Tải bản đồ' })) {
      expect((button as HTMLButtonElement).disabled).toBe(true)
    }
    await act(async () => upload.resolve(uploaded))
    await waitFor(() => expect(puts()).toHaveLength(1))
    await act(async () => save.reject(pendingError()))
    await screen.findByText(processingText)
    const retrySave = deferred<null>()
    vi.mocked(api).mockImplementation(async (_url, options) => options?.method === 'PUT' ? retrySave.promise : null)
    const retry = screen.getByRole('button', { name: 'Thử lại' })
    fireEvent.click(retry)
    fireEvent.click(retry)
    expect((retry as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(puts()).toHaveLength(2))
    await act(async () => retrySave.reject(pendingError()))
    await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false))
  })

  it.each([
    new ApiError(503, 'Storage unavailable', 'STORAGE_UNAVAILABLE'),
    new ApiError(409, 'Attachment conflict', 'FILE_ATTACHMENT_PENDING'),
  ])('keeps uploaded metadata after other save errors: $status $code', async (error) => {
    vi.mocked(api).mockImplementation(async (_url, options) => {
      if (options?.method === 'PUT') throw error
      return null
    })
    const { container } = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(container)
    await screen.findByText(error.message)
    expect(screen.queryByText(processingText)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(puts()).toHaveLength(2))
    expect(uploadFileViaGateway).toHaveBeenCalledTimes(1)
  })

  it('replaces pending metadata when another valid image is chosen', async () => {
    vi.mocked(api).mockImplementation(async (_url, options) => {
      if (options?.method === 'PUT') throw pendingError()
      return null
    })
    const { container } = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(container)
    await screen.findByText(processingText)
    const next = { ...uploaded, fileId: 'file-b', fileName: 'new-map.png' }
    vi.mocked(uploadFileViaGateway).mockResolvedValueOnce(next)
    pick(container, 'new-map.png')
    await screen.findByText(processingText)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(puts()).toHaveLength(3))
    expect(uploadFileViaGateway).toHaveBeenCalledTimes(2)
    expect(JSON.parse(puts()[2][1]!.body as string)).toEqual({ fileId: next.fileId, fileName: next.fileName })
  })

  it('clears pending state on parish changes and on leaving the page', async () => {
    vi.mocked(api).mockImplementation(async (_url, options) => {
      if (options?.method === 'PUT') throw pendingError()
      return null
    })
    const view = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(view.container)
    await screen.findByText(processingText)
    view.changeParish('parish-b')
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    view.changeParish('parish-a')
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
    pick(view.container)
    await screen.findByText(processingText)
    view.unmount()
    const next = mount()
    await within(next.container).findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull()
  })

  it('does not save an upload that finishes after switching parishes', async () => {
    const upload = deferred<typeof uploaded>()
    vi.mocked(uploadFileViaGateway).mockReturnValueOnce(upload.promise)
    const view = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(view.container)
    view.changeParish('parish-b')
    await act(async () => upload.resolve(uploaded))
    expect(puts()).toHaveLength(0)
    expect(mocks.toast).not.toHaveBeenCalled()
  })

  it.each(['success', 'pending'])('ignores a stale save result (%s) in the new parish', async (result) => {
    const save = deferred<unknown>()
    vi.mocked(api).mockImplementation(async (_url, options) => options?.method === 'PUT' ? save.promise : null)
    const view = mount()
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    pick(view.container)
    await waitFor(() => expect(puts()).toHaveLength(1))
    view.changeParish('parish-b')
    await screen.findByText('Chưa có bản đồ mặt bằng giáo xứ.')
    await act(async () => {
      if (result === 'success') save.resolve({ imageFileId: uploaded.fileId })
      else save.reject(pendingError())
    })
    expect(mocks.toast).not.toHaveBeenCalled()
    expect(screen.queryByText(processingText)).toBeNull()
    expect(view.invalidation).not.toHaveBeenCalledWith({ queryKey: ['parishMaps', 'parish-b'] })
  })
})
