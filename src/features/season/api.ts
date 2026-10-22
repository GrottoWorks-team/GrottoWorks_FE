// Season API hooks — toàn bộ đi API thật của ParishCoordination:
//   GET    /api/v1/seasons[/{id}]        POST /api/v1/seasons
//   PATCH  /api/v1/seasons/{id}          (If-Match bắt buộc)
//   POST   /api/v1/seasons/{id}/activate (version trong body, If-Match tuỳ chọn)
//   POST   /api/v1/seasons/{id}/complete | /archive
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
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

// Optimistic concurrency: BE trả 400 INVALID_IF_MATCH khi PATCH thiếu header
// và 412 SEASON_VERSION_MISMATCH khi version lệch → luôn gửi kèm version.
const ifMatch = (version?: number): Record<string, string> =>
  version === undefined ? {} : { 'If-Match': `"${version}"` }

export interface SeasonUpdateInput {
  id: string
  version?: number
  name?: string
  year?: number
  startDate?: string
  endDate?: string
  budget?: number
  description?: string
}

export interface SeasonActionInput {
  id: string
  version?: number
}

export function useCreateSeason() {
  return useSeasonMutation((data: CreateSeasonRequest) =>
    api<SeasonDto>('/api/v1/seasons', { method: 'POST', body: JSON.stringify(data) }),
  )
}

/** PATCH /api/v1/seasons/{id} — chỉ mùa PLANNING mới sửa được (BE trả 409). */
export function useUpdateSeason() {
  return useSeasonMutation(async ({ id, version, ...data }: SeasonUpdateInput) => {
    const dto = await api<SeasonDto>(`/api/v1/seasons/${id}`, {
      method: 'PATCH',
      headers: ifMatch(version),
      body: JSON.stringify({
        name: data.name,
        seasonYear: data.year,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        estimatedBudget: data.budget,
      }),
    })
    return toSeason(dto)
  })
}

// Ba thao tác trạng thái dùng chung một hình dạng body { version }.
function useSeasonAction(action: 'activate' | 'complete' | 'archive') {
  return useSeasonMutation(async ({ id, version }: SeasonActionInput) => {
    const dto = await api<SeasonDto>(`/api/v1/seasons/${id}/${action}`, {
      method: 'POST',
      headers: ifMatch(version),
      body: JSON.stringify({ version: version ?? null }),
    })
    return toSeason(dto)
  })
}

/** POST /activate — BE đòi ≥1 work area và mọi khu đủ leader + MO. */
export function useActivateSeason() {
  return useSeasonAction('activate')
}

/** POST /complete — chốt mùa (giữ tên cũ để page không phải đổi). */
export function useCloseSeason() {
  return useSeasonAction('complete')
}

/** POST /complete — tên tường minh, dùng cho code mới. */
export function useCompleteSeason() {
  return useSeasonAction('complete')
}

/** POST /archive — lưu trữ mùa (đọc-only sau đó). */
export function useArchiveSeason() {
  return useSeasonAction('archive')
}
