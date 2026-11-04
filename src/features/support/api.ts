// Yêu cầu hỗ trợ chéo cộng đoàn — BE TaskExecution `/api/v1/support-requests`
// (chỉ có list / create / get / update). Chưa có publish, response, duyệt member
// hay chuyển vật tư → UI dừng ở trạng thái PLANNING và ghi chú rõ.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type {
  SupportRequest,
  SupportResponse,
  SupportResponseMaterial,
  SupportResponseMember,
  SupportType,
} from '@/types'

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
  /** BE yêu cầu gắn task trước khi publish (SUPPORT_POSITION_TASK_REQUIRED). */
  taskId?: string
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
      taskId: p.taskId || null,
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

/* ------------------------------------------------------------------------ */
/* Phát hành / đóng / phản hồi / duyệt (LEADER, trừ response do MO gửi)      */
/* ------------------------------------------------------------------------ */

function useSupportMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  })
}

/** POST /support-requests/{id}/publish — công bố yêu cầu cho các cộng đoàn. */
export function usePublishSupportRequest() {
  return useSupportMutation(({ id, version }: { id: string; version: number }) =>
    api<SupportRequest>(`/api/v1/support-requests/${id}/publish`, {
      method: 'POST',
      headers: { 'If-Match': `"${version}"` },
      body: JSON.stringify({ version }),
    }),
  )
}

/** POST /support-requests/{id}/close — đóng / huỷ kèm lý do. */
export function useCloseSupportRequest() {
  return useSupportMutation(
    ({
      id,
      version,
      status,
      reason,
    }: {
      id: string
      version: number
      status: 'CLOSED' | 'CANCELLED'
      reason?: string
    }) =>
      api<SupportRequest>(`/api/v1/support-requests/${id}/close`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, status, reason: reason || null }),
      }),
  )
}

/** GET /support-requests/{id}/responses — phản hồi của các cộng đoàn. */
export function useSupportResponses(id?: string) {
  return useQuery({
    queryKey: [...supportKeys.all, 'responses', id ?? ''],
    queryFn: async () => {
      const res = await api<SupportResponse[] | { data?: SupportResponse[] }>(
        `/api/v1/support-requests/${id}/responses`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(id),
  })
}

/** POST /support-response-materials/{itemId}/approve — duyệt số lượng vật tư hỗ trợ. */
export function useApproveSupportMaterial() {
  return useSupportMutation(
    ({ itemId, version, approvedQuantity }: { itemId: string; version: number; approvedQuantity: number }) =>
      api<SupportResponseMaterial>(`/api/v1/support-response-materials/${itemId}/approve`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, approvedQuantity }),
      }),
  )
}

export function useRejectSupportMaterial() {
  return useSupportMutation(
    ({ itemId, version, reason }: { itemId: string; version: number; reason: string }) =>
      api<SupportResponseMaterial>(`/api/v1/support-response-materials/${itemId}/reject`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, reason }),
      }),
  )
}

export function useApproveSupportMember() {
  return useSupportMutation(({ memberId, version }: { memberId: string; version: number }) =>
    api<SupportResponseMember>(`/api/v1/support-response-members/${memberId}/approve`, {
      method: 'POST',
      headers: { 'If-Match': `"${version}"` },
      body: JSON.stringify({ version }),
    }),
  )
}

export function useRejectSupportMember() {
  return useSupportMutation(
    ({ memberId, version, reason }: { memberId: string; version: number; reason: string }) =>
      api<SupportResponseMember>(`/api/v1/support-response-members/${memberId}/reject`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, reason }),
      }),
  )
}

export interface SupportSummaryDto {
  seasonId: string
  totalRequests: number
  requests: Array<{ status: string; count: number }>
  communities: Array<{
    respondingCommunityId?: string | null
    responses: number
    offeredMembers: number
    approvedMembers: number
    completedMembers: number
  }>
  calculatedAt: string
}

/** GET /seasons/{seasonId}/support-summary — tổng hợp hỗ trợ chéo (ban hành giáo). */
export function useSupportSummary(seasonId?: string) {
  return useQuery({
    queryKey: [...supportKeys.all, 'summary', seasonId ?? ''],
    queryFn: () => api<SupportSummaryDto>(`/api/v1/seasons/${seasonId}/support-summary`),
    enabled: Boolean(seasonId),
    retry: false,
  })
}

/** POST /support-response-materials/{itemId}/confirm-receipt (MO) — số thực nhận; chỉ usable vào kho. */
export function useConfirmSupportMaterialReceipt() {
  return useSupportMutation(
    ({
      itemId,
      version,
      usableQuantity,
      unusableQuantity,
      note,
    }: {
      itemId: string
      version: number
      usableQuantity: number
      unusableQuantity?: number
      note?: string
    }) =>
      api<unknown>(`/api/v1/support-response-materials/${itemId}/confirm-receipt`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({
          version,
          receivedUsableQuantity: usableQuantity,
          receivedUnusableQuantity: unusableQuantity ?? 0,
          note: note || null,
        }),
      }),
  )
}