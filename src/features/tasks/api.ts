// Tasks API hooks — Group G: TaskExecution backend integration
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api, apiPaged } from '@/lib/api'
import type { Task } from '@/types'

export type TaskBackendStatus =
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
  // BE chỉ có 1 bước chuyển trạng thái thật (POST /tasks/{id}/ready:
  // OPEN → NOT_STARTED). OPEN = việc vừa tạo trong mùa PLANNING → vẫn là TODO.
  let uiStatus: Task['status'] = 'TODO'
  const st = String(dto.status).toUpperCase()
  if (st === 'IN_PROGRESS') {
    uiStatus = 'DOING'
  } else if (st === 'SUBMITTED') {
    uiStatus = 'REVIEW'
  } else if (st === 'REVISION_REQUIRED') {
    uiStatus = 'REVISE'
  } else if (st === 'COMPLETED') {
    uiStatus = 'DONE'
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
    backendStatus: (st as TaskBackendStatus) ?? undefined,
    dueDate: dto.deadline ? dto.deadline.split('T')[0] : '',
    priority: dto.priority,
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

function useTaskMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  })
}

export function useCreateTask() {
  return useTaskMutation(async (data: Omit<Task, 'id'>) => {
    // BE bắt buộc `deadline` (CreateTaskRequest) và domain chặn
    // deadline <= startAt → không gửi null, mặc định cuối ngày của dueDate
    // hoặc +7 ngày nếu người dùng để trống.
    const start = new Date()
    const deadline = endOfDay(data.dueDate) ?? new Date(start.getTime() + 7 * 86_400_000)
    const payload = {
      name: data.title,
      description: data.description || null,
      completionCriteria: data.submittedNotes || null,
      priority: 'MEDIUM',
      estimatedMinutes: data.estimateHours ? Math.round(data.estimateHours * 60) : 120,
      requiredVolunteers: data.volunteersNeeded || 1,
      startAt: start.toISOString(),
      deadline: deadline.toISOString(),
    }
    return api<TaskDto>(`/api/v1/work-areas/${data.areaId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
}

/** `<input type="date">` → 23:59 giờ địa phương của đúng ngày đó. */
function endOfDay(dateOnly?: string): Date | undefined {
  if (!dateOnly) return undefined
  const parsed = new Date(`${dateOnly.slice(0, 10)}T23:59:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function useUpdateTask() {
  return useTaskMutation(
    async ({ id, ...data }: Partial<Omit<Task, 'id'>> & { id: string; version?: number }) => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.name = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.estimateHours !== undefined)
        payload.estimatedMinutes = Math.round(data.estimateHours * 60)
      if (data.volunteersNeeded !== undefined)
        payload.requiredVolunteers = data.volunteersNeeded
      if (data.dueDate !== undefined)
        payload.deadline = endOfDay(data.dueDate)?.toISOString() ?? null

      // PATCH /api/v1/tasks/{id} chỉ nhận field planning — KHÔNG có `status`,
      // `skills`, `assignees` hay `materialIds`. Gửi body rỗng thì BE trả 400
      // VALIDATION_FAILED nên chặn ngay ở client với mã lỗi rõ ràng.
      if (Object.keys(payload).length === 0) {
        throw new ApiError(
          409,
          'BE chưa có API đổi trạng thái việc (chỉ có POST /tasks/{id}/ready).',
          'TASK_STATUS_UNSUPPORTED',
        )
      }

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
 * POST /api/v1/tasks/{taskId}/ready — bước chuyển trạng thái DUY NHẤT BE hỗ trợ
 * (OPEN → NOT_STARTED, tức "phát hành việc" cho khu vực).
 */
export function useReadyTask() {
  return useTaskMutation(async ({ taskId, version }: { taskId: string; version?: number }) => {
    const headers: Record<string, string> = {}
    if (version !== undefined && version !== null) headers['If-Match'] = `"${version}"`
    return api<TaskDto>(`/api/v1/tasks/${taskId}/ready`, { method: 'POST', headers })
  })
}

// BE CHƯA có `DELETE /api/v1/tasks/{id}` → không cung cấp hook xoá việc.

/**
 * G5: PUT /api/v1/tasks/{taskId}/completion-criteria
 * `version` lấy từ TaskDto hiện tại (BE trả 412 nếu lệch) — trước đây FE gửi
 * cứng 1 nên lần lưu thứ 2 luôn fail.
 */
export function useReplaceCompletionCriteria() {
  return useTaskMutation(
    async ({
      taskId,
      completionCriteria,
      version,
    }: {
      taskId: string
      completionCriteria: string | null
      version: number
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
      version,
    }: {
      taskId: string
      skills: Array<{
        skillId: string
        requiredSkillLevel?: string | null
        requiredVolunteerCount?: number | null
      }>
      version: number
    }) => {
      return api<TaskDto>(`/api/v1/tasks/${taskId}/skills`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(skills),
      })
    },
  )
}

// ---------------------------------------------------------------------------
// Tiến độ & nghiệm thu (TaskExecution)
//   GET  /api/v1/tasks/{taskId}/progress                  (paged tiến độ)
//   GET  /api/v1/tasks/{taskId}/review-package            (LEADER)
//   POST /api/v1/tasks/{taskId}/approve                   (LEADER)
//   POST /api/v1/tasks/{taskId}/request-revision          (LEADER)
// Tình nguyện viên nộp tiến độ bằng app mobile (BE yêu cầu role VOLUNTEER).
// ---------------------------------------------------------------------------

export interface ProgressEvidenceDto {
  id?: string
  progressId?: string
  fileId: string
  caption?: string | null
  uploadedAt?: string | null
}

export interface TaskProgressDto {
  id: string
  taskId: string
  submittedByUserId: string
  percentComplete: number
  note?: string | null
  submittedAt: string
  isSubmission: boolean
  approvedByUserId?: string | null
  approvedAt?: string | null
  evidence: ProgressEvidenceDto[]
}

export interface TaskReviewPackageDto {
  task: TaskDto
  completionCriteria?: string | null
  progress: TaskProgressDto[]
  reviews: unknown[]
  approvedHours: number
  materialSummary: unknown
}

export const progressKeys = {
  list: (taskId: string) => ['tasks', 'progress', taskId] as const,
  review: (taskId: string) => ['tasks', 'review-package', taskId] as const,
}

export function useTaskProgress(taskId?: string) {
  return useQuery({
    queryKey: progressKeys.list(taskId ?? ''),
    queryFn: async () => {
      const res = await apiPaged<TaskProgressDto>(`/api/v1/tasks/${taskId}/progress?size=100`)
      return res.data
    },
    enabled: Boolean(taskId),
  })
}

export function useTaskReviewPackage(taskId?: string, enabled = true) {
  return useQuery({
    queryKey: progressKeys.review(taskId ?? ''),
    queryFn: () => api<TaskReviewPackageDto>(`/api/v1/tasks/${taskId}/review-package`),
    enabled: Boolean(taskId) && enabled,
    // 503 = read-model `task_projection` chưa nhận event → không thử lại liên tục.
    retry: false,
  })
}

function useTaskReviewAction(path: 'approve' | 'request-revision') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, version, reason }: { taskId: string; version?: number; reason?: string }) => {
      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) headers['If-Match'] = `"${version}"`
      return api<TaskDto>(`/api/v1/tasks/${taskId}/${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: reason ?? null, version: version ?? null }),
      })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: progressKeys.review(vars.taskId) })
      qc.invalidateQueries({ queryKey: progressKeys.list(vars.taskId) })
    },
  })
}

/** POST /api/v1/tasks/{taskId}/approve — chốt hoàn thành (LEADER). */
export function useApproveTask() {
  return useTaskReviewAction('approve')
}

/** POST /api/v1/tasks/{taskId}/request-revision — trả việc về cho TNV sửa (LEADER). */
export function useRequestTaskRevision() {
  return useTaskReviewAction('request-revision')
}

// ---------------------------------------------------------------------------
// Phân công & đăng ký tình nguyện (TaskExecution)
//   GET/POST /api/v1/tasks/{taskId}/assignments      (LEADER)
//   POST     /api/v1/task-assignments/{id}/accept|decline (VOLUNTEER — app mobile)
//   GET      /api/v1/tasks/{taskId}/applications     (LEADER)
//   POST     /api/v1/task-applications/{id}/approve|reject (LEADER)
// ---------------------------------------------------------------------------

export type AssignmentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED'

export interface AssignmentDto {
  id: string
  taskId: string
  volunteerId: string
  assignmentType: string
  status: AssignmentStatus
  note?: string | null
  version: number
  requestedAt?: string | null
  assignedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  warnings: string[]
  responseReason?: string | null
}

export interface TaskApplicationDto {
  id: string
  taskId: string
  volunteerId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  note?: string | null
  version: number
  requestedAt?: string | null
  reviewedAt?: string | null
  reason?: string | null
}

export const assignmentKeys = {
  list: (taskId: string) => ['tasks', 'assignments', taskId] as const,
  applications: (taskId: string) => ['tasks', 'applications', taskId] as const,
}

export function useTaskAssignments(taskId?: string) {
  return useQuery({
    queryKey: assignmentKeys.list(taskId ?? ''),
    queryFn: async () => {
      const res = await api<AssignmentDto[] | { data?: AssignmentDto[] }>(
        `/api/v1/tasks/${taskId}/assignments`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(taskId),
  })
}

export function useAssignVolunteer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      taskId: string
      volunteerId: string
      note?: string | null
      overrideCapacity?: boolean
      overrideSkillMismatch?: boolean
      overrideReason?: string | null
    }) =>
      api<AssignmentDto>(`/api/v1/tasks/${input.taskId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          volunteerId: input.volunteerId,
          note: input.note ?? null,
          overrideCapacity: input.overrideCapacity ?? false,
          overrideSkillMismatch: input.overrideSkillMismatch ?? false,
          overrideReason: input.overrideReason ?? null,
        }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: assignmentKeys.list(vars.taskId) })
      qc.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
    },
  })
}

