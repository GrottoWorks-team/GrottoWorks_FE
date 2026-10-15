// Admin domain — quản trị tài khoản + danh mục + nhật ký hệ thống.
// Query key tách domain: ['admin', <resource>]; không đụng key của feature khác
// (useUsers/useCommunities giữ nguyên key ['users']/['communities'] gốc —
// invalidate từ admin nhắm đúng key đó để cache người khác cũng mới).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityLog, Community, Role, User } from '@/types'
import type {
  CommunityDto,
  CreateCommunityRequest,
  CreateParishRequest,
  ParishDto,
  UpdateParishRequest,
} from '@/types/parish'
import { toParish } from './mappers'
import { useCurrentParishId } from './hooks'

export const parishKeys = {
  all: ['parishes'] as const,
  detail: (id: string) => ['parishes', id] as const,
}

/** POST /api/v1/parishes — Tạo giáo xứ mới (ADMIN). */
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

/** GET /api/v1/parishes — ADMIN thấy mọi giáo xứ, PARISH chỉ thấy giáo xứ mình. */
export function useParishes() {
  return useQuery({
    queryKey: parishKeys.all,
    queryFn: async () => {
      // ponytail: api() unwrap mất `page`; size=100 lấy hết một lượt rồi để
      // DataTable phân trang client. BE chặn size>100 bằng 400.
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

// Communities CRUD dùng từ trang admin — re-export hook read của domain
// communities cho trọn bộ import một chỗ.
export { useCommunities } from '@/features/communities/api'

export function useActivityLogs() {
  return useQuery({
    queryKey: adminKeys.activity,
    // /api/activity = activityLogs 50 dòng mới nhất, mới nhất đứng đầu.
    queryFn: () => api<ActivityLog[]>('/activity'),
  })
}

/** GET /api/v1/parishes/{id} — giáo xứ đang thao tác. */
export function useParish() {
  const { parishId } = useCurrentParishId()
  return useQuery({
    queryKey: parishKeys.detail(parishId ?? ''),
    queryFn: async () => toParish(await api<ParishDto>(`/api/v1/parishes/${parishId}`)),
    enabled: Boolean(parishId),
  })
}

/**
 * PATCH /api/v1/parishes/{id} — BE dùng optimistic concurrency: gửi
 * If-Match: "<version>"; version cũ → 412 PARISH_VERSION_MISMATCH.
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
  return useQuery({ queryKey: adminKeys.skills, queryFn: () => api<string[]>('/skills') })
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

// communityId: null = xoá field (mock PATCH shallow-merge giữ key null) —
// pattern areas/api.ts.
type UserPayload = Partial<Omit<User, 'id' | 'communityId'>> & {
  communityId?: string | null
}

export function useCreateUser() {
  return useAdminMutation([[ 'users' ]], (data: Omit<User, 'id'>) =>
    api<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateUser() {
  // locked: null không cần (lock là boolean) — PATCH shallow-merge đủ dùng.
  return useAdminMutation([[ 'users' ]], ({ id, ...data }: UserPayload & { id: string }) =>
    api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
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

// ponytail: BE chưa có PATCH /communities/{id} — giữ mock /api/communities/{id}
// (MSW). Gắn khi service bổ sung endpoint.
export function useUpdateCommunity() {
  return useAdminMutation(
    [[ 'communities' ], [ 'admin', 'parish' ]],
    ({ id, ...data }: Partial<Community> & { id: string }) =>
      api<Community>(`/communities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

// ponytail: BE chưa có DELETE /communities/{id} — giữ mock.
export function useDeleteCommunity() {
  return useAdminMutation([[ 'communities' ]], (id: string) =>
    api<void>(`/communities/${id}`, { method: 'DELETE' }),
  )
}

// ---- Parish (object đơn) + Skills (string[]) ------------------------------

export function useCreateSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], (name: string) =>
    api<string[]>('/skills', { method: 'POST', body: JSON.stringify({ name }) }),
  )
}

export function useRenameSkill() {
  return useAdminMutation([[ 'admin', 'skills' ]], ({ index, name }: { index: number; name: string }) =>
    api<string[]>(`/skills/${index}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  )
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
