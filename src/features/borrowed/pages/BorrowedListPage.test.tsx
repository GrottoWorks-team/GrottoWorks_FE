import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BorrowedListPage from './BorrowedListPage'
import type { BorrowedItem } from '@/types'

const mockItems: BorrowedItem[] = [
  {
    id: 'b-1',
    seasonId: 'season-1',
    workAreaId: 'area-1',
    offeredBy: 'user-1',
    ownerName: 'Nguyen Van Chu Kho',
    ownerPhone: '0901234567',
    itemName: 'May tron be tong mini',
    quantity: 1,
    description: 'May dung tot',
    expectedReturnDate: '2026-12-01',
    status: 'ACCEPTED',
    overdue: false,
    createdAt: '2026-11-01T10:00:00Z',
    version: 1,
  },
  {
    id: 'b-2',
    seasonId: 'season-1',
    workAreaId: 'area-2',
    offeredBy: 'user-2',
    ownerName: 'Tran Van Thiet Bi',
    ownerPhone: '0987654321',
    itemName: 'May phat dien Honda',
    quantity: 2,
    expectedReturnDate: '2026-10-15',
    status: 'IN_USE',
    overdue: true,
    createdAt: '2026-10-01T10:00:00Z',
    version: 2,
  },
  {
    id: 'b-3',
    seasonId: 'season-1',
    workAreaId: 'area-1',
    offeredBy: 'user-3',
    ownerName: 'Le Thi Dung Cu',
    itemName: 'Bo gian giao sat',
    quantity: 10,
    expectedReturnDate: '2026-10-20',
    status: 'RETURNED',
    overdue: false,
    createdAt: '2026-09-20T10:00:00Z',
    version: 3,
  },
]

let currentMockData: BorrowedItem[] = mockItems

vi.mock('../api', () => ({
  useBorrowedItems: () => ({
    data: currentMockData,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  currentMockData = mockItems
})

test('hiển thị tiêu đề, 4 StatCards và các dòng đồ mượn', () => {
  render(<BorrowedListPage />)

  expect(screen.getByText('Đồ mượn')).toBeDefined()
  expect(screen.getByText('May tron be tong mini')).toBeDefined()
  expect(screen.getByText('May phat dien Honda')).toBeDefined()
  expect(screen.getByText('Bo gian giao sat')).toBeDefined()
  expect(screen.getByText('Nguyen Van Chu Kho')).toBeDefined()
  expect(screen.getByText('Tran Van Thiet Bi')).toBeDefined()

  // 4 StatCards
  expect(screen.getByText('Tổng đồ mượn')).toBeDefined()
  expect(screen.getAllByText('Đang sử dụng').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Quá hạn').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Đã hoàn trả').length).toBeGreaterThan(0)
})

test('tìm kiếm đồ mượn theo từ khóa', async () => {
  const user = userEvent.setup()
  render(<BorrowedListPage />)

  const searchInput = screen.getByRole('textbox')
  await user.type(searchInput, 'phat dien')

  expect(screen.getByText('May phat dien Honda')).toBeDefined()
  expect(screen.queryByText('May tron be tong mini')).toBeNull()
  expect(screen.queryByText('Bo gian giao sat')).toBeNull()
})

test('lọc đồ mượn theo trạng thái và quá hạn', async () => {
  const user = userEvent.setup()
  render(<BorrowedListPage />)

  // Bấm chip "Quá hạn"
  const overdueChips = screen.getAllByRole('button', { name: /Quá hạn|OVERDUE/i })
  await user.click(overdueChips[0])

  expect(screen.getByText('May phat dien Honda')).toBeDefined()
  expect(screen.queryByText('May tron be tong mini')).toBeNull()
  expect(screen.queryByText('Bo gian giao sat')).toBeNull()
})

test('xuất file CSV khi bấm nút Xuất CSV', () => {
  render(<BorrowedListPage />)

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
  render(<BorrowedListPage />)

  expect(screen.getByText('Chưa có đồ mượn nào.')).toBeDefined()
})
