// Đăng ký tình nguyện: useVolunteerRegs + duyệt/từ chối qua PATCH
// /volunteerRegs/:id (BE CHƯA có — xem BE-gap-requests-activity-flows.md).
// Trước đây duyệt còn PATCH thêm `assignees` sang /api/v1/tasks/{id}, nhưng
// `TaskDto` của TaskExecution không có field đó và `task.assignees` là
// `undefined` → TypeError. Đã bỏ để lỗi nổi lên đúng chỗ (chưa có API).
// Lệch chữ ký brief có chủ đích: reg truyền vào lúc mutateAsync(reg) (payload
// lúc gọi — DataTable render cột không gọi được hook theo row; giữ reg trong
// state của cha sẽ stale closure như note Task 5).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { VolunteerReg } from '@/types'

export const volunteerRegKeys = { all: ['volunteerRegs'] as const }

export function useVolunteerRegs() {
  return useQuery({
    queryKey: volunteerRegKeys.all,
    queryFn: () => api<VolunteerReg[]>('/volunteerRegs'),
  })
}

// Duyệt đổi cả assignees của task → invalidate 2 key (tasks prefix phủ
// luôn ['tasks', id] của TaskDetailPage).
function useRegMutation(fn: (reg: VolunteerReg) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: volunteerRegKeys.all })
      void qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

const patchReg = (id: string, patch: Partial<VolunteerReg>) =>
  api<VolunteerReg>(`/volunteerRegs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

// Duyệt: chỉ đổi trạng thái đăng ký. Việc thêm TNV vào task phải chờ BE có
// endpoint TaskAssignment (hiện `TaskDto` không có `assignees`).
export function useApproveReg() {
  return useRegMutation((reg) => patchReg(reg.id, { status: 'APPROVED' }))
}

// Từ chối: chỉ đổi status, không đụng assignees.
export function useRejectReg() {
  return useRegMutation((reg) => patchReg(reg.id, { status: 'REJECTED' }))
}
