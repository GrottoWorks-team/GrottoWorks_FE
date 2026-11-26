// Parish warehouse (kho tổng giáo xứ) — Resource F-RES-21.
//   GET  /api/v1/parish-inventory            (PARISH, ADMIN đọc)
//   POST /api/v1/parish-inventory/opening-stock
//   POST /api/v1/parish-inventory-adjustments
//   GET  /api/v1/parish-inventory/history
//   GET  /api/v1/parish-distributions
//   POST /api/v1/parish-distributions
//   POST /api/v1/parish-distributions/{id}/confirm-receipt
//   POST /api/v1/parish-distributions/{id}/cancel
//   GET  /api/v1/parish-donors               (PARISH — donor picker for a donation into the warehouse)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { DonorDto } from '@/features/donors/api'

export type ParishTransactionType =
  | 'OPENING_STOCK'
  | 'PURCHASE_DELIVERY'
  | 'DONATION_RECEIPT'
  | 'DISTRIBUTION_OUT'
  | 'DISTRIBUTION_RETURN'
  | 'ADJUSTMENT_DAMAGED'
  | 'ADJUSTMENT_LOST'
  | 'ADJUSTMENT_DISPOSED'

export type ParishDistributionStatus = 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'
export type ParishDistributionOrigin = 'MANUAL' | 'PURCHASE'

export interface ParishInventoryBalanceDto {
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  confirmedAvailable: number
}

export interface ParishInventoryTransactionDto {
  id: string
  materialId: string
  transactionType: ParishTransactionType
  quantity: number
  transactionDate: string
  referenceType: string | null
  referenceId: string | null
  createdByUserId: string | null
  note: string | null
}

export interface ParishDistributionItemDto {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  issuedQuantity: number
  receivedUsableQuantity: number | null
  receivedUnusableQuantity: number | null
}

export interface ParishDistributionDto {
  id: string
  parishId: string
  seasonId: string
  targetWorkAreaId: string
  targetWorkAreaName: string
  status: ParishDistributionStatus
  origin: ParishDistributionOrigin
  issuedBy: string
  issuedAt: string
  receivedConfirmedBy: string | null
  receivedConfirmedAt: string | null
  note: string | null
  cancelReason: string | null
  items: ParishDistributionItemDto[]
  version: number
}

export interface ParishInventoryQuery {
  seasonId: string
  materialId?: string
  page?: number
  size?: number
  parishId?: string
}

export interface ParishDistributionQuery {
  seasonId?: string
  workAreaId?: string
  status?: ParishDistributionStatus
  page?: number
  size?: number
  parishId?: string
}

export interface ParishOpeningStockPayload {
  seasonId: string
  materialId: string
  quantity: number
  transactionDate?: string | null
  note?: string | null
}

export interface ParishAdjustmentPayload {
  seasonId: string
  materialId: string
  type: 'DAMAGED' | 'LOST' | 'DISPOSED'
  quantity: number
  reason: string
  transactionDate?: string | null
}

export interface ParishDistributionLinePayload {
  materialId: string
  quantity: number
}

export interface CreateParishDistributionPayload {
  seasonId: string
  targetWorkAreaId: string
  items: ParishDistributionLinePayload[]
  note?: string | null
}

/** 26/11/2026: biên lai "vật tư Ban phụ trách đã mua" nhập thẳng vào kho tổng. */
export interface ParishPurchaseItemDto {
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface ParishPurchaseReceiptDto {
  id: string
  seasonId: string
  buyerName: string
  supplierName: string | null
  purchaseDate: string
  totalCost: number
  invoiceFileIds: string[]
  note: string | null
  recordedBy: string
  createdAt: string
  items: ParishPurchaseItemDto[]
}

export interface RecordParishPurchasePayload {
  seasonId: string
  buyerName: string
  supplierName?: string | null
  purchaseDate?: string | null
  items: { materialId: string; quantity: number; unitPrice: number }[]
  invoiceFileIds: string[]
  note?: string | null
}

export interface ConfirmParishDistributionPayload {
  distributionId: string
  version: number
  items: { itemId: string; usableQuantity: number; unusableQuantity: number }[]
  note?: string | null
}

export const parishWarehouseKeys = {
  all: ['parish-warehouse'] as const,
  inventory: (params: Record<string, unknown>) => ['parish-warehouse', 'inventory', params] as const,
  history: (params: Record<string, unknown>) => ['parish-warehouse', 'history', params] as const,
  distributions: (params: Record<string, unknown>) => ['parish-warehouse', 'distributions', params] as const,
  purchases: (params: Record<string, unknown>) => ['parish-warehouse', 'purchases', params] as const,
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `?${qs}` : ''
}

export function useParishDonors(q?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['parish-donors', q ?? ''],
    queryFn: async () => {
      const res = await apiPaged<DonorDto>(`/api/v1/parish-donors${buildQuery({ size: 100, q })}`)
      return res.data
    },
    enabled: options.enabled ?? true,
  })
}