export function useTaskApplications(taskId?: string) {
  return useQuery({
    queryKey: assignmentKeys.applications(taskId ?? ''),
    queryFn: async () => {
      const res = await apiPaged<TaskApplicationDto>(
        `/api/v1/tasks/${taskId}/applications?size=100`,
      )
      return res.data
    },
    enabled: Boolean(taskId),
  })
}

function useApplicationReview(action: 'approve' | 'reject') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: {
      applicationId: string
      taskId: string
      version: number
      reason?: string
    }) =>
      api<TaskApplicationDto | AssignmentDto>(`/api/v1/task-applications/${vars.applicationId}/${action}`, {
        method: 'POST',
        headers: { 'If-Match': `"${vars.version}"` },
        body: JSON.stringify({ version: vars.version, reason: vars.reason ?? null }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: assignmentKeys.applications(vars.taskId) })
      qc.invalidateQueries({ queryKey: assignmentKeys.list(vars.taskId) })
      qc.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

/** POST /api/v1/task-applications/{id}/approve — duyệt đăng ký của TNV (LEADER). */
export function useApproveApplication() {
  return useApplicationReview('approve')
}

/** POST /api/v1/task-applications/{id}/reject — từ chối đăng ký (LEADER). */
export function useRejectApplication() {
  return useApplicationReview('reject')
}

// ---------------------------------------------------------------------------
// Vòng đời & vật tư của việc (TaskExecution)
//   POST /api/v1/tasks/{taskId}/cancel                 (LEADER)
//   PUT  /api/v1/tasks/{taskId}/materials              (LEADER)
//   GET  /api/v1/tasks/{taskId}/volunteer-matches      (LEADER)
//   GET  /api/v1/tasks/{id}/progress/{p}/evidence/{f}/download-url
// ---------------------------------------------------------------------------

/** POST /tasks/{taskId}/cancel — huỷ việc kèm lý do (LEADER). */
export function useCancelTask() {
  return useTaskMutation(
    ({ taskId, version, reason }: { taskId: string; version?: number; reason: string }) =>
      api<TaskDto>(`/api/v1/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: version !== undefined ? { 'If-Match': `"${version}"` } : {},
        body: JSON.stringify({ version: version ?? null, reason }),
      }),
  )
}

/** PUT /tasks/{taskId}/materials — thay toàn bộ vật tư yêu cầu của việc. */
export function useReplaceTaskMaterials() {
  return useTaskMutation(
    ({
      taskId,
      version,
      materials,
    }: {
      taskId: string
      version: number
      materials: Array<{ materialId: string; requiredQuantity: number; note?: string | null }>
    }) =>
      api<TaskDto>(`/api/v1/tasks/${taskId}/materials`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(
          materials.map((row) => ({
            materialId: row.materialId,
            requiredQuantity: row.requiredQuantity,
            note: row.note ?? null,
          })),
        ),
      }),
  )
}

export interface VolunteerMatchDto {
  volunteerId: string
  displayName: string
  communityId?: string | null
  sameCommunity: boolean
  availabilityMatched?: boolean | null
  hasScheduleConflict: boolean
  warnings: string[]
}

/** GET /tasks/{taskId}/volunteer-matches — gợi ý TNV phù hợp (LEADER). */
export function useVolunteerMatches(taskId?: string, enabled = true) {
  return useQuery({
    queryKey: ['tasks', 'volunteer-matches', taskId ?? ''] as const,
    queryFn: async () => {
      const res = await api<VolunteerMatchDto[] | { data?: VolunteerMatchDto[] }>(
        `/api/v1/tasks/${taskId}/volunteer-matches`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(taskId) && enabled,
    retry: false,
  })
}

/** GET .../progress/{progressId}/evidence/{fileId}/download-url */
export async function getTaskEvidenceUrl(
  taskId: string,
  progressId: string,
  fileId: string,
): Promise<string> {
  const res = await api<{ downloadUrl: string }>(
    `/api/v1/tasks/${taskId}/progress/${progressId}/evidence/${fileId}/download-url`,
  )
  return res.downloadUrl
}
