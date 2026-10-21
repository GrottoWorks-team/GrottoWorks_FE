// Purchases domain — PurchaseRequest (API Contract v1.3 /api/v1/purchase-requests) + PurchaseRecord
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { materialKeys } from '@/features/materials/api'
import type { Material, PurchaseRecord, PurchaseRequest } from '@/types'

export type PurchaseRequestStatusType =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'BUYER_ASSIGNED'
  | 'PURCHASED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface MoneyDto {
  amount: number
  currency: string
}

export interface PurchaseRequestItemDto {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  requestedQuantity: number
  estimatedCost?: number | null
  note?: string | null
  shortageOverrideReason?: string | null
}

export interface PurchaseRequestDto {
  id: string
  workAreaId: string
  workAreaName: string
  seasonId: string
  requestedBy: string
  reason?: string | null
  status: PurchaseRequestStatusType
  items: PurchaseRequestItemDto[]
  estimatedTotal: MoneyDto
  approvedBy?: string | null
  decisionNote?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  createdAt: string
  updatedAt?: string | null
  version: number
}

export interface StateChangeDto {
  fromStatus?: PurchaseRequestStatusType | null
  toStatus: PurchaseRequestStatusType
  changedBy: string
  changedAt: string
  note?: string | null
}

export interface PurchaseRequestFilterParams {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  status?: PurchaseRequestStatusType
  sort?: string
}

export interface PurchaseRequestItemInput {
  materialId: string
  requestedQuantity: number
  estimatedCost?: number | null
  note?: string | null
  shortageOverrideReason?: string | null
}

export interface CreatePurchaseRequestPayload {
  workAreaId: string
  reason?: string | null
  items: PurchaseRequestItemInput[]
}

export interface UpdatePurchaseRequestPayload {
  version: number
  reason?: string | null
  items?: PurchaseRequestItemInput[]
}

export const purchaseRequestKeys = {
  all: ['purchaseRequests'] as const,
  list: (filter?: PurchaseRequestFilterParams) => ['purchaseRequests', 'list', filter] as const,
  detail: (id: string) => ['purchaseRequests', 'detail', id] as const,
  history: (id: string) => ['purchaseRequests', 'history', id] as const,
}

export const purchaseRecordKeys = { all: ['purchaseRecords'] as const }

/**
 * F1: GET /api/v1/purchase-requests (có phân trang & bộ lọc status, workAreaId, seasonId)
 */
export function usePurchaseRequests(filter?: PurchaseRequestFilterParams) {
  return useQuery({
    queryKey: purchaseRequestKeys.list(filter),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filter?.page) sp.set('page', String(filter.page))
      if (filter?.size) sp.set('size', String(filter.size))
      if (filter?.seasonId) sp.set('seasonId', filter.seasonId)
      if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
      if (filter?.status) sp.set('status', filter.status)
      if (filter?.sort) sp.set('sort', filter.sort)
      const qs = sp.toString()
      const res = await api<{ data?: PurchaseRequestDto[] } | PurchaseRequestDto[]>(
        `/api/v1/purchase-requests${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

/**
 * Mock query cho các luồng cũ (PurchaseConfirmPage) chưa nối backend contract mới.
 */
export function useMockPurchaseRequests() {
  return useQuery({
    queryKey: ['mockPurchaseRequests'] as const,
    queryFn: () => api<any[]>('/purchaseRequests'),
  })
}

/**
 * F3: GET /api/v1/purchase-requests/{requestId}
 */
export function usePurchaseRequest(requestId?: string) {
  return useQuery({
    queryKey: purchaseRequestKeys.detail(requestId ?? ''),
    queryFn: async () => {
      if (!requestId) throw new Error('requestId required')
      const res = await api<{ data?: PurchaseRequestDto } | PurchaseRequestDto>(
        `/api/v1/purchase-requests/${requestId}`,
      )
      return (res as { data?: PurchaseRequestDto }).data ?? (res as PurchaseRequestDto)
    },
    enabled: Boolean(requestId),
  })
}

/**
 * F8: GET /api/v1/purchase-requests/{requestId}/history
 */
export function usePurchaseRequestHistory(requestId?: string) {
  return useQuery({
    queryKey: purchaseRequestKeys.history(requestId ?? ''),
    queryFn: async () => {
      if (!requestId) return []
      const res = await api<{ data?: StateChangeDto[] } | StateChangeDto[]>(
        `/api/v1/purchase-requests/${requestId}/history`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
    enabled: Boolean(requestId),
  })
}

export function usePurchaseRecords() {
  return useQuery({
    queryKey: purchaseRecordKeys.all,
    queryFn: () => api<PurchaseRecord[]>('/purchaseRecords'),
  })
}

function usePurchaseMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: purchaseRequestKeys.all })
      void qc.invalidateQueries({ queryKey: purchaseRecordKeys.all })
      void qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

/**
 * F2: POST /api/v1/purchase-requests (tạo yêu cầu mua ở trạng thái DRAFT)
 */
export function useCreatePurchaseRequest() {
  return usePurchaseMutation(async (data: CreatePurchaseRequestPayload) => {
    return api<{ data: PurchaseRequestDto }>('/api/v1/purchase-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  })
}

/**
 * F4: PATCH /api/v1/purchase-requests/{requestId} (chỉnh sửa khi DRAFT, items thay thế toàn bộ dòng)
 */
export function useUpdatePurchaseRequest() {
  return usePurchaseMutation(
    async ({ requestId, payload }: { requestId: string; payload: UpdatePurchaseRequestPayload }) => {
      return api<{ data: PurchaseRequestDto }>(`/api/v1/purchase-requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    },
  )
}

