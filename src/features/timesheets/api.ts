import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AttendanceDto, Timesheet, WorkingHourSummary } from '@/types'

export const timesheetKeys = {
  all: ['timesheets'] as const,
  workingHours: (areaId?: string) => ['working-hours', areaId] as const,
  myAttendance: (filter?: Record<string, unknown>) => ['attendance', 'me', filter] as const,
}

/**
 * GET /api/v1/work-areas/{workAreaId}/working-hours
 * Lấy tổng hợp giờ công của tất cả tình nguyện viên trong khu vực (LEADER & PARISH).
 */
export function useWorkingHours(workAreaId?: string, params?: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  const qs = query.toString() ? `?${query.toString()}` : ''

  return useQuery({
    queryKey: [...timesheetKeys.workingHours(workAreaId), params],
    queryFn: () => api<WorkingHourSummary[]>(`/api/v1/work-areas/${workAreaId}/working-hours${qs}`),
    enabled: Boolean(workAreaId),
  })
}

/**
 * GET /api/v1/users/me/attendance
 * Lấy lịch sử ca chấm công của chính tình nguyện viên đăng nhập (VOLUNTEER).
 */
export function useMyAttendance(filter?: {
  seasonId?: string
  workAreaId?: string
  status?: string
  from?: string
  to?: string
}) {
  const query = new URLSearchParams()
  if (filter?.seasonId) query.set('seasonId', filter.seasonId)
  if (filter?.workAreaId) query.set('workAreaId', filter.workAreaId)
  if (filter?.status) query.set('status', filter.status)
  if (filter?.from) query.set('from', filter.from)
  if (filter?.to) query.set('to', filter.to)
  const qs = query.toString() ? `?${query.toString()}` : ''

  return useQuery({
    queryKey: timesheetKeys.myAttendance(filter),
    queryFn: () => api<AttendanceDto[]>(`/api/v1/users/me/attendance${qs}`),
  })
}

/**
 * Hook tương thích cho trang Profile và các thành phần đọc Timesheet[].
 * Kết nối với GET /api/v1/users/me/attendance thật từ Backend.
 */
export function useTimesheets(volunteerId?: string) {
  return useQuery({
    queryKey: [...timesheetKeys.all, volunteerId],
    queryFn: async () => {
      try {
        const list = await api<AttendanceDto[]>('/api/v1/users/me/attendance')
        return (list || []).map(
          (a): Timesheet => ({
            id: a.id,
            volunteerId: volunteerId || a.assignmentId,
            date: a.checkInAt ? a.checkInAt.slice(0, 10) : '',
            checkIn: a.checkInAt,
            checkOut: a.checkOutAt ?? undefined,
            hours: (a.approvedMinutes || 0) / 60,
            approvedMinutes: a.approvedMinutes,
            status: a.status as any,
          }),
        )
      } catch {
        return []
      }
    },
  })
}

// Fallback mutations cho các thao tác correction nếu được kích hoạt
type TimesheetPatch = Partial<Omit<Timesheet, 'correctionRequest'>> & {
  correctionRequest?: string | null
}

function useTimesheetMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timesheetKeys.all })
      qc.invalidateQueries({ queryKey: ['working-hours'] })
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useCreateTimesheet() {
  return useTimesheetMutation((data: Omit<Timesheet, 'id'>) =>
    api<Timesheet>('/api/v1/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateTimesheet() {
  return useTimesheetMutation(({ id, ...data }: TimesheetPatch & { id: string }) =>
    api<Timesheet>(`/api/v1/timesheets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

export function useApproveCorrection() {
  return useTimesheetMutation(({ id, correctedHours }: { id: string; correctedHours: number }) =>
    api<Timesheet>(`/api/v1/timesheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ hours: correctedHours, status: 'CLOSED', correctionRequest: null }),
    }),
  )
}

export function useRejectCorrection() {
  return useTimesheetMutation((id: string) =>
    api<Timesheet>(`/api/v1/timesheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ correctionRequest: null, status: 'CLOSED' }),
    }),
  )
}
