import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SupportListPage from './SupportListPage'
import type { SupportRequest } from '@/types'

const mockRequests: SupportRequest[] = [
  {
    id: 'req-1',
    seasonId: 'season-1',
    workAreaId: 'area-1',
    requestedBy: 'u-1',
    supportType: 'STAFFING',
    description: 'Can 4 TNV ho tro lap dat he thong dien',
    deadline: '2026-11-20',
    status: 'PUBLISHED',
    createdAt: '2026-11-02T10:00:00Z',
    version: 1,
    positions: [
      {
        id: 'p-1',
        name: 'Tho dien ho tro',
        requiredVolunteerCount: 2,
        note: 'Kinh nghiem',
        skills: [],
      },
      {
        id: 'p-2',
        name: 'Phu ta keo day',
        requiredVolunteerCount: 2,
        skills: [],
      },
    ],
    materials: [],
  },
  {
    id: 'req-2',
    seasonId: 'season-1',
    workAreaId: 'area-2',
    requestedBy: 'u-2',
    supportType: 'MATERIAL',
    description: 'Thieu 50 bao xi mang trang',
    deadline: '2026-11-15',
    status: 'FULFILLED',
    createdAt: '2026-11-01T15:00:00Z',
    version: 2,
    positions: [],
    materials: [
      {
        id: 'm-1',
        materialId: 'mat-1',
        requiredQuantity: 50,
      },
    ],
  },
]

let currentMockData: SupportRequest[] = mockRequests

vi.mock('../api', () => ({
  useSupportRequests: () => ({
    data: currentMockData,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  currentMockData = mockRequests
})

test('hiển thị tiêu đề, 4 StatCards và các dòng yêu cầu hỗ trợ', () => {
  render(<SupportListPage />)

  expect(screen.getByText('Hỗ trợ khẩn cấp')).toBeDefined()
  expect(screen.getByText('Can 4 TNV ho tro lap dat he thong dien')).toBeDefined()
  expect(screen.getByText('Thieu 50 bao xi mang trang')).toBeDefined()
  expect(screen.getByText('Tho dien ho tro')).toBeDefined()

  // 4 StatCards
  expect(screen.getByText('Tổng yêu cầu')).toBeDefined()
  expect(screen.getAllByText('Huy động nhân lực').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Hỗ trợ vật tư').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Đã đáp ứng').length).toBeGreaterThan(0)
})

test('tìm kiếm yêu cầu hỗ trợ theo mô tả', async () => {
  const user = userEvent.setup()
  render(<SupportListPage />)

  const searchInput = screen.getByRole('textbox')
  await user.type(searchInput, 'xi mang')

  expect(screen.getByText('Thieu 50 bao xi mang trang')).toBeDefined()
  expect(screen.queryByText('Can 4 TNV ho tro lap dat he thong dien')).toBeNull()
})

test('lọc yêu cầu hỗ trợ theo loại', async () => {
  const user = userEvent.setup()
  render(<SupportListPage />)

  const staffingChip = screen.getByRole('button', { name: /Huy động nhân lực|statStaffing/i })
  await user.click(staffingChip)

  expect(screen.getByText('Can 4 TNV ho tro lap dat he thong dien')).toBeDefined()
  expect(screen.queryByText('Thieu 50 bao xi mang trang')).toBeNull()
})

test('xuất file CSV khi bấm nút Xuất CSV', () => {
  render(<SupportListPage />)

  const createObjectUrlMock = vi.fn(() => 'blob:mock-url')
  const revokeObjectUrlMock = vi.fn()
  global.URL.createObjectURL = createObjectUrlMock
  global.URL.revokeObjectURL = revokeObjectUrlMock

  const exportBtn = screen.getByRole('button', { name: /Xuất CSV|exportCSV/i })
  fireEvent.click(exportBtn)

  expect(createObjectUrlMock).toHaveBeenCalled()
  expect(revokeObjectUrlMock).toHaveBeenCalled()
})

test('hiển thị thông báo khi không có dữ liệu', () => {
  currentMockData = []
  render(<SupportListPage />)

  expect(screen.getByText('Chưa có yêu cầu hỗ trợ nào.')).toBeDefined()
})
