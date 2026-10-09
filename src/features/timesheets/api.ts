// Timesheets domain — query key ['timesheets'] (= db key + URL path).
// Duyệt/từ chối chỉnh giờ: mock PATCH shallow-merge giữ key null
// (handlers.ts) nên gửi correctionRequest: null để xoá field.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Timesheet } from '@/types'

export const timesheetKeys = {
  all: ['timesheets'] as const,
}

export function useTimesheets(volunteerId?: string) {
  return useQuery({
    queryKey: timesheetKeys.all,
    queryFn: () => api<Timesheet[]>('/timesheets'),
    select: volunteerId ? (ts) => ts.filter((x) => x.volunteerId === volunteerId) : undefined,
  })
}

// correctionRequest: null = xoá field (mock PATCH shallow-merge giữ key null).
type TimesheetPatch = Partial<Omit<Timesheet, 'correctionRequest'>> & {
  correctionRequest?: string | null
}

function useTimesheetMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: timesheetKeys.all }),
  })
}

const patch = (id: string, body: TimesheetPatch) =>
  api<Timesheet>(`/timesheets/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export function useCreateTimesheet() {
  return useTimesheetMutation((data: Omit<Timesheet, 'id'>) =>
    api<Timesheet>('/timesheets', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateTimesheet() {
  return useTimesheetMutation(({ id, ...data }: TimesheetPatch & { id: string }) =>
    patch(id, data),
  )
}

// Duyệt yêu cầu chỉnh: ghi giờ mới + chốt CLOSED + xoá yêu cầu sửa.
export function useApproveCorrection() {
  return useTimesheetMutation(({ id, correctedHours }: { id: string; correctedHours: number }) =>
    patch(id, { hours: correctedHours, status: 'CLOSED', correctionRequest: null }),
  )
}

// Từ chối: xoá yêu cầu sửa và đóng ca luôn (không chỉnh giờ) → row khỏi
// PENDING_FIX, nút "Xử lý" tự ẩn.
export function useRejectCorrection() {
  return useTimesheetMutation((id: string) =>
    patch(id, { correctionRequest: null, status: 'CLOSED' }),
  )
}
