// Đồ mượn — BE Resource `BorrowedItem`:
//   volunteer chào cho mượn → POST /api/v1/loan-offers (app mobile)
//   MO nhận/từ chối chào     → POST /loan-offers/{id}/accept|reject
//   MO ghi nhận đã nhận đồ   → POST /borrowed-items/{id}/issue
//   MO ghi trả / sự cố       → POST /borrowed-items/{id}/return|incidents
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { BorrowedItem, BorrowedItemStatus, ReturnCondition } from '@/types'

export const borrowedKeys = {
  offers: (status: string) => ['borrowed', 'offers', status] as const,
  items: (status: string) => ['borrowed', 'items', status] as const,
}

export function useLoanOffers(status: BorrowedItemStatus = 'OFFERED') {
  return useQuery({
    queryKey: borrowedKeys.offers(status),
    queryFn: async () => {
      const res = await apiPaged<BorrowedItem>(`/api/v1/loan-offers?status=${status}&size=100`)
      return res.data
    },
  })
}

export function useBorrowedItems(status?: BorrowedItemStatus) {
  return useQuery({
    queryKey: borrowedKeys.items(status ?? 'ALL'),
    queryFn: async () => {
      const qs = status ? `?status=${status}&size=100` : '?size=100'
      const res = await apiPaged<BorrowedItem>(`/api/v1/borrowed-items${qs}`)
      return res.data
    },
  })
}

/** GET /api/v1/borrowed-items/overdue — đồ mượn quá hạn trả (MO).
 *  Endpoint không nhận `size` (chỉ `date` / `withinDays`) → gọi không query. */
export function useOverdueBorrowedItems() {
  return useQuery({
    queryKey: ['borrowed', 'overdue'] as const,
    queryFn: async () => {
      const res = await api<BorrowedItem[] | { data?: BorrowedItem[] }>(
        '/api/v1/borrowed-items/overdue',
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    retry: false,
  })
}

/** PUT /api/v1/borrowed-items/{itemId}/assignment — chuyển đồ mượn sang khu/việc khác (MO). */
export function useAssignBorrowedItem() {
  return useBorrowedMutation(
    ({
      itemId,
      version,
      workAreaId,
      taskId,
    }: {
      itemId: string
      version: number
      workAreaId: string
      taskId?: string | null
    }) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/assignment`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, workAreaId, taskId: taskId || null }),
      }),
  )
}

function useBorrowedMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['borrowed'] }),
  })
}

export function useAcceptLoanOffer() {
  return useBorrowedMutation(
    ({
      offerId,
      version,
      workAreaId,
      expectedReturnDate,
    }: {
      offerId: string
      version: number
      workAreaId?: string
      expectedReturnDate?: string
    }) =>
      api<BorrowedItem>(`/api/v1/loan-offers/${offerId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ version, workAreaId, expectedReturnDate }),
      }),
  )
}

export function useRejectLoanOffer() {
  return useBorrowedMutation(
    ({ offerId, version, reason }: { offerId: string; version: number; reason: string }) =>
      api<BorrowedItem>(`/api/v1/loan-offers/${offerId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ version, reason }),
      }),
  )
}

export function useIssueBorrowedItem() {
  return useBorrowedMutation(
    ({ itemId, borrowDate, note }: { itemId: string; borrowDate?: string; note?: string }) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/issue`, {
        method: 'POST',
        body: JSON.stringify({ borrowDate, note: note || null }),
      }),
  )
}

export function useReturnBorrowedItem() {
  return useBorrowedMutation(
    ({
      itemId,
      condition,
      returnedQuantity,
      returnDate,
      note,
    }: {
      itemId: string
      condition: ReturnCondition
      returnedQuantity?: number
      returnDate?: string
      note?: string
    }) =>
      api<BorrowedItem>(`/api/v1/borrowed-items/${itemId}/return`, {
        method: 'POST',
        body: JSON.stringify({ condition, returnedQuantity, returnDate, note: note || null }),
      }),
  )
}

export function useBorrowedIncident() {
  return useBorrowedMutation(
    ({
      itemId,
      condition,
      quantity,
      description,
      date,
    }: {
      itemId: string
      condition: ReturnCondition
      quantity?: number
      description: string
      date?: string
    }) =>
      api<unknown>(`/api/v1/borrowed-items/${itemId}/incidents`, {
        method: 'POST',
        body: JSON.stringify({ condition, quantity, description, date }),
      }),
  )
}