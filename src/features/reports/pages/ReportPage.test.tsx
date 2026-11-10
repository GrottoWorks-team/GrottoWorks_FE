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
    user: { id: 'u2', role: 'PARISH', name: 'Giuse Bình' },
    isPending: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/season/season-context', () => ({
  useSeasonContext: () => ({
    seasonId: 's1',
    season: { id: 's1', name: 'Giáng sinh 2026' },
  }),
}))

const mockMutateReportExport = vi.fn()
const mockMutateSystemExport = vi.fn()
let mockActiveJob: any = null

vi.mock('../api', () => ({
  useReportData: () => ({ data: mockReportData, isPending: false }),
  useCreateReportExport: () => ({
    mutateAsync: mockMutateReportExport,
    isPending: false,
  }),
  useCreateSystemDataExport: () => ({
    mutateAsync: mockMutateSystemExport,
    isPending: false,
  }),
  useReportExportJob: () => ({
    data: mockActiveJob,
    isPending: false,
  }),
  getReportExportFileUrl: (id: string) => `/api/v1/report-exports/${id}/file`,
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

test('render aggregates đúng seed: tổng chi phí và nhiệm vụ DONE', async () => {
  mount()

  expect(await screen.findByText('6.760.000', {}, { timeout: 5000 })).toBeDefined()
  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()
  // Báo cáo đã nối GET /api/v1/reports/* nên không còn ô "chờ Backend" nào;
  // khẳng định ngược lại để test bắt được nếu ai đó đưa trạng thái cũ trở lại.
  expect(screen.queryByText(/Tính năng đang chờ Backend/i)).toBeNull()
})

test('RecognitionBoard sort điểm giảm dần — top 1 huy chương vàng (u11, 130 điểm)', async () => {
  mount()

  const top = (await screen.findByText('Antôn Nguyễn Đức Long')).closest('tr')!
  expect(top.textContent).toContain('130')
  expect(screen.getAllByLabelText('Hạng 1')).toHaveLength(1)
})

test('Xuất CSV bảng nhiệm vụ hoàn thành: đúng tên file + BOM UTF-8', async () => {
  mount()
  const user = userEvent.setup()

  await screen.findByText('Xây nền hang đá')
  const exportButtons = await screen.findAllByRole('button', { name: 'Xuất CSV' })
  const enabledExport = exportButtons.find((btn) => !btn.hasAttribute('disabled'))
  expect(enabledExport).toBeDefined()

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

  await user.click(enabledExport!)

  expect(filename).toBe('grottoworks-bao-cao-nhiem-vu.csv')
  const bytes = await blobBytes(captured!)
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  // Khôi phục mock mà không làm mất matchMedia của test-setup
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

test('mở dialog xuất báo cáo máy chủ và kích hoạt useCreateReportExport', async () => {
  mount()
  const user = userEvent.setup()

  mockMutateReportExport.mockResolvedValueOnce({
    id: 'job-999',
    reportType: 'Materials',
    format: 'Pdf',
    status: 'Queued',
  })

  const openBtn = screen.getByTestId('open-export-dialog-btn')
  await user.click(openBtn)

  expect(screen.getByText('Xuất báo cáo máy chủ')).toBeDefined()

  const typeSelect = screen.getByTestId('export-report-type-select')
  await user.selectOptions(typeSelect, 'Materials')

  const formatSelect = screen.getByTestId('export-format-select')
  await user.selectOptions(formatSelect, 'Pdf')

  const startBtn = screen.getByTestId('start-export-btn')
  await user.click(startBtn)

  expect(mockMutateReportExport).toHaveBeenCalledWith({
    reportType: 'Materials',
    format: 'Pdf',
    seasonId: 's1',
  })
})

test('kích hoạt xuất dữ liệu toàn hệ thống cho tài khoản Admin/Parish', async () => {
  mount()
  const user = userEvent.setup()

  mockMutateSystemExport.mockResolvedValueOnce({
    jobId: 'sys-job-111',
    status: 'Queued',
  })

  const sysBtn = screen.getByTestId('system-data-export-btn')
  await user.click(sysBtn)

  expect(mockMutateSystemExport).toHaveBeenCalledWith({})
})

test('hiển thị trạng thái hoàn thành và link tải tệp khi có activeJob thành công', async () => {
  mockActiveJob = {
    id: 'job-completed-777',
    status: 'SUCCEEDED',
    fileName: 'materials_2026.xlsx',
    format: 'Xlsx',
  }

  mount()
  const user = userEvent.setup()

  const openBtn = screen.getByTestId('open-export-dialog-btn')
  await user.click(openBtn)

  expect(screen.getByTestId('export-job-status-card')).toBeDefined()
  expect(screen.getByText('SUCCEEDED')).toBeDefined()
  expect(screen.getByText('materials_2026.xlsx')).toBeDefined()

  const downloadBtn = screen.getByTestId('download-export-file-btn')
  expect(downloadBtn.getAttribute('href')).toBe('/api/v1/report-exports/job-completed-777/file')

  mockActiveJob = null
})

