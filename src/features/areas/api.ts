// Work-area API hooks. BE không có /areas phẳng: khu vực luôn nằm trong một
// mùa (/api/v1/seasons/{seasonId}/work-areas), nên "tất cả các mùa" = gọi
// song song từng mùa rồi gộp.
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateWorkAreaRequest, WorkAreaDto } from '@/types/parish'
import { toWorkArea } from '@/features/parish/mappers'
import { useSeasons } from '@/features/season/api'

export { useUsers } from '@/features/users/api'
export { useCommunities } from '@/features/communities/api'
export { useSeasons } from '@/features/season/api'

export const areaKeys = {
  all: ['areas'] as const,
  bySeason: (seasonId: string) => ['areas', seasonId] as const,
}

/** GET /api/v1/seasons/{seasonId}/work-areas — một mùa. */
export function useSeasonAreas(seasonId?: string) {
  return useQuery({
    queryKey: areaKeys.bySeason(seasonId ?? ''),
    queryFn: async () => {
      const list = await api<WorkAreaDto[]>(
        `/api/v1/seasons/${seasonId}/work-areas?size=100`,
      )
      return list.map(toWorkArea)
    },
    enabled: Boolean(seasonId),
  })
}

/** Gộp khu vực của nhiều mùa. Khi seasonIds không truyền: tự động lấy tất cả các mùa. */
export function useAreas(seasonIds?: string[]) {
  const { data: allSeasons = [] } = useSeasons()
  const effectiveSeasonIds = seasonIds ?? allSeasons.map((s) => s.id)
  const results = useQueries({
    queries: effectiveSeasonIds.map((seasonId) => ({
      queryKey: areaKeys.bySeason(seasonId),
      queryFn: async () => {
        const list = await api<WorkAreaDto[]>(
          `/api/v1/seasons/${seasonId}/work-areas?size=100`,
        )
        return list.map(toWorkArea)
      },
      enabled: Boolean(seasonId),
    })),
  })

  return {
    data: results.flatMap((r) => r.data ?? []),
    isPending: results.some((r) => r.isPending),
  }
}

/** GET /api/v1/work-areas/{id} */
export function useArea(id?: string) {
  return useQuery({
    queryKey: ['area', id ?? ''],
    queryFn: async () => toWorkArea(await api<WorkAreaDto>(`/api/v1/work-areas/${id}`)),
    enabled: Boolean(id),
  })
}

export function useCreateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ seasonId, ...data }: CreateWorkAreaRequest & { seasonId: string }) =>
      api<WorkAreaDto>(`/api/v1/seasons/${seasonId}/work-areas`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

export function useUpdateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      name,
      description,
      startDate,
      deadline,
      mapX: _mapX,
      mapY: _mapY,
      version,
    }: {
      id: string
      name?: string
      description?: string | null
      startDate?: string | null
      deadline?: string | null
      mapX?: number | null
      mapY?: number | null
      version?: number
    }) => {
      const payload: Record<string, unknown> = {}
      if (name !== undefined) payload.name = name.trim()
      if (description !== undefined) payload.description = description ? description.trim() : null
      if (startDate !== undefined) payload.startDate = startDate || null
      if (deadline !== undefined) payload.deadline = deadline || null

      const headers: Record<string, string> = {}
      if (version !== undefined && version !== null) {
        headers['If-Match'] = `"${version}"`
      }

      return api<WorkAreaDto>(`/api/v1/work-areas/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

/** PUT /api/v1/work-areas/{workAreaId}/community (B7) */
export function useAssignWorkAreaCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workAreaId,
      communityId,
      version,
    }: {
      workAreaId: string
      communityId: string
      version?: number
    }) =>
      api<WorkAreaDto>(`/api/v1/work-areas/${workAreaId}/community`, {
        method: 'PUT',
        headers: version ? { 'If-Match': String(version) } : undefined,
        body: JSON.stringify({ communityId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

/** PUT /api/v1/work-areas/{workAreaId}/leader (B8) */
export function useAssignWorkAreaLeader() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workAreaId,
      userId,
      version,
    }: {
      workAreaId: string
      userId: string
      version?: number
    }) =>
      api<WorkAreaDto>(`/api/v1/work-areas/${workAreaId}/leader`, {
        method: 'PUT',
        headers: version ? { 'If-Match': String(version) } : undefined,
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

/** PUT /api/v1/work-areas/{workAreaId}/material-officer (B9) */
export function useAssignWorkAreaMaterialOfficer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workAreaId,
      userId,
      version,
    }: {
      workAreaId: string
      userId: string
      version?: number
    }) =>
      api<WorkAreaDto>(`/api/v1/work-areas/${workAreaId}/material-officer`, {
        method: 'PUT',
        headers: version ? { 'If-Match': String(version) } : undefined,
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}
