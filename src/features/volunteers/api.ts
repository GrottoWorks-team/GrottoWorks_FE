// Đăng ký tình nguyện: useVolunteerRegs + duyệt/từ chối qua PATCH
// /volunteerRegs/:id. Duyệt phải đồng thời thêm volunteerId vào
// task.assignees — mock PATCH là shallow-merge nên phải GET task rồi PATCH
// cả mảng mới (pattern useAssignVolunteer, 2 bước trong mutationFn).
// Lệch chữ ký brief có chủ đích: reg truyền vào lúc mutateAsync(reg) (payload
// lúc gọi — DataTable render cột không gọi được hook theo row; giữ reg trong
// state của cha sẽ stale closure như note Task 5).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task, VolunteerReg } from '@/types'

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

// Duyệt: PATCH reg APPROVED rồi thêm volunteerId vào assignees (idempotent).
export function useApproveReg() {
  return useRegMutation(async (reg) => {
    const approved = await patchReg(reg.id, { status: 'APPROVED' })
    const task = await api<Task>(`/tasks/${reg.taskId}`)
    if (!task.assignees.includes(reg.volunteerId)) {
      await api<Task>(`/tasks/${reg.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignees: [...task.assignees, reg.volunteerId] }),
      })
    }
    return approved
  })
}

// Từ chối: chỉ đổi status, không đụng assignees.
export function useRejectReg() {
  return useRegMutation((reg) => patchReg(reg.id, { status: 'REJECTED' }))
}
