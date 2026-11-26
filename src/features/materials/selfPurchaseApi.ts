// Vật tư "người khác tự mua" (26/11/2026): MO ghi nhận hàng mua ngoài luồng
// purchase request. BE: POST /api/v1/work-areas/{id}/self-purchases,
// GET /api/v1/self-purchases?workAreaId|seasonId. Kho khu tăng ngay; tiền +
// hoá đơn lưu riêng để báo cáo tài chính không lẫn với quyên góp.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface SelfPurchaseLineDto {
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface SelfPurchaseReceiptDto {
  id: string
  workAreaId: string
  seasonId: string
  buyerName: string
  supplierName?: string | null
  purchaseDate: string
  totalCost: number
  invoiceFileIds: string[]
  note?: string | null
  recordedBy: string
  createdAt: string
  items: SelfPurchaseLineDto[]
}

export interface SelfPurchaseFilter {
  workAreaId?: string
  seasonId?: string
  parishId?: string
  size?: number
}

export interface RecordSelfPurchaseInput {
  workAreaId: string
  buyerName: string
  supplierName?: string | null
  purchaseDate?: string | null
  items: { materialId: string; quantity: number; unitPrice: number }[]
  invoiceFileIds: string[]
  note?: string | null
}

function queryString(params: SelfPurchaseFilter): string {
  const search = new URLSearchParams()
  if (params.workAreaId) search.set('workAreaId', params.workAreaId)
  if (params.seasonId) search.set('seasonId', params.seasonId)
  if (params.parishId) search.set('parishId', params.parishId)
  if (params.size) search.set('size', String(params.size))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

const keys = {
  list: (params: SelfPurchaseFilter) => ['selfPurchases', params] as const,
}

export function useSelfPurchases(params: SelfPurchaseFilter, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api<SelfPurchaseReceiptDto[]>(`/api/v1/self-purchases${queryString(params)}`),
    enabled: options.enabled ?? Boolean(params.workAreaId || params.seasonId),
  })
}

export function useRecordSelfPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ workAreaId, ...body }: RecordSelfPurchaseInput) =>
      api<SelfPurchaseReceiptDto>(`/api/v1/work-areas/${workAreaId}/self-purchases`, {
        method: 'POST',
        body: JSON.stringify({
          buyerName: body.buyerName,
          supplierName: body.supplierName || null,
          purchaseDate: body.purchaseDate || null,
          items: body.items,
          invoices: body.invoiceFileIds.map((id) => ({ id })),
          note: body.note || null,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfPurchases'] })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      void qc.invalidateQueries({ queryKey: ['workAreaShortages'] })
    },
  })
}
