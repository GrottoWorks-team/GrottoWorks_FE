// Tasks API hooks — Group G: TaskExecution backend integration & Đợt A full endpoints
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AssignmentDto,
  FileDownload,
  Task,
  TaskApplicationDto,
  TaskMaterialReportDto,
  TaskReviewPackage,
  VolunteerMatchDto,
} from '@/types'

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
  teamLeaderAssignmentId?: string | null
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
    teamLeaderAssignmentId: dto.teamLeaderAssignmentId ?? null,
  }
}

export const taskKeys = {
  all: ['tasks'] as const,
  byArea: (workAreaId: string) => ['tasks', 'area', workAreaId] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  applications: (taskId: string) => ['tasks', 'applications', taskId] as const,
  assignments: (taskId: string) => ['tasks', 'assignments', taskId] as const,
  materialReports: (taskId: string) => ['tasks', 'material-reports', taskId] as const,
  reviewPackage: (taskId: string) => ['tasks', 'review-package', taskId] as const,
  volunteerMatches: (taskId: string, communityId?: string, limit?: number) =>
    ['tasks', 'volunteer-matches', taskId, communityId ?? '', limit ?? 20] as const,
  evidenceDownload: (taskId: string, progressId: string, fileId: string) =>
    ['tasks', 'evidence-download', taskId, progressId, fileId] as const,
}

/**
 * GET /api/v1/skills — Danh mục kỹ năng dùng chung từ API chuẩn
 */
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api<{ data?: SkillItemDto[] } | SkillItemDto[]>('/api/v1/skills')
      const items = Array.isArray(res) ? res : (res.data ?? [])
      return items.map((s) => s.name)
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
      const res = await api<{ data?: SkillItemDto[] } | SkillItemDto[]>('/api/v1/skills')
      return Array.isArray(res) ? res : (res.data ?? [])
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
 * POST /api/v1/tasks/{id}/ready — Leader chốt tuyển, BE chuyển OPEN -> NOT_STARTED.
 * BE bắt buộc If-Match (thiếu → 400 INVALID_IF_MATCH, lệch version → 412).
 */
export function useMarkTaskReady() {
  return useTaskMutation(async ({ id, version }: { id: string; version?: number }) => {
    const headers: Record<string, string> = {}
    if (version !== undefined && version !== null) {
      headers['If-Match'] = `"${version}"`
    }
    return api<TaskDto>(`/api/v1/tasks/${id}/ready`, { method: 'POST', headers })
  })
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

// ══════════════════════════════════════════════════════════════════════════════
// Đợt A: Nhiệm vụ — Duyệt ứng viên, phân công, nghiệm thu & vật tư
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/tasks/{taskId}/applications — Danh sách đơn xin tham gia nhiệm vụ (Leader)
 */
export function useTaskApplications(taskId?: string) {
  return useQuery({
    queryKey: taskId ? taskKeys.applications(taskId) : ['tasks', 'applications'],
    queryFn: async () => {
      if (!taskId) return []
      const res = await api<{ items?: TaskApplicationDto[]; data?: TaskApplicationDto[] } | TaskApplicationDto[]>(
        `/api/v1/tasks/${taskId}/applications?size=100`,
      )
      if (Array.isArray(res)) return res
      return res?.items ?? res?.data ?? []
    },
    enabled: Boolean(taskId),
  })
}

/**
 * POST /api/v1/task-applications/{applicationId}/approve — Leader duyệt đơn ứng tuyển
 */
export function useApproveTaskApplication() {
  return useTaskMutation(
    async ({ applicationId, version }: { applicationId: string; version?: number }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }
      return api<AssignmentDto>(`/api/v1/task-applications/${applicationId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ version }),
      })
    },
  )
}

/**
 * POST /api/v1/task-applications/{applicationId}/reject — Leader từ chối đơn ứng tuyển
 */
export function useRejectTaskApplication() {
  return useTaskMutation(
    async ({
      applicationId,
      reason,
      version,
    }: {
      applicationId: string
      reason: string
      version?: number
    }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }
      return api<TaskApplicationDto>(`/api/v1/task-applications/${applicationId}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, version }),
      })
    },
  )
}

