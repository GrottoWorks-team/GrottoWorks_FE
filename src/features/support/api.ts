// Yêu cầu hỗ trợ chéo cộng đoàn — BE TaskExecution `/api/v1/support-requests`
// (chỉ có list / create / get / update). Chưa có publish, response, duyệt member
// hay chuyển vật tư → UI dừng ở trạng thái PLANNING và ghi chú rõ.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { SupportRequest, SupportType } from '@/types'

export const supportKeys = { all: ['supportRequests'] as const }

export interface SupportQuery {
  seasonId?: string
  workAreaId?: string
  supportType?: SupportType
  status?: string
  size?: number
}

export function useSupportRequests(params?: SupportQuery) {
  return useQuery({
    queryKey: [...supportKeys.all, params ?? {}],
    queryFn: async () => {
      const q = new URLSearchParams({ size: String(params?.size ?? 100) })
      if (params?.seasonId) q.set('seasonId', params.seasonId)
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params?.supportType) q.set('supportType', params.supportType)
      if (params?.status) q.set('status', params.status)
      const res = await apiPaged<SupportRequest>(`/api/v1/support-requests?${q.toString()}`)
      return res.data
    },
  })
}

export function useSupportRequest(id?: string) {
  return useQuery({
    queryKey: [...supportKeys.all, 'detail', id ?? ''],
    queryFn: () => api<SupportRequest>(`/api/v1/support-requests/${id}`),
    enabled: Boolean(id),
  })
}

export interface SupportPositionDraft {
  name: string
  requiredVolunteerCount: number
  note?: string
}

export interface SupportMaterialDraft {
  materialId: string
  requiredQuantity: number
  note?: string
}

export interface CreateSupportInput {
  seasonId: string
  workAreaId: string
  supportType: SupportType
  description?: string
  deadline?: string
  positions: SupportPositionDraft[]
  materials: SupportMaterialDraft[]
}

function payload(input: CreateSupportInput) {
  return {
    seasonId: input.seasonId,
    workAreaId: input.workAreaId,
    supportType: input.supportType,
    description: input.description || null,
    deadline: input.deadline || null,
    positions: input.positions.map((p) => ({
      name: p.name,
      requiredVolunteerCount: p.requiredVolunteerCount,
      note: p.note || null,
      skills: [],
    })),
    materials: input.materials.map((m) => ({
      materialId: m.materialId,
      requiredQuantity: m.requiredQuantity,
      note: m.note || null,
    })),
  }
}

export function useCreateSupportRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSupportInput) =>
      api<SupportRequest>('/api/v1/support-requests', {
        method: 'POST',
        body: JSON.stringify(payload(input)),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  })
}

/** PATCH partial; `version` gửi qua If-Match để BE chặn ghi đè (412). */
export function useUpdateSupportRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      version,
      ...input
    }: Partial<CreateSupportInput> & { id: string; version: number }) =>
      api<SupportRequest>(`/api/v1/support-requests/${id}`, {
        method: 'PATCH',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(payload(input as CreateSupportInput)),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  })
}