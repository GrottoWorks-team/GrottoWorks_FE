// Work-area API hooks — cùng pattern season: query key <resource>, api()
// wrapper, invalidate sau mutation. useUsers/useCommunities sống ở domain
// riêng (features/users, features/communities) — re-export cho import cũ.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WorkArea } from '@/types'

export { useUsers } from '@/features/users/api'
export { useCommunities } from '@/features/communities/api'
export { useSeasons } from '@/features/season/api'

export const areaKeys = {
  all: ['areas'] as const,
}

export function useAreas() {
  return useQuery({
    queryKey: areaKeys.all,
    queryFn: () => api<WorkArea[]>('/areas'),
  })
}

function useAreaMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

export function useCreateArea() {
  return useAreaMutation((data: Omit<WorkArea, 'id'>) =>
    api<WorkArea>('/areas', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateArea() {
  // communityId: null = xoá thuộc tính (mock PATCH shallow-merge giữ key null).
  return useAreaMutation(
    ({ id, ...data }: Partial<Omit<WorkArea, 'communityId'>> & { id: string; communityId?: string | null }) =>
      api<WorkArea>(`/areas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

export function useDeleteArea() {
  return useAreaMutation((id: string) => api<void>(`/areas/${id}`, { method: 'DELETE' }))
}
