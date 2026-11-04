// Admin domain â€” quáº£n trá»‹ tÃ i khoáº£n + danh má»¥c + nháº­t kÃ½ há»‡ thá»‘ng.
// Query key tÃ¡ch domain: ['admin', <resource>]; khÃ´ng Ä‘á»¥ng key cá»§a feature khÃ¡c
// (useUsers/useCommunities giá»¯ nguyÃªn key ['users']/['communities'] gá»‘c â€”
// invalidate tá»« admin nháº¯m Ä‘Ãºng key Ä‘Ã³ Ä‘á»ƒ cache ngÆ°á»i khÃ¡c cÅ©ng má»›i).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { ActivityLog, Community, Role } from '@/types'
import type { AdminUserDto, CreateAdminUserRequest, RoleDto } from '@/types/identity'
import type {
  CommunityDto,
  CreateCommunityRequest,
  CreateParishRequest,
  CreateWorkAreaCategoryRequest,
  ParishDto,
  UpdateParishRequest,
  UpdateWorkAreaCategoryRequest,
  WorkAreaCategoryDto,
} from '@/types/parish'
import { toCommunity, toParish } from './mappers'
import { useCurrentParishId } from './hooks'

export const parishKeys = {
  all: ['parishes'] as const,
  detail: (id: string) => ['parishes', id] as const,
}

/** POST /api/v1/parishes â€” Táº¡o giÃ¡o xá»© má»›i (ADMIN). */
export function useCreateParish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateParishRequest) =>
      api<ParishDto>('/api/v1/parishes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishKeys.all })
    },
  })
}

/**
 * GET /api/v1/parishes — ADMIN thấy mọi giáo xứ, PARISH chỉ thấy giáo xứ mình.
 * `enabled: false` cho role không có quyền (LEADER/MO) để khỏi gọi mạng thừa.
 */
export function useParishes(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: parishKeys.all,
    enabled: options.enabled ?? true,
    queryFn: async () => {
      // ponytail: api() unwrap máº¥t `page`; size=100 láº¥y háº¿t má»™t lÆ°á»£t rá»“i Ä‘á»ƒ
      // DataTable phÃ¢n trang client. BE cháº·n size>100 báº±ng 400.
      const list = await api<ParishDto[]>('/api/v1/parishes?size=100')
      return list.map(toParish)
    },
  })
}

export const adminKeys = {
  activity: ['admin', 'activity'] as const,
  parish: ['admin', 'parish'] as const,
  skills: ['admin', 'skills'] as const,
}

// Communities CRUD dÃ¹ng tá»« trang admin â€” re-export hook read cá»§a domain
// communities cho trá»n bá»™ import má»™t chá»—.
export { useCommunities } from '@/features/communities/api'

interface ActivityLogDto {
  id: string
  actorUserId?: string | null
  action: string
  entityType: string
  entityId: string
  createdAt: string
}

export function useActivityLogs() {
  return useQuery({
    queryKey: adminKeys.activity,
    // GET /api/v1/activity-logs (NotificationAudit) - paged, moi nhat dung dau.
    queryFn: async () => {
      const res = await apiPaged<ActivityLogDto>('/api/v1/activity-logs?size=50')
      return res.data.map<ActivityRow>((row) => ({
        id: row.id,
        at: row.createdAt,
        actor: row.actorUserId ?? '—',
        action: row.action,
        target: row.entityType,
        entityType: row.entityType,
        entityId: row.entityId,
      }))
    },
  })
}

/** Dòng log kèm khoá đối tượng để mở chi tiết / lịch sử. */
export interface ActivityRow extends ActivityLog {
  entityType: string
  entityId: string
}

export interface ActivityLogDetailDto extends ActivityLogDto {
  parishId?: string | null
  seasonId?: string | null
  oldValue?: unknown
  newValue?: unknown
  reason?: string | null
  correlationId?: string | null
}

/** GET /api/v1/activity-logs/{logId} — chi tiết một bản ghi audit. */
export function useActivityLogDetail(logId?: string) {
  return useQuery({
    queryKey: ['admin', 'activity', logId ?? ''] as const,
    queryFn: () => api<ActivityLogDetailDto>(`/api/v1/activity-logs/${logId}`),
    enabled: Boolean(logId),
  })
}

