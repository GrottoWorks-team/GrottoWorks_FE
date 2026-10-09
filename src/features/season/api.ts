// Season API hooks — pattern chuẩn cho mọi feature sau: query key <resource>,
// api() wrapper, invalidate toàn bộ key sau mutation.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Season } from '@/types'

export const seasonKeys = {
  all: ['seasons'] as const,
}

export function useSeasons() {
  return useQuery({
    queryKey: seasonKeys.all,
    queryFn: () => api<Season[]>('/seasons'),
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
  return useSeasonMutation((data: Omit<Season, 'id'>) =>
    api<Season>('/seasons', { method: 'POST', body: JSON.stringify(data) }),
  )
}

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

// Chốt mùa: PATCH status='CLOSED'.
export function useCloseSeason() {
  return useSeasonMutation((id: string) =>
    api<Season>(`/seasons/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CLOSED' }),
    }),
  )
}