/**
 * GET /api/v1/tasks/{taskId}/assignments — Danh sách phân công nhiệm vụ (Leader)
 */
export function useTaskAssignments(taskId?: string) {
  return useQuery({
    queryKey: taskId ? taskKeys.assignments(taskId) : ['tasks', 'assignments'],
    queryFn: async () => {
      if (!taskId) return []
      const res = await api<{ items?: AssignmentDto[]; data?: AssignmentDto[] } | AssignmentDto[]>(
        `/api/v1/tasks/${taskId}/assignments`,
      )
      if (Array.isArray(res)) return res
      return res?.items ?? res?.data ?? []
    },
    enabled: Boolean(taskId),
  })
}

/**
 * POST /api/v1/tasks/{taskId}/assignments — Phân công TNV trực tiếp (Leader)
 */
export function useAssignVolunteerDirect() {
  return useTaskMutation(
    async ({
      taskId,
      volunteerId,
      note,
      overrideCapacity,
      overrideSkillMismatch,
      overrideReason,
    }: {
      taskId: string
      volunteerId: string
      note?: string | null
      overrideCapacity?: boolean
      overrideSkillMismatch?: boolean
      overrideReason?: string | null
    }) => {
      return api<AssignmentDto>(`/api/v1/tasks/${taskId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          volunteerId,
          note: note ?? null,
          overrideCapacity: Boolean(overrideCapacity),
          overrideSkillMismatch: Boolean(overrideSkillMismatch),
          overrideReason: overrideReason ?? null,
        }),
      })
    },
  )
}

/**
 * Compatibility wrapper cho component cũ
 */
export function useAssignVolunteer(taskId: string, volunteerId: string) {
  return useTaskMutation(async (note?: string) => {
    return api<AssignmentDto>(`/api/v1/tasks/${taskId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({
        volunteerId,
        note: note ?? null,
      }),
    })
  })
}

export function useUnassign(taskId: string, volunteerId: string) {
  return useTaskMutation(async () => {
    return { taskId, volunteerId }
  })
}

/**
 * POST /api/v1/tasks/{taskId}/cancel — Leader huỷ nhiệm vụ
 */
export function useCancelTask() {
  return useTaskMutation(
    async ({
      taskId,
      reason,
      version,
    }: {
      taskId: string
      reason: string
      version?: number
    }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }
      return api<TaskDto>(`/api/v1/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, version }),
      })
    },
  )
}

/**
 * GET /api/v1/tasks/{taskId}/material-reports — Báo cáo vật tư theo nhiệm vụ (Leader, MO)
 */
export function useTaskMaterialReports(taskId?: string) {
  return useQuery({
    queryKey: taskId ? taskKeys.materialReports(taskId) : ['tasks', 'material-reports'],
    queryFn: async () => {
      if (!taskId) return []
      const res = await api<{ items?: TaskMaterialReportDto[]; data?: TaskMaterialReportDto[] } | TaskMaterialReportDto[]>(
        `/api/v1/tasks/${taskId}/material-reports`,
      )
      if (Array.isArray(res)) return res
      return res?.items ?? res?.data ?? []
    },
    enabled: Boolean(taskId),
  })
}

/**
 * PUT /api/v1/tasks/{taskId}/materials — Cập nhật danh sách vật tư yêu cầu cho nhiệm vụ (Leader)
 */
export function useReplaceTaskMaterials() {
  return useTaskMutation(
    async ({
      taskId,
      materials,
      version = 1,
    }: {
      taskId: string
      materials: Array<{
        materialId: string
        requiredQuantity: number
        note?: string | null
      }>
      version?: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/materials`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(materials),
      })
    },
  )
}

/**
 * GET /api/v1/tasks/{taskId}/review-package — Gói nghiệm thu nhiệm vụ (Leader)
 */
