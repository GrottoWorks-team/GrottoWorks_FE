import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimesheetPage from './TimesheetPage'
import { exportCsv } from '@/lib/csv'
import type {
  AttendanceDto,
  WorkingHourSummary,
  AttendanceRequestDto,
  AttendanceCorrectionDto,
} from '@/types'

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

const mockRequests: AttendanceRequestDto[] = [
  {
    id: 'req-1',
    assignmentId: 'assign-1',
    type: 'CHECK_IN',
    requestedAt: '2026-11-10T08:00:00Z',
    status: 'Pending',
    note: 'Đến đúng giờ ca sáng',
    version: 1,
  },
]

const mockCorrections: AttendanceCorrectionDto[] = [
  {
    id: 'corr-1',
    attendanceId: 'att-1',
    requestedBy: 'vol-1',
    originalCheckInAt: '2026-11-09T08:00:00Z',
    originalCheckOutAt: '2026-11-09T10:00:00Z',
    requestedCheckInAt: '2026-11-09T08:00:00Z',
    requestedCheckOutAt: '2026-11-09T12:00:00Z',
    reason: 'Quên bấm check-out lúc 12h',
    status: 'Pending',
    createdAt: '2026-11-09T13:00:00Z',
    version: 1,
  },
]

const mockOpenSessions: AttendanceDto[] = [
  {
    id: 'open-att-1',
    assignmentId: 'assign-2',
    checkInAt: '2026-11-09T07:00:00Z',
    checkOutAt: null,
    approvedMinutes: 0,
    status: 'OPEN',
    version: 1,
  },
]

let currentMockHours: WorkingHourSummary[] = mockWorkingHours
let currentMockAttendance: AttendanceDto[] = mockAttendance
let currentMockRequests: AttendanceRequestDto[] = mockRequests
let currentMockCorrections: AttendanceCorrectionDto[] = mockCorrections
let currentMockOpenSessions: AttendanceDto[] = mockOpenSessions

const mockApproveRequest = vi.fn().mockResolvedValue({})
const mockRejectRequest = vi.fn().mockResolvedValue({})
const mockApproveCorrection = vi.fn().mockResolvedValue({})
const mockRejectCorrection = vi.fn().mockResolvedValue({})

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
  useAttendanceRequests: () => ({
    data: currentMockRequests,
    isPending: false,
    error: null,
  }),
  useApproveAttendanceRequest: () => ({
    mutateAsync: mockApproveRequest,
    isPending: false,
  }),
  useRejectAttendanceRequest: () => ({
    mutateAsync: mockRejectRequest,
    isPending: false,
  }),
  useAttendanceCorrections: () => ({
    data: currentMockCorrections,
    isPending: false,
    error: null,
  }),
  useApproveAttendanceCorrection: () => ({
    mutateAsync: mockApproveCorrection,
    isPending: false,
  }),
  useRejectAttendanceCorrection: () => ({
    mutateAsync: mockRejectCorrection,
    isPending: false,
  }),
  useOpenAttendanceSessions: () => ({
    data: currentMockOpenSessions,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  currentMockHours = mockWorkingHours
  currentMockAttendance = mockAttendance
  currentMockRequests = mockRequests
  currentMockCorrections = mockCorrections
  currentMockOpenSessions = mockOpenSessions
  vi.clearAllMocks()
})

test('hiển thị tiêu đề, 4 StatCards và bảng tổng hợp giờ công khu vực', () => {
  render(<TimesheetPage />)

  expect(screen.getByText('Chấm công')).toBeDefined()
  expect(screen.getByText('Tổng tình nguyện viên')).toBeDefined()
  expect(screen.getByText('Tổng giờ công')).toBeDefined()
  expect(screen.getByText('Tổng số phút')).toBeDefined()
  expect(screen.getByText('Trung bình giờ/người')).toBeDefined()

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

test('chuyển qua tab Chờ duyệt: hiển thị cảnh báo ca mở quá 12h, danh sách yêu cầu và chỉnh sửa', async () => {
  const user = userEvent.setup()
  render(<TimesheetPage />)

  const approvalsTab = screen.getByRole('button', { name: /Chờ duyệt/i })
  await user.click(approvalsTab)

  expect(screen.getByText(/hơn 12 giờ/i)).toBeDefined()
  expect(screen.getByText('Yêu cầu chấm công')).toBeDefined()
  expect(screen.getByText('Yêu cầu điều chỉnh công')).toBeDefined()
  expect(screen.getByText('Đến đúng giờ ca sáng')).toBeDefined()
  expect(screen.getByText('Quên bấm check-out lúc 12h')).toBeDefined()
})

test('bấm Duyệt yêu cầu chấm công → mở dialog xác nhận và gửi mutation thành công', async () => {
  const user = userEvent.setup()
  render(<TimesheetPage />)

  const approvalsTab = screen.getByRole('button', { name: /Chờ duyệt/i })
  await user.click(approvalsTab)

  const approveBtns = screen.getAllByRole('button', { name: /^Duyệt$/i })
  await user.click(approveBtns[0])

  expect(screen.getByText('Xác nhận phê duyệt')).toBeDefined()

  const noteInput = screen.getByPlaceholderText(/Ghi chú duyệt/i)
  fireEvent.change(noteInput, { target: { value: 'Duyệt ca chuẩn' } })

  const confirmBtn = screen.getByTestId('review-confirm-btn')
  await user.click(confirmBtn)

  expect(mockApproveRequest).toHaveBeenCalledWith({
    id: 'req-1',
    version: 1,
    reviewNote: 'Duyệt ca chuẩn',
  })
})

test('bấm Từ chối yêu cầu sửa công → mở dialog xác nhận và gửi mutation reject', async () => {
  const user = userEvent.setup()
  render(<TimesheetPage />)

  const approvalsTab = screen.getByRole('button', { name: /Chờ duyệt/i })
  await user.click(approvalsTab)

  const rejectBtns = screen.getAllByRole('button', { name: /^Từ chối$/i })
  // Nút reject thứ 2 là của bảng correction
  await user.click(rejectBtns[1])

  expect(screen.getByText('Xác nhận từ chối')).toBeDefined()

  const confirmBtn = screen.getByTestId('review-confirm-btn')
  await user.click(confirmBtn)

  expect(mockRejectCorrection).toHaveBeenCalledWith({
    id: 'corr-1',
    version: 1,
    reviewNote: undefined,
  })
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
