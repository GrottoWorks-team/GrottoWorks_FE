// Tasks API hooks — Group G: TaskExecution backend integration
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Task } from '@/types'

export type TaskBackendStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'REVISION_REQUIRED'
  | 'COMPLETED'
  | 'CANCELLED'

export type TaskBackendPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type TaskBackendType = 'WORK' | 'PURCHASE' | 'CORRECTIVE'

export interface TaskDto {
  id: string
  workAreaId: string
  name: string
  description?: string | null
  completionCriteria?: string | null
  taskType: TaskBackendType
  purchaseRequestId?: string | null
  priority: TaskBackendPriority
  estimatedMinutes?: number | null
  requiredVolunteers: number
  startAt?: string | null
  deadline?: string | null
  status: TaskBackendStatus
  version: number
  createdAt: string
  updatedAt?: string | null
}

export interface TaskSkillDto {
  skillId: string
  requiredSkillLevel?: string | null
  requiredVolunteerCount?: number | null
}

export interface SkillItemDto {
  id: string
  code: string
  name: string
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
}

/** Map TaskDto của Backend TaskExecution sang giao diện Task tương thích của FE */
export function mapTaskDtoToTask(dto: TaskDto): Task {
  let uiStatus: Task['status'] = 'TODO'
  const st = String(dto.status).toUpperCase()
  if (st === 'OPEN') {
    uiStatus = 'TODO' // chưa ai nhận
  } else if (st === 'NOT_STARTED') {
    uiStatus = 'READY' // đã chốt tuyển, chờ bắt đầu
  } else if (st === 'IN_PROGRESS') {
    uiStatus = 'DOING'
  } else if (st === 'SUBMITTED') {
    uiStatus = 'REVIEW'
  } else if (st === 'REVISION_REQUIRED') {
    uiStatus = 'REVISE'
  } else if (st === 'COMPLETED') {
    uiStatus = 'DONE'
  } else {
    uiStatus = 'TODO'
  }

  return {
    id: dto.id,
    areaId: dto.workAreaId,
    title: dto.name,
    description: dto.description || '',
    skills: [],
    estimateHours: dto.estimatedMinutes ? Number((dto.estimatedMinutes / 60).toFixed(1)) : 0,
    volunteersNeeded: dto.requiredVolunteers || 1,
    assignees: [],
    materialIds: [],
    status: uiStatus,
    dueDate: dto.deadline ? dto.deadline.split('T')[0] : '',
    priority: dto.priority,
    startAt: dto.startAt ?? undefined,
    submittedPhotos: 0,
    submittedNotes: dto.completionCriteria || undefined,
    version: dto.version,
  }
}

export const taskKeys = {
  all: ['tasks'] as const,
  byArea: (workAreaId: string) => ['tasks', 'area', workAreaId] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
}

/**
 * GET /api/v1/skills — Danh mục kỹ năng dùng chung từ API chuẩn
 */
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      try {
        const res = await api<{ data?: SkillItemDto[] } | SkillItemDto[]>('/api/v1/skills')
        const items = Array.isArray(res) ? res : (res.data ?? [])
        return items.map((s) => s.name)
      } catch {
        return ['Điện', 'Mộc', 'Hàn', 'Trang trí', 'Vận chuyển', 'Logistics', 'Sơn']
      }
    },
  })
}

/**
 * Danh sách kỹ năng đầy đủ DTO (id, code, name) cho G6 multi-select
 */
export function useSkillsCatalog() {
  return useQuery({
    queryKey: ['skills', 'catalog'],
    queryFn: async () => {
      try {
        const res = await api<{ data?: SkillItemDto[] } | SkillItemDto[]>('/api/v1/skills')
        return Array.isArray(res) ? res : (res.data ?? [])
      } catch {
        return []
      }
    },
  })
}

/**
 * G1: GET /api/v1/work-areas/{workAreaId}/tasks
 */