export function useTaskReviewPackage(taskId?: string) {
  return useQuery({
    queryKey: taskId ? taskKeys.reviewPackage(taskId) : ['tasks', 'review-package'],
    queryFn: async () => {
      if (!taskId) return null
      return api<TaskReviewPackage>(`/api/v1/tasks/${taskId}/review-package`)
    },
    enabled: Boolean(taskId),
  })
}

/**
 * POST /api/v1/tasks/{taskId}/approve — Leader duyệt hoàn thành nhiệm vụ
 */
export function useApproveTaskCompletion() {
  return useTaskMutation(
    async ({
      taskId,
      reason,
      version,
    }: {
      taskId: string
      reason?: string | null
      version?: number
    }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }
      return api<TaskDto>(`/api/v1/tasks/${taskId}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: reason ?? null, version }),
      })
    },
  )
}

/**
 * POST /api/v1/tasks/{taskId}/request-revision — Leader yêu cầu sửa đổi/chỉnh sửa lại nhiệm vụ
 */
export function useRequestTaskRevision() {
  return useTaskMutation(
    async ({
      taskId,
      reason,
      version,
    }: {
      taskId: string
      reason: string
      version?: number
    }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }
      return api<TaskDto>(`/api/v1/tasks/${taskId}/request-revision`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason, version }),
      })
    },
  )
}

/**
 * PUT /api/v1/tasks/{taskId}/team-leader — Leader chỉ định trưởng nhóm cho nhiệm vụ
 */
export function useSetTaskTeamLeader() {
  return useTaskMutation(
    async ({
      taskId,
      teamLeaderAssignmentId,
      version,
    }: {
      taskId: string
      teamLeaderAssignmentId: string
      version: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/team-leader`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ teamLeaderAssignmentId }),
      })
    },
  )
}

/**
 * DELETE /api/v1/tasks/{taskId}/team-leader — Leader gỡ bỏ trưởng nhóm của nhiệm vụ
 */
export function useClearTaskTeamLeader() {
  return useTaskMutation(
    async ({
      taskId,
      version,
    }: {
      taskId: string
      version: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/team-leader`, {
        method: 'DELETE',
        headers: { 'If-Match': `"${version}"` },
      })
    },
  )
}

/**
 * GET /api/v1/tasks/{taskId}/volunteer-matches — Gợi ý ghép TNV phù hợp kỹ năng & lịch rảnh (Leader)
 */
export function useVolunteerMatches(taskId?: string, communityId?: string, limit: number = 20) {
  return useQuery({
    queryKey: taskId ? taskKeys.volunteerMatches(taskId, communityId, limit) : ['tasks', 'volunteer-matches'],
    queryFn: async () => {
      if (!taskId) return []
      const params = new URLSearchParams()
      if (communityId) params.set('communityId', communityId)
      params.set('limit', String(limit))
      const res = await api<{ items?: VolunteerMatchDto[]; data?: VolunteerMatchDto[] } | VolunteerMatchDto[]>(
        `/api/v1/tasks/${taskId}/volunteer-matches?${params.toString()}`,
      )
      if (Array.isArray(res)) return res
      return res?.items ?? res?.data ?? []
    },
    enabled: Boolean(taskId),
  })
}

/**
 * GET /api/v1/tasks/{taskId}/progress/{progressId}/evidence/{fileId}/download-url
 */
export function useTaskEvidenceDownloadUrl(taskId?: string, progressId?: string, fileId?: string) {
  return useQuery({
    queryKey: taskId && progressId && fileId ? taskKeys.evidenceDownload(taskId, progressId, fileId) : ['tasks', 'evidence-download'],
    queryFn: async () => {
      if (!taskId || !progressId || !fileId) return null
      return api<FileDownload>(`/api/v1/tasks/${taskId}/progress/${progressId}/evidence/${fileId}/download-url`)
    },
    enabled: Boolean(taskId && progressId && fileId),
  })
}