export function useParishInventory(params: ParishInventoryQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: parishWarehouseKeys.inventory(params as unknown as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiPaged<ParishInventoryBalanceDto>(
        `/api/v1/parish-inventory${buildQuery({
          seasonId: params.seasonId,
          materialId: params.materialId,
          page: params.page,
          size: params.size,
          parishId: params.parishId,
        })}`,
      )
      return {
        data: res.data,
        page: res.page ?? {
          page: params.page ?? 1,
          size: params.size ?? 20,
          totalItems: res.data.length,
          totalPages: 1,
        },
      }
    },
    enabled: (options.enabled ?? true) && Boolean(params.seasonId),
  })
}

export function useParishMaterialHistory(
  params: { seasonId: string; materialId: string; from?: string; to?: string },
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: parishWarehouseKeys.history(params as unknown as Record<string, unknown>),
    queryFn: async () => {
      const res = await api<ParishInventoryTransactionDto[] | { data?: ParishInventoryTransactionDto[] }>(
        `/api/v1/parish-inventory/history${buildQuery({
          seasonId: params.seasonId,
          materialId: params.materialId,
          from: params.from,
          to: params.to,
        })}`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: (options.enabled ?? true) && Boolean(params.seasonId && params.materialId),
  })
}

export function useRecordParishOpeningStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ParishOpeningStockPayload) =>
      api<{ data?: ParishInventoryTransactionDto } | ParishInventoryTransactionDto>(
        '/api/v1/parish-inventory/opening-stock',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
    },
  })
}

export function useAdjustParishInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ParishAdjustmentPayload) =>
      api<{ data?: ParishInventoryTransactionDto } | ParishInventoryTransactionDto>(
        '/api/v1/parish-inventory-adjustments',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
    },
  })
}

/** 26/11/2026: biên lai nhập vật tư Ban phụ trách đã mua (kèm hoá đơn) vào kho tổng. */
export function useParishPurchases(seasonId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: parishWarehouseKeys.purchases({ seasonId: seasonId ?? '' }),
    queryFn: async () => {
      const res = await api<ParishPurchaseReceiptDto[] | { data?: ParishPurchaseReceiptDto[] }>(
        `/api/v1/parish-inventory/purchases${buildQuery({ seasonId: seasonId ?? '', limit: 50 })}`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: (options.enabled ?? true) && Boolean(seasonId),
  })
}

export function useRecordParishPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecordParishPurchasePayload) =>
      api<{ data?: ParishPurchaseReceiptDto } | ParishPurchaseReceiptDto>(
        '/api/v1/parish-inventory/purchases',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
    },
  })
}

export function useParishDistributions(params: ParishDistributionQuery, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: parishWarehouseKeys.distributions(params as unknown as Record<string, unknown>),
    queryFn: async () => {
      const res = await apiPaged<ParishDistributionDto>(
        `/api/v1/parish-distributions${buildQuery({
          seasonId: params.seasonId,
          workAreaId: params.workAreaId,
          status: params.status,
          page: params.page,
          size: params.size,
          parishId: params.parishId,
        })}`,
      )
      return {
        data: res.data,
        page: res.page ?? {
          page: params.page ?? 1,
          size: params.size ?? 20,
          totalItems: res.data.length,
          totalPages: 1,
        },
      }
    },
    enabled: options.enabled ?? true,
  })
}

export function useCreateParishDistribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateParishDistributionPayload) =>
      api<{ data?: ParishDistributionDto } | ParishDistributionDto>('/api/v1/parish-distributions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
    },
  })
}

export function useConfirmParishDistribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ distributionId, version, items, note }: ConfirmParishDistributionPayload) =>
      api<{ data?: ParishDistributionDto } | ParishDistributionDto>(
        `/api/v1/parish-distributions/${distributionId}/confirm-receipt`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${version}"` },
          body: JSON.stringify({ version, items, note: note ?? null }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
      void qc.invalidateQueries({ queryKey: ['material-history'] })
    },
  })
}

export function useCancelParishDistribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ distributionId, version, reason }: { distributionId: string; version: number; reason: string }) =>
      api<{ data?: ParishDistributionDto } | ParishDistributionDto>(
        `/api/v1/parish-distributions/${distributionId}/cancel`,
        {
          method: 'POST',
          headers: { 'If-Match': `"${version}"` },
          body: JSON.stringify({ version, reason }),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: parishWarehouseKeys.all })
    },
  })
}
