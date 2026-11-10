import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import PointRulesPage from './PointRulesPage'
import type { RecognitionRuleDto } from '@/types'
import * as csvModule from '@/lib/csv'

const mockRules: RecognitionRuleDto[] = [
  {
    id: 'r1',
    contributionTypeId: 'ct1',
    contributionTypeCode: 'TASK_COMPLETION',
    name: 'Hoàn thành nhiệm vụ thi công',
    ruleVersion: 1,
    points: 50,
    description: 'Thưởng 50 điểm cho nhiệm vụ thi công',
    status: 'ACTIVE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    version: 1,
  },
  {
    id: 'r2',
    contributionTypeId: 'ct2',
    contributionTypeCode: 'VOLUNTEER_HOURS',
    name: 'Giờ công tình nguyện',
    ruleVersion: 1,
    points: 10,
    description: '10 điểm cho mỗi giờ công',
    status: 'ACTIVE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    version: 1,
  },
  {
    id: 'r3',
    contributionTypeId: 'ct3',
    contributionTypeCode: 'SPECIAL_SUPPORT',
    name: 'Hỗ trợ đặc biệt',
    ruleVersion: 1,
    points: 30,
    description: 'Quy tắc cũ tạm ngưng',
    status: 'INACTIVE',
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31',
    version: 1,
  },
]

let rulesData = mockRules
let isLoading = false
const mockDeactivate = vi.fn()

vi.mock('@/features/recognition/api', () => ({
  useRecognitionRules: () => ({ data: rulesData, isLoading }),
  useDeactivateRecognitionRule: () => ({
    mutateAsync: mockDeactivate,
    isPending: false,
  }),
}))

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>
          <PointRulesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  rulesData = mockRules
  isLoading = false
  vi.clearAllMocks()
})

test('hiển thị tiêu đề, thông báo Read-Only, 4 StatCards và bảng quy tắc điểm', async () => {
  mount()

  expect(screen.getByText('Quy tắc điểm')).toBeDefined()
  expect(screen.getByText(/Chế độ xem: Bảng quy tắc tính điểm thi đua do Quản trị viên/i)).toBeDefined()

  // 4 StatCards
  expect(screen.getByText('Tổng số quy tắc')).toBeDefined()
  expect(screen.getAllByText('3')).toHaveLength(2)
  expect(screen.getByText('Đang áp dụng')).toBeDefined()
  expect(screen.getByText('2')).toBeDefined()
  expect(screen.getByText('Điểm cao nhất')).toBeDefined()
  expect(screen.getByText('50')).toBeDefined()
  expect(screen.getByText('pts')).toBeDefined()

  // Dòng bảng
  expect(screen.getByText('Hoàn thành nhiệm vụ thi công')).toBeDefined()
  expect(screen.getByText('Giờ công tình nguyện')).toBeDefined()
  expect(screen.getByText('Hỗ trợ đặc biệt')).toBeDefined()
  expect(screen.getByText('+50')).toBeDefined()
  expect(screen.getByText('+10')).toBeDefined()
})

test('tìm kiếm quy tắc theo tên hoặc mã đóng góp', async () => {
  mount()

  const searchInput = screen.getByPlaceholderText(/Tìm kiếm/i)
  fireEvent.change(searchInput, { target: { value: 'Giờ công' } })

  expect(screen.getByText('Giờ công tình nguyện')).toBeDefined()
  expect(screen.queryByText('Hoàn thành nhiệm vụ thi công')).toBeNull()
})

test('lọc quy tắc Đang hiệu lực', async () => {
  mount()

  const activeBtn = screen.getByRole('button', { name: 'Đang hiệu lực' })
  fireEvent.click(activeBtn)

  expect(screen.getByText('Hoàn thành nhiệm vụ thi công')).toBeDefined()
  expect(screen.getByText('Giờ công tình nguyện')).toBeDefined()
  expect(screen.queryByText('Hỗ trợ đặc biệt')).toBeNull()
})

test('xuất CSV quy tắc tính điểm', async () => {
  const exportSpy = vi.spyOn(csvModule, 'exportCsv').mockImplementation(() => {})
  mount()

  const exportBtn = screen.getByRole('button', { name: /Xuất CSV/i })
  fireEvent.click(exportBtn)

  expect(exportSpy).toHaveBeenCalledWith(
    'quy-tac-diem-thuong.csv',
    expect.arrayContaining([
      expect.objectContaining({
        'Tên quy tắc': 'Hoàn thành nhiệm vụ thi công',
        'Điểm thưởng': 50,
      }),
    ]),
  )
})

test('bấm nút vô hiệu hoá mở dialog và kích hoạt useDeactivateRecognitionRule', async () => {
  mockDeactivate.mockResolvedValueOnce(undefined)
  mount()

  const deactivateBtn = screen.getByTestId('deactivate-rule-btn-r1')
  fireEvent.click(deactivateBtn)

  expect(screen.getByText('Vô hiệu hoá quy tắc tính điểm')).toBeDefined()

  const input = screen.getByTestId('deactivate-reason-input')
  fireEvent.change(input, { target: { value: 'Thay thế bằng quy tắc mới' } })

  const confirmBtn = screen.getByTestId('confirm-deactivate-btn')
  fireEvent.click(confirmBtn)

  expect(mockDeactivate).toHaveBeenCalledWith({
    id: 'r1',
    reason: 'Thay thế bằng quy tắc mới',
  })
})

