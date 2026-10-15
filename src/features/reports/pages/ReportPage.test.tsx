import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import ReportPage from './ReportPage'

const mockReportData = {
  purchaseRecords: [
    { id: 'pc1', areaId: 'a1', materialId: 'm1', cost: 2760000, date: '2026-10-10', buyerId: 'u4', supplier: 'Đại lý A', qty: 10, confirmed: true },
    { id: 'pc2', areaId: 'a1', materialId: 'm1', cost: 700000, date: '2026-10-11', buyerId: 'u4', supplier: 'Đại lý A', qty: 5, confirmed: true },
    { id: 'pc3', areaId: 'a1', materialId: 'm1', cost: 2700000, date: '2026-10-12', buyerId: 'u4', supplier: 'Đại lý A', qty: 15, confirmed: true },
    { id: 'pc4', areaId: 'a1', materialId: 'm1', cost: 600000, date: '2026-10-13', buyerId: 'u4', supplier: 'Đại lý A', qty: 3, confirmed: true },
  ],
  donations: [
    { id: 'd1', donorName: 'Bà Anna Võ Kim Ngân', materialId: 'm1', monetary: 5000000, date: '2026-10-10', promisedQty: 10, receivedQty: 10, status: 'RECEIVED' },
  ],
  timesheets: [
    { id: 'ts1', volunteerId: 'u27', hours: 7, status: 'APPROVED', date: '2026-10-10' },
    { id: 'ts2', volunteerId: 'u27', hours: 7, status: 'APPROVED', date: '2026-10-11' },
    { id: 'ts3', volunteerId: 'u27', hours: 7, status: 'APPROVED', date: '2026-10-12' },
    { id: 'ts4', volunteerId: 'u27', hours: 7, status: 'APPROVED', date: '2026-10-13' },
  ],
  tasks: [
    { id: 't1', areaId: 'a1', title: 'Xây nền hang đá', status: 'DONE', assignees: ['u27', 'u11'], estimateHours: 10, dueDate: '2026-10-15', submittedPhotos: 2 },
  ],
  users: [
    { id: 'u11', name: 'Antôn Nguyễn Đức Long', role: 'VOLUNTEER', points: 130, communityId: 'c1', skills: [], avatarHue: 10 },
    { id: 'u27', name: 'Antôn Trương Minh Nhật', role: 'VOLUNTEER', points: 100, communityId: 'c1', skills: [], avatarHue: 20 },
  ],
  communities: [
    { id: 'c1', name: 'Giáo khu Thánh Tâm' },
  ],
  areas: [
    { id: 'a1', name: 'Hang đá Bê-lem', seasonId: 's1', type: 'GROTTO', level: 'PARISH' },
  ],
  materials: [
    { id: 'm1', name: 'Xi măng PCB40', areaId: 'a1', unit: 'bao' },
  ],
}

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u2', role: 'COMMUNITY', name: 'Giuse Bình' },
    isPending: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../api', () => ({
  useReportData: () => ({ data: mockReportData, isPending: false }),
}))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ReportPage />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const blobBytes = (b: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(new Uint8Array(fr.result as ArrayBuffer))
    fr.readAsArrayBuffer(b)
  })

test('render aggregates đúng seed: tổng chi phí, nhiệm vụ DONE, giờ công, quyên góp', async () => {
  mount()

  expect(await screen.findByText('6.760.000', {}, { timeout: 5000 })).toBeDefined()
  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()
  expect(await screen.findByText('Bà Anna Võ Kim Ngân')).toBeDefined()
  const hoursRow = (await screen.findAllByText('Antôn Trương Minh Nhật')).find((el) =>
    el.closest('tr')?.textContent?.includes('28.0'),
  )
  expect(hoursRow).toBeDefined()
})

test('RecognitionBoard sort điểm giảm dần — top 1 huy chương vàng (u11, 130 điểm)', async () => {
  mount()

  const top = (await screen.findByText('Antôn Nguyễn Đức Long')).closest('tr')!
  expect(top.textContent).toContain('130')
  expect(screen.getAllByLabelText('Hạng 1')).toHaveLength(1)
})

test('Xuất CSV bảng chi phí: đúng tên file + BOM UTF-8', async () => {
  mount()
  const user = userEvent.setup()

  await screen.findAllByText('Xi măng PCB40')
  const exportButtons = await screen.findAllByRole('button', { name: 'Xuất CSV' })
  expect(exportButtons.length).toBe(4)

  let captured: Blob | null = null
  let filename = ''
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((b: Blob) => {
      captured = b
      return 'blob:mock'
    }),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download
  })

  await user.click(exportButtons[0])

  expect(filename).toBe('grottoworks-bao-cao-chi-phi.csv')
  const bytes = await blobBytes(captured!)
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
