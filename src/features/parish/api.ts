// Admin domain — quản trị tài khoản + danh mục + nhật ký hệ thống.
// Query key tách domain: ['admin', <resource>]; không đụng key của feature khác
// (useUsers/useCommunities giữ nguyên key ['users']/['communities'] gốc —
// invalidate từ admin nhắm đúng key đó để cache người khác cũng mới).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityLog, Community, Parish, Role, User } from '@/types'

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

export function useParish() {
  return useQuery({ queryKey: adminKeys.parish, queryFn: () => api<Parish>('/parish') })
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

// ---- Communities (CRUD generic /api/communities) -------------------------

export function useCreateCommunity() {
  return useAdminMutation([[ 'communities' ]], (data: Omit<Community, 'id'>) =>
    api<Community>('/communities', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateCommunity() {
  return useAdminMutation(
    [[ 'communities' ], [ 'admin', 'parish' ]],
    ({ id, ...data }: Partial<Community> & { id: string }) =>
      api<Community>(`/communities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

export function useDeleteCommunity() {
  return useAdminMutation([[ 'communities' ]], (id: string) =>
    api<void>(`/communities/${id}`, { method: 'DELETE' }),
  )
}

// ---- Parish (object đơn) + Skills (string[]) ------------------------------

export function useRenameParish() {
  return useAdminMutation([[ 'admin', 'parish' ]], (name: string) =>
    api<Parish>('/parish', { method: 'PATCH', body: JSON.stringify({ name }) }),
  )
}

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