export interface StateChangeDto {
  logId: string
  action: string
  oldValue?: unknown
  newValue?: unknown
  reason?: string | null
  actorUserId?: string | null
  changedAt: string
}

/** GET /api/v1/resource-history/{resourceType}/{resourceId} — lịch sử đối tượng. */
export function useResourceHistory(
  resourceType?: string,
  resourceId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['admin', 'resource-history', resourceType ?? '', resourceId ?? ''] as const,
    queryFn: async () => {
      const res = await api<StateChangeDto[] | { data?: StateChangeDto[] }>(
        `/api/v1/resource-history/${resourceType}/${resourceId}`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(resourceType && resourceId) && enabled,
  })
}

/** GET /api/v1/parishes/{id} â€” giÃ¡o xá»© Ä‘ang thao tÃ¡c. */
export function useParish() {
  const { parishId } = useCurrentParishId()
  return useQuery({
    queryKey: parishKeys.detail(parishId ?? ''),
    queryFn: async () => toParish(await api<ParishDto>(`/api/v1/parishes/${parishId}`)),
    enabled: Boolean(parishId),
  })
}

/**
 * PATCH /api/v1/parishes/{id} â€” BE dÃ¹ng optimistic concurrency: gá»­i
 * If-Match: "<version>"; version cÅ© â†’ 412 PARISH_VERSION_MISMATCH.
 */
export function useUpdateParish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version, ...data }: UpdateParishRequest & { id: string; version: number }) =>
      api<ParishDto>(`/api/v1/parishes/${id}`, {
        method: 'PATCH',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(data),
      }),
    onSuccess: (_r, v) => {
      void qc.invalidateQueries({ queryKey: parishKeys.all })
      void qc.invalidateQueries({ queryKey: parishKeys.detail(v.id) })
    },
  })
}

/** Danh mục kỹ năng — BE trả SkillDto (id/code/name); UI chỉ cần tên. */
export function useAdminSkills() {
  return useQuery({
    queryKey: adminKeys.skills,
    queryFn: async () => {
      try {
        const skills = await api<Array<string | { name: string }>>('/api/v1/skills')
        if (Array.isArray(skills)) {
          return skills.map((s) => (typeof s === 'string' ? s : s.name))
        }
      } catch {
        // BE lỗi/quyền không đủ → coi như chưa có danh mục
      }
      return []
    },
  })
}

function useAdminMutation<TVars>(
  invalidate: readonly unknown[][],
  fn: (vars: TVars) => Promise<unknown>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of invalidate) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

// ---- Users (CRUD generic /api/users) -------------------------------------

export function useCreateUser() {
  return useAdminMutation([['users']], (data: CreateAdminUserRequest) =>
    api<AdminUserDto>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  )
}

export function useUpdateUser() {
  return useAdminMutation([['users']], ({ id, version, ...data }: {
    id: string
    version?: number
    displayName?: string
    email?: string
    phone?: string | null
    parishId?: string | null
    status?: 'ACTIVE' | 'INACTIVE'
  }) =>
    api<AdminUserDto>('/api/v1/admin/users/' + id, {
      method: 'PATCH',
      headers: version !== undefined ? { 'If-Match': '"' + version + '"' } : undefined,
      body: JSON.stringify(data),
    }),
  )
}
export function useLockUser() {
  return useAdminMutation([['users']], ({ id, version, reason }: { id: string; version?: number; reason: string }) =>
    api<AdminUserDto>('/api/v1/admin/users/' + id + '/lock', {
      method: 'POST',
      headers: version !== undefined ? { 'If-Match': '"' + version + '"' } : undefined,
      body: JSON.stringify({ reason, version }),
    }),
  )
}

export function useUnlockUser() {
  return useAdminMutation([['users']], ({ id, version, reason }: { id: string; version?: number; reason: string }) =>
    api<AdminUserDto>('/api/v1/admin/users/' + id + '/unlock', {
      method: 'POST',
      headers: version !== undefined ? { 'If-Match': '"' + version + '"' } : undefined,
      body: JSON.stringify({ reason, version }),
    }),
  )
}
export function useAssignUserRole() {
  return useAdminMutation([['users']], ({ id, version, role, parishId }: { id: string; version?: number; role: string; parishId?: string | null }) =>
    api<AdminUserDto>('/api/v1/admin/users/' + id + '/role', {
      method: 'PUT',
      headers: version !== undefined ? { 'If-Match': '"' + version + '"' } : undefined,
      body: JSON.stringify({ role, parishId, version }),
    }),
  )
}
// BE KHÔNG có `DELETE` user/community → chỉ khoá/mở user, không xoá.
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api<RoleDto[]>('/api/v1/roles'),
  })
}

