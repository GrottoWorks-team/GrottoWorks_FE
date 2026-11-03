// Purchases domain — PurchaseRequest (API Contract v1.3 /api/v1/purchase-requests) + PurchaseRecord
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { materialKeys } from '@/features/materials/api'
import type { PurchaseRecord } from '@/types'

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

export interface PurchaseItemDto {
  id: string
  purchaseRequestItemId: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  purchasedQuantity: number
  unitPrice: MoneyDto
  totalPrice: MoneyDto
  receivedUsableQuantity?: number | null
  receivedUnusableQuantity?: number | null
}

export type PurchaseStatusType = 'SUBMITTED' | 'NEEDS_INFO' | 'CONFIRMED' | 'CANCELLED'

/** Một lần mua thực tế của buyer (`PurchaseDto`) — kho CHƯA tăng cho tới khi MO xác nhận giao. */
export interface PurchaseDto {
  id: string
  purchaseRequestId: string
  taskId: string
  buyerUserId: string
  supplierName?: string | null
  purchaseDate: string
  totalCost: MoneyDto
  status: PurchaseStatusType
  costOverrun?: boolean | null
  costOverrunApprovedBy?: string | null
  costOverrunApprovedAt?: string | null
  confirmedBy?: string | null
  confirmedAt?: string | null
  receiptFileIds: string[]
  infoRequestReason?: string | null
  items: PurchaseItemDto[]
  version: number
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
  /** Chỉ có khi gọi chi tiết (`GET /purchase-requests/{id}`). */
  purchases?: PurchaseDto[] | null
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
      // BE mặc định size=20 (QueryReader) — trang danh sách/đếm trạng thái cần
      // toàn bộ đơn của mùa nên xin tối đa 100 (BE chặn size > 100 bằng 400).
      sp.set('size', String(filter?.size ?? 100))
      if (filter?.page) sp.set('page', String(filter.page))
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
 * Mock query cho các luồng cũ — đã bỏ; PurchaseConfirmPage dùng dữ liệu thật từ
 * `GET /purchase-requests` + chi tiết (field `purchases`).
 */

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

/**
 * BE không có endpoint liệt kê purchase record rời; dữ liệu mua nằm trong
 * `GET /purchase-requests/{id}` (field `purchases`). Giữ hook trả rỗng để các
 * màn hình cũ không gọi path legacy.
 */
export function usePurchaseRecords() {
  return useQuery({
    queryKey: purchaseRecordKeys.all,
    queryFn: async (): Promise<PurchaseRecord[]> => [],
    staleTime: Infinity,
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

/**
 * F10: POST /api/v1/purchases/{purchaseId}/confirm-delivery (MO) — nhập kho phần usable.
 */
export function useConfirmPurchaseDelivery() {
  return usePurchaseMutation(
    ({
      purchaseId,
      version,
      items,
    }: {
      purchaseId: string
      version: number
      items: { purchaseItemId: string; receivedUsableQuantity: number; receivedUnusableQuantity: number }[]
    }) =>
      api<{ data: PurchaseDto }>(`/api/v1/purchases/${purchaseId}/confirm-delivery`, {
        method: 'POST',
        body: JSON.stringify({ version, items }),
      }),
  )
}

/** MO yêu cầu bổ sung thông tin/hóa đơn của lần mua. */
export function useRequestPurchaseInfo() {
  return usePurchaseMutation(
    ({ purchaseId, version, reason }: { purchaseId: string; version: number; reason: string }) =>
      api<{ data: PurchaseDto }>(`/api/v1/purchases/${purchaseId}/request-info`, {
        method: 'POST',
        body: JSON.stringify({ version, reason }),
      }),
  )
}

/** LEADER duyệt chi phí vượt dự toán trước khi MO xác nhận giao. */
export function useApproveCostOverrun() {
  return usePurchaseMutation(
    ({ purchaseId, version, note }: { purchaseId: string; version: number; note?: string | null }) =>
      api<{ data: PurchaseDto }>(`/api/v1/purchases/${purchaseId}/approve-cost-overrun`, {
        method: 'POST',
        body: JSON.stringify({ version, note: note || null }),
      }),
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

/** @deprecated BE không có /purchaseRecords; buyer ghi mua qua `POST /purchase-requests/{id}/purchases`. */
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