/**
 * F5: POST /api/v1/purchase-requests/{requestId}/submit (gửi duyệt, version)
 */
export function useSendForApproval() {
  return usePurchaseMutation(async ({ requestId, version }: { requestId: string; version?: number }) => {
    return api<{ data: PurchaseRequestDto }>(`/api/v1/purchase-requests/${requestId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    })
  })
}

/**
 * F6: POST /api/v1/purchase-requests/{requestId}/approve (LEADER duyệt)
 */
export function useApproveRequest() {
  return usePurchaseMutation(
    async ({ requestId, version, note }: { requestId: string; version?: number; note?: string | null }) => {
      return api<{ data: PurchaseRequestDto }>(`/api/v1/purchase-requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ version, note: note || null }),
      })
    },
  )
}

export function useMockApproveRequest() {
  return usePurchaseMutation((id: string) =>
    api<PurchaseRequest>(`/purchaseRequests/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) }),
  )
}

export function useRejectRequest() {
  return usePurchaseMutation(
    async ({ requestId, version, reason }: { requestId: string; version?: number; reason: string }) => {
      return api<{ data: PurchaseRequestDto }>(`/api/v1/purchase-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ version, reason }),
      })
    },
  )
}

export function useMockRejectRequest() {
  return usePurchaseMutation(({ id, reason }: { id: string; reason: string }) =>
    api<PurchaseRequest>(`/purchaseRequests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'REJECTED', rejectReason: reason }),
    }),
  )
}

export interface NewPurchaseRecord {
  requestId: string
  materialId: string
  qty: number
  cost: number
  supplier: string
  date: string
  receiptPhoto?: string
  confirmed: boolean
  buyerId: string
}

export function useCreatePurchaseRecord() {
  return usePurchaseMutation(async (vars: NewPurchaseRecord) => {
    const record = await api<PurchaseRecord>('/purchaseRecords', {
      method: 'POST',
      body: JSON.stringify(vars),
    })
    const m = await api<Material>(`/api/v1/materials/${vars.materialId}`)
    await api<Material>(`/api/v1/materials/${vars.materialId}`, {
      method: 'PATCH',
      body: JSON.stringify({ purchased: m.purchased + vars.qty }),
    })
    return record
  })
}

export function useConfirmPurchase() {
  return usePurchaseMutation((recordId: string) =>
    api<PurchaseRecord>(`/purchaseRecords/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ confirmed: true }),
    }),
  )
}
