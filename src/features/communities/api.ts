// Communities domain — query key ['communities']. Feature khác cần chọn
// giáo khu thì import hook từ đây, KHÔNG copy trùng key.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CommunityDto } from '@/types/parish'
import { toCommunity } from '@/features/parish/mappers'
import { useCurrentParishId } from '@/features/parish/hooks'

/**
 * GET /api/v1/parishes/{parishId}/communities — BE trả mảng thẳng, không phân trang.
 * ADMIN xem nhiều giáo xứ → truyền `parishId` để đổi phạm vi (mặc định: hồ sơ).
 */
export function useCommunities(options: { enabled?: boolean; parishId?: string } = {}) {
  const current = useCurrentParishId()
  const parishId = options.parishId ?? current.parishId
  return useQuery({
    queryKey: ['communities', parishId ?? ''],
    queryFn: async () => {
      const list = await api<CommunityDto[]>(`/api/v1/parishes/${parishId}/communities`)
      return list.map(toCommunity)
    },
    enabled: (options.enabled ?? true) && Boolean(parishId),
  })
}
