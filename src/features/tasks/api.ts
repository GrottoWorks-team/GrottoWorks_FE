// Tasks API hooks — pattern season/areas: query key 'tasks', invalidate sau
// mutation. Mọi hook phân công/chuyển trạng thái đều PATCH /tasks/:id (mock
// shallow-merge); assign/unassign GET task trước để tính mảng assignees mới.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task } from '@/types'

export const taskKeys = {
  all: ['tasks'] as const,
}

// Danh mục kỹ năng (GET-only /api/skills) — checkbox group TaskFormDialog.
export function useSkills() {
  return useQuery({ queryKey: ['skills'], queryFn: () => api<string[]>('/skills') })
}

export function useTasks(areaId?: string) {
  return useQuery({
    queryKey: taskKeys.all,
    queryFn: () => api<Task[]>('/tasks'),
    select: areaId ? (ts) => ts.filter((t) => t.areaId === areaId) : undefined,
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api<Task>(`/tasks/${id}`),
    enabled: Boolean(id),
  })
}

function useTaskMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  })
}

const patchTask = (id: string, patch: Partial<Task>) =>
  api<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

export function useCreateTask() {
  return useTaskMutation((data: Omit<Task, 'id'>) =>
    api<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateTask() {
  return useTaskMutation(({ id, ...data }: Partial<Omit<Task, 'id'>> & { id: string }) =>
    patchTask(id, data),
  )
}

export function useDeleteTask() {
  return useTaskMutation((id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }))
}

// Thêm/xoá 1 volunteer khỏi assignees: GET task hiện tại rồi PATCH mảng mới
// (mock PATCH là shallow-merge, không tự merge phần tử mảng).
export function useAssignVolunteer(taskId: string, volunteerId: string) {
  return useTaskMutation(async () => {
    const task = await api<Task>(`/tasks/${taskId}`)
    if (task.assignees.includes(volunteerId)) return task
    return patchTask(taskId, { assignees: [...task.assignees, volunteerId] })
  })
}

export function useUnassign(taskId: string, volunteerId: string) {
  return useTaskMutation(async () => {
    const task = await api<Task>(`/tasks/${taskId}`)
    return patchTask(taskId, { assignees: task.assignees.filter((v) => v !== volunteerId) })
  })
}

// Chuyển trạng thái: submit review (→REVIEW + submittedNotes), approve (→DONE),
// request revision (→REVISE, submittedNotes = lý do). Note truyền vào lúc
// mutate (mutateAsync(note)) — giữ note trong state của cha rồi truyền vào
// hook sẽ bị stale closure (PATCH lần đầu gửi note rỗng).
export function useSubmitReview(taskId: string) {
  return useTaskMutation((note: string) =>
    patchTask(taskId, { status: 'REVIEW', submittedNotes: note }),
  )
}

export function useApproveCompletion(taskId: string) {
  return useTaskMutation(() => patchTask(taskId, { status: 'DONE' }))
}

export function useRequestRevision(taskId: string) {
  return useTaskMutation((note: string) =>
    patchTask(taskId, { status: 'REVISE', submittedNotes: note }),
  )
}
