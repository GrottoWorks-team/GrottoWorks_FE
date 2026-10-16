// Season API hooks. GET list + POST create đi API thật của ParishCoordination;
// PATCH update/activate/close chưa có endpoint ở BE (xem chú thích dưới).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Season } from '@/types'
import type { CreateSeasonRequest, SeasonDto } from '@/types/parish'
import { toSeason } from '@/features/parish/mappers'

export const seasonKeys = {
  all: ['seasons'] as const,
  detail: (id: string) => ['seasons', id] as const,
}

/** GET /api/v1/seasons — BE lọc theo giáo xứ của caller; ADMIN thấy tất cả. */
export function useSeasons() {
  return useQuery({
    queryKey: seasonKeys.all,
    queryFn: async () => {
      // ponytail: api() unwrap mất `page`; size=100 lấy hết rồi phân trang client.
      const list = await api<SeasonDto[]>('/api/v1/seasons?size=100')
      return list.map(toSeason)
    },
  })
}

/** GET /api/v1/seasons/{id} */
export function useSeason(id?: string) {
  return useQuery({
    queryKey: seasonKeys.detail(id ?? ''),
    queryFn: async () => toSeason(await api<SeasonDto>(`/api/v1/seasons/${id}`)),
    enabled: Boolean(id),
  })
}

// Invalidate chung sau mọi mutation season.
function useSeasonMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: seasonKeys.all }),
  })
}

export function useCreateSeason() {
  return useSeasonMutation((data: CreateSeasonRequest) =>
    api<SeasonDto>('/api/v1/seasons', { method: 'POST', body: JSON.stringify(data) }),
  )
}

// ponytail: BE chưa có PATCH /api/v1/seasons/{id} — update/activate/close vẫn
// đi MSW mock. Gắn khi ParishCoordination bổ sung endpoint cập nhật mùa.
export function useUpdateSeason() {
  return useSeasonMutation(({ id, ...data }: Partial<Season> & { id: string }) =>
    api<Season>(`/seasons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

// Kích hoạt mùa: PATCH status='ACTIVE'.
export function useActivateSeason() {
  return useSeasonMutation((id: string) =>
    api<Season>(`/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'ACTIVE' }),
    }),
  )
}

// Chốt mùa: PATCH status='COMPLETED'.
export function useCloseSeason() {
  return useSeasonMutation((id: string) =>
    api<Season>(`/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    }),
  )
}
