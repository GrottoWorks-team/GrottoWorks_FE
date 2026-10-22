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

// ── API THẬT của TaskExecution (dùng cho 3D Builder giai đoạn A) ────────────
//
// Các hook phía trên vẫn gọi đường dẫn mock `/tasks` (chưa rewire vì nhiều màn
// hình đang phụ thuộc shape `Task` rộng hơn DTO thật). Hook dưới đây gọi đúng
// contract BE đã có:
//   GET /api/v1/work-areas/{workAreaId}/tasks   → { data: TaskDto[], page, meta }
//   GET /api/v1/tasks/{taskId}                  → { data: TaskDto, meta }
// Enum (status/priority) serialize SNAKE_CASE_UPPER ở TaskExecution.
// DTO KHÔNG có assignee/progress/nghiệm thu (xem BE-gap-requests §2.1–2.2).

/** TaskDto thô từ TaskExecution — chỉ khai báo trường thực sự dùng. */
export interface AreaTaskDto {
  id: string
  workAreaId: string
  name: string
  description?: string | null
  completionCriteria?: string | null
  taskType?: string
  priority?: string
  estimatedMinutes?: number | null
  requiredVolunteers?: number
  startAt?: string | null
  deadline?: string | null
  status?: string
  version?: number
}

/** Dạng đã chuẩn hoá cho UI builder. */
export interface AreaTask {
  id: string
  name: string
  description?: string
  /** Giá trị enum thô (SNAKE_CASE_UPPER) — dùng trực tiếp cho StatusTag. */
  status: string
  priority: string
  deadline?: string
  requiredVolunteers: number
  estimatedMinutes?: number
}

export function toAreaTask(dto: AreaTaskDto): AreaTask {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? undefined,
    status: dto.status ?? 'DRAFT',
    priority: dto.priority ?? 'MEDIUM',
    deadline: dto.deadline ?? undefined,
    requiredVolunteers: dto.requiredVolunteers ?? 0,
    estimatedMinutes: dto.estimatedMinutes ?? undefined,
  }
}

export function useAreaTasks(workAreaId?: string) {
  return useQuery({
    queryKey: ['areaTasks', workAreaId ?? ''],
    queryFn: async () => {
      const list = await api<AreaTaskDto[]>(
        `/api/v1/work-areas/${workAreaId}/tasks?size=100`,
      )
      return (list ?? []).map(toAreaTask)
    },
    enabled: Boolean(workAreaId),
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
