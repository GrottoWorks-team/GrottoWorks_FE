// Communities domain — query key ['communities']. Feature khác cần chọn
// giáo khu thì import hook từ đây, KHÔNG copy trùng key.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CommunityDto } from '@/types/parish'
import { toCommunity } from '@/features/parish/mappers'
import { useCurrentParishId } from '@/features/parish/hooks'

/** GET /api/v1/parishes/{parishId}/communities — BE trả mảng thẳng, không phân trang. */
export function useCommunities() {
  const { parishId, isPending } = useCurrentParishId()
  return useQuery({
    queryKey: ['communities', parishId ?? ''],
    queryFn: async () => {
      const list = await api<CommunityDto[]>(`/api/v1/parishes/${parishId}/communities`)
      return list.map(toCommunity)
    },
    enabled: Boolean(parishId) && !isPending,
  })
}