export function useTasks(areaId?: string) {
  return useQuery({
    queryKey: areaId ? taskKeys.byArea(areaId) : taskKeys.all,
    queryFn: async () => {
      if (!areaId) return []
      const res = await api<{ data?: TaskDto[]; items?: TaskDto[] } | TaskDto[]>(
        `/api/v1/work-areas/${areaId}/tasks?size=100`,
      )
      const list: TaskDto[] = Array.isArray(res)
        ? res
        : (res.data ?? res.items ?? [])
      return list.map(mapTaskDtoToTask)
    },
    enabled: Boolean(areaId),
  })
}

/**
 * G2: GET /api/v1/tasks/{taskId}
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const res = await api<{ data?: TaskDto } | TaskDto>(`/api/v1/tasks/${id}`)
      const dto = 'data' in res && res.data ? res.data : (res as TaskDto)
      return mapTaskDtoToTask(dto)
    },
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

export function useCreateTask() {
  return useTaskMutation(async (data: Omit<Task, 'id'>) => {
    const payload = {
      name: data.title,
      description: data.description || null,
      completionCriteria: data.submittedNotes || null,
      priority: data.priority ?? 'MEDIUM',
      estimatedMinutes: Math.round(data.estimateHours * 60),
      requiredVolunteers: data.volunteersNeeded,
      startAt: data.startAt ? new Date(data.startAt).toISOString() : null,
      deadline: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    }
    return api<TaskDto>(`/api/v1/work-areas/${data.areaId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
}

export function useUpdateTask() {
  return useTaskMutation(
    async ({ id, ...data }: Partial<Omit<Task, 'id'>> & { id: string; version?: number }) => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.name = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.priority !== undefined) payload.priority = data.priority
      if (data.estimateHours !== undefined)
        payload.estimatedMinutes = Math.round(data.estimateHours * 60)
      if (data.volunteersNeeded !== undefined)
        payload.requiredVolunteers = data.volunteersNeeded
      if (data.startAt !== undefined)
        payload.startAt = data.startAt ? new Date(data.startAt).toISOString() : null
      if (data.dueDate !== undefined)
        payload.deadline = data.dueDate ? new Date(data.dueDate).toISOString() : null

      const headers: Record<string, string> = {}
      if (data.version !== undefined && data.version !== null) {
        headers['If-Match'] = `"${data.version}"`
      }

      return api<TaskDto>(`/api/v1/tasks/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
    },
  )
}

/**
 * G5: PUT /api/v1/tasks/{taskId}/completion-criteria
 */
export function useReplaceCompletionCriteria() {
  return useTaskMutation(
    async ({
      taskId,
      completionCriteria,
      version = 1,
    }: {
      taskId: string
      completionCriteria: string | null
      version?: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/completion-criteria`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ completionCriteria }),
      })
    },
  )
}

/**
 * G6: PUT /api/v1/tasks/{taskId}/skills
 */
export function useReplaceTaskSkills() {
  return useTaskMutation(
    async ({
      taskId,
      skills,
      version = 1,
    }: {
      taskId: string
      skills: Array<{
        skillId: string
        requiredSkillLevel?: string | null
        requiredVolunteerCount?: number | null
      }>
      version?: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/skills`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(skills),
      })
    },
  )
}

export function useAssignVolunteer(taskId: string, volunteerId: string) {
  return useTaskMutation(async () => {
    // Client-side mock fallback cho tới khi BE hỗ trợ assignment
    return { taskId, volunteerId }
  })
}

export function useUnassign(taskId: string, volunteerId: string) {
  return useTaskMutation(async () => {
    return { taskId, volunteerId }
  })
}

export function useSubmitReview(taskId: string) {
  return useTaskMutation(async (note: string) => {
    return { taskId, note }
  })
}

export function useApproveCompletion(taskId: string) {
  return useTaskMutation(async () => {
    return { taskId }
  })
}

export function useRequestRevision(taskId: string) {
  return useTaskMutation(async (note: string) => {
    return { taskId, note }
  })
}
