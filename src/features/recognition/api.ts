// Danh mục vinh danh + điểm đóng góp — Reporting service:
//   GET   /api/v1/contribution-types?status=            (ADMIN, PARISH)
//   POST  /api/v1/contribution-types                    (ADMIN)
//   PATCH /api/v1/contribution-types/{typeId}           (ADMIN)
//   GET   /api/v1/recognition-rules?status=&contributionTypeId=
//   POST  /api/v1/recognition-rules                     (ADMIN)
//   POST  /api/v1/recognition-rules/{ruleId}/deactivate (ADMIN)
//   GET   /api/v1/seasons/{seasonId}/recognition        (PARISH — bảng xếp hạng)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type CatalogStatus = 'ACTIVE' | 'INACTIVE'

export interface ContributionTypeDto {
  id: string
  code: string
  name: string
  description?: string | null
  status: CatalogStatus
  system: boolean
}

export interface RecognitionRuleDto {
  id: string
  contributionTypeId: string
  contributionTypeCode: string
  name: string
  ruleVersion: number
  points: number
  description?: string | null
  status: CatalogStatus
  effectiveFrom: string
  effectiveTo?: string | null
  version: number
}

export interface RecognitionRankingRowDto {
  rank: number
  userId: string
  displayName?: string | null
  totalPoints: number
  contributions: number
}

export interface RecognitionRankingDto {
  seasonId: string
  parishId: string
  totalPoints: number
  contributions: number
  externalDonorContributions: number
  contributors: number
  ranking: RecognitionRankingRowDto[]
  generatedAt: string
}

export const recognitionKeys = {
  types: (status?: string) => ['recognition', 'types', status ?? 'ALL'] as const,
  rules: (status?: string, typeId?: string) =>
    ['recognition', 'rules', status ?? 'ALL', typeId ?? 'ALL'] as const,
  season: (seasonId?: string) => ['recognition', 'season', seasonId ?? ''] as const,
}

function unwrapList<T>(res: T[] | { data?: T[] }): T[] {
  return Array.isArray(res) ? res : (res.data ?? [])
}

export function useContributionTypes(status?: CatalogStatus) {
  return useQuery({
    queryKey: recognitionKeys.types(status),
    queryFn: async () => {
      const qs = status ? `?status=${status}` : ''
      return unwrapList(
        await api<ContributionTypeDto[] | { data?: ContributionTypeDto[] }>(
          `/api/v1/contribution-types${qs}`,
        ),
      )
    },
  })
}

export function useCreateContributionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { code: string; name: string; description?: string | null }) =>
      api<ContributionTypeDto>('/api/v1/contribution-types', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recognition'] }),
  })
}

export function useUpdateContributionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      typeId,
      ...payload
    }: {
      typeId: string
      name?: string
      description?: string | null
      status?: CatalogStatus
    }) =>
      api<ContributionTypeDto>(`/api/v1/contribution-types/${typeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recognition'] }),
  })
}

export function useRecognitionRules(
  params: { status?: CatalogStatus; contributionTypeId?: string } = {},
) {
  return useQuery({
    queryKey: recognitionKeys.rules(params.status, params.contributionTypeId),
    queryFn: async () => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      if (params.contributionTypeId) q.set('contributionTypeId', params.contributionTypeId)
      const qs = q.toString()
      return unwrapList(
        await api<RecognitionRuleDto[] | { data?: RecognitionRuleDto[] }>(
          `/api/v1/recognition-rules${qs ? `?${qs}` : ''}`,
        ),
      )
    },
  })
}

export function useCreateRecognitionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      contributionTypeId: string
      name: string
      points: number
      description?: string | null
      effectiveFrom: string
      effectiveTo?: string | null
    }) =>
      api<RecognitionRuleDto>('/api/v1/recognition-rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recognition'] }),
  })
}

export function useDeactivateRecognitionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ruleId,
      version,
      reason,
    }: {
      ruleId: string
      version?: number
      reason: string
    }) =>
      api<RecognitionRuleDto>(`/api/v1/recognition-rules/${ruleId}/deactivate`, {
        method: 'POST',
        headers: version ? { 'If-Match': `"${version}"` } : {},
        body: JSON.stringify({ version: version ?? null, reason }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recognition'] }),
  })
}

/** Bảng xếp hạng điểm vinh danh của mùa (PARISH/ban hành giáo). */
export function useSeasonRecognition(seasonId?: string) {
  return useQuery({
    queryKey: recognitionKeys.season(seasonId),
    queryFn: () => api<RecognitionRankingDto>(`/api/v1/seasons/${seasonId}/recognition`),
    enabled: Boolean(seasonId),
  })
}
