// Users domain — query key ['users']. Feature khác cần chọn user theo role
// thì import hook từ đây, KHÔNG copy trùng key.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<User[]>('/users'),
  })
}
