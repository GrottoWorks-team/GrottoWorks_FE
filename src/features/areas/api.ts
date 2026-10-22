// Work-area API hooks. BE không có /areas phẳng: khu vực luôn nằm trong một
// mùa (/api/v1/seasons/{seasonId}/work-areas), nên "tất cả các mùa" = gọi
// song song từng mùa rồi gộp.
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateWorkAreaRequest, WorkAreaDto } from '@/types/parish'
import { toWorkArea } from '@/features/parish/mappers'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'

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

/**
 * Khu vực trong phạm vi mùa đang chọn trên header — dùng cho các trang theo
 * role (task, chấm công, vật tư, mua hàng…) để mọi phép "khu của tôi" chỉ còn
 * tính trong mùa hiện tại. Role không có picker mùa (PARISH) → toàn bộ như cũ.
 */
export function useScopedAreas() {
  const { seasonId } = useSeasonContext()
  return useAreas(seasonId ? [seasonId] : undefined)
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

// Optimistic concurrency: BE bắt buộc If-Match cho PATCH/PUT (thiếu → 400
// INVALID_IF_MATCH, lệch version → 412).
const ifMatch = (version?: number): Record<string, string> =>
  version === undefined ? {} : { 'If-Match': `"${version}"` }

export interface AreaUpdateInput {
  id: string
  /** version hiện tại của khu — BE tăng sau mỗi lời gọi nên hook tự chuyền tiếp. */
  version?: number
  name?: string
  description?: string
  startDate?: string
  deadline?: string
  categoryId?: string
  communityId?: string | null
  leaderId?: string
  officerId?: string
}

/**
 * Cập nhật khu vực = nhiều lời gọi, vì BE tách endpoint theo nghiệp vụ:
 *   PATCH /work-areas/{id}                    → tên / mô tả / hạng mục / ngày
 *   PUT   /work-areas/{id}/community          → cộng đoàn phụ trách
 *   PUT   /work-areas/{id}/leader             → trưởng khu (user role LEADER, đang Active)
 *   PUT   /work-areas/{id}/material-officer   → trưởng nhóm vật tư (user role MO)
 * Mỗi lời gọi trả WorkAreaDto với version mới → dùng làm If-Match cho lời gọi kế.
 */
export function useUpdateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      version,
      name,
      description,
      startDate,
      deadline,
      categoryId,
      communityId,
      leaderId,
      officerId,
    }: AreaUpdateInput) => {
      let current = version
      let dto: WorkAreaDto | undefined

      const planning = { name, description, startDate, deadline, categoryId }
      if (Object.values(planning).some((v) => v !== undefined)) {
        dto = await api<WorkAreaDto>(`/api/v1/work-areas/${id}`, {
          method: 'PATCH',
          headers: ifMatch(current),
          body: JSON.stringify(planning),
        })
        current = dto.version ?? current
      }

      if (communityId) {
        dto = await api<WorkAreaDto>(`/api/v1/work-areas/${id}/community`, {
          method: 'PUT',
          headers: ifMatch(current),
          body: JSON.stringify({ communityId }),
        })
        current = dto.version ?? current
      }

      if (leaderId) {
        dto = await api<WorkAreaDto>(`/api/v1/work-areas/${id}/leader`, {
          method: 'PUT',
          headers: ifMatch(current),
          body: JSON.stringify({ userId: leaderId }),
        })
        current = dto.version ?? current
      }

      if (officerId) {
        dto = await api<WorkAreaDto>(`/api/v1/work-areas/${id}/material-officer`, {
          method: 'PUT',
          headers: ifMatch(current),
          body: JSON.stringify({ userId: officerId }),
        })
      }

      return dto ? toWorkArea(dto) : undefined
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: areaKeys.all }),
  })
}

/** Gán trưởng khu (PUT /work-areas/{id}/leader). */
export function useAssignAreaLeader() {
  return useUpdateArea()
}

/** Gán trưởng nhóm vật tư (PUT /work-areas/{id}/material-officer). */
export function useAssignAreaOfficer() {
  return useUpdateArea()
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
