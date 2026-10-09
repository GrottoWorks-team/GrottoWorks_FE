// Communities domain — query key ['communities']. Feature khác cần chọn
// giáo khu thì import hook từ đây, KHÔNG copy trùng key.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Community } from '@/types'

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: () => api<Community[]>('/communities'),
  })
}
