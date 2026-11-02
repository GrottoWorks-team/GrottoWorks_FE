import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AllocationPage from './AllocationPage'
import type { Allocation } from '@/types'

const mockAllocations: Allocation[] = [
  {
    id: 'alloc-1',
    workAreaId: 'area-1',
    workAreaName: 'Khu Hang Da 1',
    taskId: null,
    taskName: null,
    allocatedBy: 'u-1',
    allocationDate: '2026-11-02T10:00:00Z',
    note: 'Cap phat dot 1 cho khu hang da',
    items: [
      {
        id: 'line-1',
        materialId: 'mat-1',
        materialCode: 'LED-WARM-10M',
        materialName: 'Day LED vang 10m',
        unit: 'cuon',
        allocatedQuantity: 5,
      },
    ],
  },
  {
    id: 'alloc-2',
    workAreaId: 'area-1',
    workAreaName: 'Khu Hang Da 1',
    taskId: 'task-10',
    taskName: 'Dung bo khung sat',
    allocatedBy: 'u-1',
    allocationDate: '2026-11-02T14:30:00Z',
    note: 'Cap sat cho task',
    items: [
      {
        id: 'line-2',
        materialId: 'mat-2',
        materialCode: 'STEEL-BOX-30',
        materialName: 'Sat hop ma kem 30x30',
        unit: 'cay',
        allocatedQuantity: 12,
      },
    ],
  },
]

let currentMockData: Allocation[] = mockAllocations

vi.mock('../api', () => ({
  useAllocations: () => ({
    data: currentMockData,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  currentMockData = mockAllocations
})

test('hiển thị tiêu đề, 4 StatCards và các dòng cấp phát', () => {
  render(<AllocationPage />)

  expect(screen.getByText('Phân bổ vật tư')).toBeDefined()
  expect(screen.getAllByText('Khu Hang Da 1').length).toBeGreaterThan(0)
  expect(screen.getByText('Dung bo khung sat')).toBeDefined()
  expect(screen.getByText('Day LED vang 10m')).toBeDefined()
  expect(screen.getByText('Sat hop ma kem 30x30')).toBeDefined()

  // 4 StatCards
  expect(screen.getByText('Tổng đợt cấp phát')).toBeDefined()
  expect(screen.getByText('Tổng số lượng cấp')).toBeDefined()
  expect(screen.getByText('Khu vực nhận')).toBeDefined()
  expect(screen.getByText('Theo nhiệm vụ')).toBeDefined()
})

test('tìm kiếm cấp phát theo tên vật tư hoặc nhiệm vụ', async () => {
  const user = userEvent.setup()
  render(<AllocationPage />)

  const searchInput = screen.getByRole('textbox')
  await user.type(searchInput, 'Sat hop')

  expect(screen.getByText('Sat hop ma kem 30x30')).toBeDefined()
  expect(screen.queryByText('Day LED vang 10m')).toBeNull()
})

test('lọc cấp phát theo khu vực hoặc nhiệm vụ', async () => {
  const user = userEvent.setup()
  render(<AllocationPage />)

  const taskFilterChip = screen.getByRole('button', { name: /Cấp theo nhiệm vụ|filterTaskSpecific/i })
  await user.click(taskFilterChip)

  expect(screen.getByText('Dung bo khung sat')).toBeDefined()
  expect(screen.queryByText('Day LED vang 10m')).toBeNull()
})

test('xuất file CSV khi bấm nút Xuất CSV', () => {
  render(<AllocationPage />)

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
  render(<AllocationPage />)

  expect(screen.getByText('Chưa có phân bổ nào.')).toBeDefined()
})
