// Chấm công — BE TaskExecution `/attendance-*`, `/working-hours`.
// Web (Leader) chỉ duyệt đơn: check-in request, correction request, và xem giờ
// công theo khu. Check-in/out và gửi đơn sửa thuộc app mobile (role VOLUNTEER).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type {
  AttendanceCorrection,
  AttendanceCorrectionStatus,
  AttendanceRequest,
  AttendanceRequestStatus,
  Timesheet,
  WorkingHourSummary,
} from '@/types'

export const attendanceKeys = {
  requests: (areaId: string, status: string) => ['attendance', 'requests', areaId, status] as const,
  corrections: (areaId: string, status: string) => ['attendance', 'corrections', areaId, status] as const,
  hours: (areaId: string) => ['attendance', 'hours', areaId] as const,
}

/** Danh sách đơn xin check-in của khu (mặc định PENDING). */
export function useAttendanceRequests(
  areaId?: string,
  status: AttendanceRequestStatus = 'PENDING',
) {
  return useQuery({
    queryKey: attendanceKeys.requests(areaId ?? '', status),
    queryFn: async () => {
      const res = await apiPaged<AttendanceRequest>(
        `/api/v1/work-areas/${areaId}/attendance-requests?status=${status}&size=100`,
      )
      return res.data
    },
    enabled: Boolean(areaId),
  })
}

export function useReviewAttendanceRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      requestId,
      approve,
      version,
      reviewNote,
    }: {
      requestId: string
      approve: boolean
      version: number
      reviewNote?: string
    }) =>
      api<AttendanceRequest>(
        `/api/v1/attendance-requests/${requestId}/${approve ? 'approve' : 'reject'}`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${version}"` },
          body: JSON.stringify({ version, reviewNote: reviewNote || null }),
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

export function useAttendanceCorrections(
  areaId?: string,
  status: AttendanceCorrectionStatus = 'PENDING',
) {
  return useQuery({
    queryKey: attendanceKeys.corrections(areaId ?? '', status),
    queryFn: async () => {
      const res = await apiPaged<AttendanceCorrection>(
        `/api/v1/work-areas/${areaId}/attendance-corrections?status=${status}&size=100`,
      )
      return res.data
    },
    enabled: Boolean(areaId),
  })
}

export function useReviewCorrection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      correctionId,
      approve,
      version,
      reviewNote,
    }: {
      correctionId: string
      approve: boolean
      version: number
      reviewNote?: string
    }) =>
      api<AttendanceCorrection>(
        `/api/v1/attendance-corrections/${correctionId}/${approve ? 'approve' : 'reject'}`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${version}"` },
          body: JSON.stringify({ version, reviewNote: reviewNote || null }),
        },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance'] }),
  })
}

export interface OpenAttendanceSession {
  id: string
  assignmentId: string
  checkInAt: string
  checkOutAt?: string | null
  approvedMinutes: number
  status: string
  version: number
  /** Ngữ cảnh "phiên của ai / nhiệm vụ nào" (BE bổ sung 11/11/2026). */
  volunteerId?: string | null
  taskId?: string | null
  taskName?: string | null
}

/**
 * GET /api/v1/attendance/open-sessions — phiên mở quá lâu (LEADER/ADMIN).
 * `areaId` lọc theo khu đang chọn để cảnh báo khớp với bảng đơn bên trên.
 */
export function useOpenAttendanceSessions(hours?: number, areaId?: string) {
  return useQuery({
    queryKey: ['attendance', 'open-sessions', hours ?? 'default', areaId ?? 'all'] as const,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (hours) params.set('hours', String(hours))
      // BE bind theo tên tham số `workAreaId` (minimal API).
      if (areaId) params.set('workAreaId', areaId)
      const qs = params.toString()
      const res = await api<OpenAttendanceSession[] | { data?: OpenAttendanceSession[] }>(
        `/api/v1/attendance/open-sessions${qs ? `?${qs}` : ''}`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
  })
}

/** Tổng giờ công đã duyệt của khu (`GET /work-areas/{id}/working-hours`). */
export function useWorkingHours(areaId?: string) {
  return useQuery({
    queryKey: attendanceKeys.hours(areaId ?? ''),
    queryFn: async () => {
      const res = await api<{ data?: WorkingHourSummary[] } | WorkingHourSummary[]>(
        `/api/v1/work-areas/${areaId}/working-hours`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(areaId),
  })
}

/**
 * Web không còn màn hình timesheet: BE chỉ cho VOLUNTEER đọc `/users/me/attendance`
 * và web không có role này. Giữ hook trả rỗng để trang Profile/hồ sơ TNV không
 * gọi path legacy `/timesheets`.
 */
export function useTimesheets(_volunteerId?: string) {
  return useQuery({
    queryKey: ['timesheets'],
    queryFn: async (): Promise<Timesheet[]> => [],
    staleTime: Infinity,
  })
}