// ---- Communities (CRUD) --------------------------------------------------

export function useCreateCommunity() {
  return useAdminMutation([['communities']], ({ parishId, ...data }: CreateCommunityRequest & { parishId: string }) =>
    api<CommunityDto>(`/api/v1/parishes/${parishId}/communities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  )
}

/**
 * PATCH /api/v1/communities/{id} — BE tách endpoint riêng cho cộng đoàn và bắt
 * buộc If-Match (thiếu → 400 INVALID_IF_MATCH, lệch version → 412).
 */
export function useUpdateCommunity() {
  return useAdminMutation(
    [['communities'], ['admin', 'parish']],
    async ({ id, version, ...data }: {
      id: string
      version?: number
      name?: string
      description?: string
      status?: Community['status']
    }) => {
      const dto = await api<CommunityDto>(`/api/v1/communities/${id}`, {
        method: 'PATCH',
        headers: version === undefined ? {} : { 'If-Match': `"${version}"` },
        body: JSON.stringify({ name: data.name, description: data.description, status: data.status }),
      })
      return toCommunity(dto)
    },
  )
}

// BE hiện CHƯA có `DELETE /api/v1/communities/{id}` → không cung cấp hook xoá.

// ---- Parish (object đơn) + Skills ------------------------------------------

export function useCreateSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], async (name: string) => {
    // `code` bắt buộc ở BE (`CreateSkillRequest`) — sinh từ tên thay vì random
    // (trùng code thì BE trả 409, người dùng sửa tên/mã).
    const base = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10)
    const code = base || 'SKL'
    return api<any>('/api/v1/skills', {
      method: 'POST',
      body: JSON.stringify({ code, name }),
    })
  })
}

/** PATCH /api/v1/skills/{skillId} — đổi tên theo GUID (trước đây theo index → sai id). */
export function useRenameSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], async ({ id, name }: { id: string; name: string }) =>
    api<any>(`/api/v1/skills/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  )
}

// BE KHÔNG có `DELETE /api/v1/skills/{id}` → không cung cấp hook xoá kỹ năng nữa.

// ---- Backup ----------------------------------------------------------------

export function useRoleLabel(): Record<Role, string> {
  return {
    PARISH: 'Quản trị',
    COMMUNITY: 'Ban hành giáo',
    LEADER: 'Trưởng khu',
    MATERIAL_OFFICER: 'Trưởng ban hành giáo',
  }
}

// ---- Work Area Categories (B4..B6) ---------------------------------------

export const workAreaCategoryKeys = {
  all: ['workAreaCategories'] as const,
  list: (status?: string) => ['workAreaCategories', { status }] as const,
}

/** GET /api/v1/work-area-categories — Lấy danh sách danh mục khu vực thi công (B4) */
export function useWorkAreaCategories(status?: 'ACTIVE' | 'INACTIVE') {
  return useQuery({
    queryKey: workAreaCategoryKeys.list(status),
    queryFn: () => {
      const qs = status ? `?status=${status}` : ''
      return api<WorkAreaCategoryDto[]>(`/api/v1/work-area-categories${qs}`)
    },
  })
}

/** POST /api/v1/work-area-categories — Tạo mới danh mục khu vực thi công (B5) */
export function useCreateWorkAreaCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkAreaCategoryRequest) =>
      api<WorkAreaCategoryDto>('/api/v1/work-area-categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workAreaCategoryKeys.all })
    },
  })
}

/** PATCH /api/v1/work-area-categories/{categoryId} — Cập nhật danh mục khu vực thi công (B6) */
export function useUpdateWorkAreaCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateWorkAreaCategoryRequest & { id: string }) =>
      api<WorkAreaCategoryDto>(`/api/v1/work-area-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workAreaCategoryKeys.all })
    },
  })
}

