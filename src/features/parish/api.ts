// Admin domain â€” quáº£n trá»‹ tÃ i khoáº£n + danh má»¥c + nháº­t kÃ½ há»‡ thá»‘ng.
// Query key tÃ¡ch domain: ['admin', <resource>]; khÃ´ng Ä‘á»¥ng key cá»§a feature khÃ¡c
// (useUsers/useCommunities giá»¯ nguyÃªn key ['users']/['communities'] gá»‘c â€”
// invalidate tá»« admin nháº¯m Ä‘Ãºng key Ä‘Ã³ Ä‘á»ƒ cache ngÆ°á»i khÃ¡c cÅ©ng má»›i).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityLog, Community, Role, User } from '@/types'
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
import { toParish } from './mappers'
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

/** GET /api/v1/parishes â€” ADMIN tháº¥y má»i giÃ¡o xá»©, PARISH chá»‰ tháº¥y giÃ¡o xá»© mÃ¬nh. */
export function useParishes() {
  return useQuery({
    queryKey: parishKeys.all,
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

export function useActivityLogs() {
  return useQuery({
    queryKey: adminKeys.activity,
    // /api/activity = activityLogs 50 dÃ²ng má»›i nháº¥t, má»›i nháº¥t Ä‘á»©ng Ä‘áº§u.
    queryFn: () => api<ActivityLog[]>('/activity'),
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

export function useAdminSkills() {
  return useQuery({
    queryKey: adminKeys.skills,
    queryFn: async () => {
      try {
        const skills = await api<any[]>('/api/v1/skills')
        if (Array.isArray(skills)) {
          return skills.map((s) => (typeof s === 'string' ? s : s.name))
        }
      } catch {
        // fallback
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

// communityId: null = xoÃ¡ field (mock PATCH shallow-merge giá»¯ key null) â€”
// pattern areas/api.ts.
type UserPayload = Partial<Omit<User, 'id' | 'communityId'>> & {
  communityId?: string | null
}

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
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => api<RoleDto[]>('/api/v1/roles'),
  })
}
export function useDeleteUser() {
  return useAdminMutation([[ 'users' ]], (id: string) =>
    api<void>(`/users/${id}`, { method: 'DELETE' }),
  )
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

// ponytail: BE chÆ°a cÃ³ PATCH /communities/{id} â€” giá»¯ mock /api/communities/{id}
// (MSW). Gáº¯n khi service bá»• sung endpoint.
export function useUpdateCommunity() {
  return useAdminMutation(
    [[ 'communities' ], [ 'admin', 'parish' ]],
    ({ id, ...data }: Partial<Community> & { id: string }) =>
      api<Community>(`/communities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

// ponytail: BE chÆ°a cÃ³ DELETE /communities/{id} â€” giá»¯ mock.
export function useDeleteCommunity() {
  return useAdminMutation([[ 'communities' ]], (id: string) =>
    api<void>(`/communities/${id}`, { method: 'DELETE' }),
  )
}

// ---- Parish (object Ä‘Æ¡n) + Skills (string[]) ------------------------------

export function useCreateSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], async (name: string) => {
    const code = name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SKL'
    return api<any>('/api/v1/skills', {
      method: 'POST',
      body: JSON.stringify({ code: `${code}${Math.floor(Math.random() * 899 + 100)}`, name }),
    })
  })
}

export function useRenameSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], async ({ index, name }: { index: number; name: string }) => {
    try {
      const skills = await api<any[]>('/api/v1/skills')
      if (Array.isArray(skills) && skills[index]?.id) {
        return api<any>(`/api/v1/skills/${skills[index].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name }),
        })
      }
    } catch {
      // fallback
    }
  })
}

export function useDeleteSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], (index: number) =>
    api<void>(`/skills/${index}`, { method: 'DELETE' }),
  )
}

// ---- Backup ----------------------------------------------------------------

export function useBackup() {
  return useAdminMutation([], () =>
    api<Record<string, unknown>>('/export/backup', { method: 'POST' }),
  )
}

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

