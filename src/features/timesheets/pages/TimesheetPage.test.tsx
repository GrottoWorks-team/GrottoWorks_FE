import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimesheetPage from './TimesheetPage'
import { exportCsv } from '@/lib/csv'
import type { AttendanceDto, WorkingHourSummary } from '@/types'

const mockWorkingHours: WorkingHourSummary[] = [
  {
    volunteerId: 'vol-1',
    approvedMinutes: 240,
    approvedHours: 4,
  },
  {
    volunteerId: 'vol-2',
    approvedMinutes: 120,
    approvedHours: 2,
  },
]

const mockAttendance: AttendanceDto[] = [
  {
    id: 'att-1',
    assignmentId: 'assign-1',
    checkInAt: '2026-11-01T08:00:00Z',
    checkOutAt: '2026-11-01T12:00:00Z',
    approvedMinutes: 240,
    status: 'CLOSED',
    version: 1,
  },
]

let currentMockHours: WorkingHourSummary[] = mockWorkingHours
let currentMockAttendance: AttendanceDto[] = mockAttendance

vi.mock('@/lib/csv', () => ({
  exportCsv: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'leader-1', role: 'LEADER', name: 'Trưởng khu Demo' },
    isPending: false,
  }),
}))

vi.mock('@/features/areas/api', () => ({
  useScopedAreas: () => ({
    data: [{ id: 'area-1', name: 'Khu Hang Da 1', leaderId: 'leader-1' }],
    isPending: false,
  }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({
    data: [
      { id: 'vol-1', name: 'Gioan Baotixita Nguyen', email: 'vol1@grottoworks.local' },
      { id: 'vol-2', name: 'Maria Tran Thi Mai', email: 'vol2@grottoworks.local' },
    ],
    isPending: false,
  }),
}))

vi.mock('../api', () => ({
  useWorkingHours: () => ({
    data: currentMockHours,
    isPending: false,
    error: null,
  }),
  useMyAttendance: () => ({
    data: currentMockAttendance,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  currentMockHours = mockWorkingHours
  currentMockAttendance = mockAttendance
  vi.clearAllMocks()
})

test('hiển thị tiêu đề, 4 StatCards và bảng tổng hợp giờ công khu vực', () => {
  render(<TimesheetPage />)

  expect(screen.getByText('Chấm công')).toBeDefined()
  expect(screen.getByText('Tổng tình nguyện viên')).toBeDefined()
  expect(screen.getByText('Tổng giờ công')).toBeDefined()
  expect(screen.getByText('Tổng số phút')).toBeDefined()
  expect(screen.getByText('Trung bình giờ/người')).toBeDefined()

  // Kiểm tra tên tình nguyện viên trong bảng
  expect(screen.getByText('Gioan Baotixita Nguyen')).toBeDefined()
  expect(screen.getByText('Maria Tran Thi Mai')).toBeDefined()
  expect(screen.getByText('4.00 giờ')).toBeDefined()
})

test('tìm kiếm tình nguyện viên theo tên hoặc id', async () => {
  const user = userEvent.setup()
  render(<TimesheetPage />)

  const searchInput = screen.getByRole('textbox')
  await user.type(searchInput, 'Maria')

  expect(screen.getByText('Maria Tran Thi Mai')).toBeDefined()
  expect(screen.queryByText('Gioan Baotixita Nguyen')).toBeNull()
})

test('chuyển đổi qua tab Điểm danh cá nhân và hiển thị dữ liệu phiên', async () => {
  const user = userEvent.setup()
  render(<TimesheetPage />)

  const personalTab = screen.getByRole('button', { name: /Điểm danh cá nhân|personal/i })
  await user.click(personalTab)

  expect(screen.getByText('Mã phiên')).toBeDefined()
  expect(screen.getByText('240 phút')).toBeDefined()
})

test('xuất CSV khi bấm nút Xuất CSV', () => {
  render(<TimesheetPage />)

  const exportBtn = screen.getByRole('button', { name: /Xuất CSV|export/i })
  fireEvent.click(exportBtn)

  expect(exportCsv).toHaveBeenCalled()
})

test('hiển thị empty message khi danh sách rỗng', () => {
  currentMockHours = []
  render(<TimesheetPage />)

  expect(screen.getByText('Chưa có bản ghi chấm công nào.')).toBeDefined()
})
