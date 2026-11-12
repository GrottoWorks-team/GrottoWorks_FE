import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  BorrowedItem,
  BorrowedItemStatus,
  ReturnCondition,
  BorrowedItemIncidentRequest,
} from '@/types'

export interface BorrowedItemFilterParams {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  status?: BorrowedItemStatus
  overdue?: boolean
}

export interface ReturnBorrowedItemPayload {
  itemId: string
  version?: number
  returnDate?: string
  condition: ReturnCondition
  returnedQuantity?: number
  note?: string
}

export interface AcceptLoanOfferPayload {
  offerId: string
  version?: number
  workAreaId?: string
  expectedReturnDate?: string
}

export interface RejectLoanOfferPayload {
  offerId: string
  version?: number
  reason?: string
}

export interface IssueBorrowedItemPayload {
  itemId: string
  version?: number
  borrowDate?: string
  note?: string
}

export interface AssignBorrowedItemPayload {
  itemId: string
  version?: number
  workAreaId: string
  taskId?: string
}

export const borrowedKeys = {
  all: ['borrowedItems'] as const,
  list: (filter?: BorrowedItemFilterParams) => ['borrowedItems', 'list', filter] as const,
  overdue: () => ['borrowedItems', 'overdue'] as const,
  offers: (params?: { page?: number; size?: number; seasonId?: string }) => ['borrowedItems', 'offers', params] as const,
  detail: (id: string) => ['borrowedItems', 'detail', id] as const,
}

export function useBorrowedItems(filter?: BorrowedItemFilterParams) {
  return useQuery({
    queryKey: borrowedKeys.list(filter),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filter?.page) sp.set('page', String(filter.page))
      if (filter?.size) sp.set('size', String(filter.size))
      if (filter?.seasonId) sp.set('seasonId', filter.seasonId)
      if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
      if (filter?.status) sp.set('status', filter.status)
      if (filter?.overdue !== undefined) sp.set('overdue', String(filter.overdue))
      const qs = sp.toString()
      const res = await api<{ data?: BorrowedItem[] } | BorrowedItem[]>(
        `/api/v1/borrowed-items${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useOverdueBorrowedItems() {
  return useQuery({
    queryKey: borrowedKeys.overdue(),
    queryFn: async () => {
      const res = await api<{ data?: BorrowedItem[] } | BorrowedItem[]>(
        '/api/v1/borrowed-items/overdue',
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useLoanOffers(params?: { page?: number; size?: number; seasonId?: string }) {
  return useQuery({
    queryKey: borrowedKeys.offers(params),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params?.page) sp.set('page', String(params.page))
      if (params?.size) sp.set('size', String(params.size))
      if (params?.seasonId) sp.set('seasonId', params.seasonId)
      const qs = sp.toString()
      const res = await api<{ data?: BorrowedItem[] } | BorrowedItem[]>(
        `/api/v1/loan-offers${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useAcceptLoanOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ offerId, ...body }: AcceptLoanOfferPayload) =>
      api<BorrowedItem>(`/api/v1/loan-offers/${offerId}/accept`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

export function useRejectLoanOffer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ offerId, ...body }: RejectLoanOfferPayload) =>
      api<BorrowedItem>(`/api/v1/loan-offers/${offerId}/reject`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

export function useIssueBorrowedItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, ...body }: IssueBorrowedItemPayload) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/issue`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

export function useReturnBorrowedItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, ...body }: ReturnBorrowedItemPayload) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/return`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

export function useAssignBorrowedItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, ...body }: AssignBorrowedItemPayload) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/assignment`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

// ══════ [fe-api-gap-2] Báo cáo sự cố đồ mượn (Đợt I) ══════

/** Báo cáo sự cố hỏng hóc hoặc thất thoát đồ mượn (POST /api/v1/borrowed-items/{id}/incidents) */
export async function recordBorrowedIncident(
  itemId: string,
  payload: BorrowedItemIncidentRequest,
): Promise<void> {
  await api(`/api/v1/borrowed-items/${itemId}/incidents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function useRecordBorrowedIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string
      payload: BorrowedItemIncidentRequest
    }) => recordBorrowedIncident(itemId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

