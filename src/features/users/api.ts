// Users domain — query key ['users']. Feature khác cần chọn user theo role
// thì import hook từ đây, KHÔNG copy trùng key.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'
import type { AdminUserDto } from '@/types/identity'
import { toUser } from '@/features/parish/mappers'

export interface UserListParams {
  role?: string
  status?: string
  search?: string
  page?: number
  size?: number
}

export function useUsers(params?: UserListParams) {
  const queryParams = new URLSearchParams()
  if (params?.role) queryParams.set('role', params.role)
  if (params?.status) queryParams.set('status', params.status)
  if (params?.search) queryParams.set('search', params.search)
  queryParams.set('page', String(params?.page ?? 1))
  queryParams.set('size', String(params?.size ?? 100))

  return useQuery<User[]>({
    queryKey: ['users', params],
    queryFn: async () => {
      // Gọi endpoint /api/v1/admin/users
      const res = await api<AdminUserDto[]>(`/api/v1/admin/users?${queryParams.toString()}`)
      if (Array.isArray(res)) {
        return res.map(toUser)
      }
      return []
    },
  })
}
