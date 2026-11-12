// Materials domain — query key ['materials']. BE trả danh mục phẳng;
// lọc theo khu ở client (select).
// POST/PATCH materials: handler tự tính lại received + status
// (received = existing + purchased + donatedReceived) — client chỉ gửi
// field nhập tay.
// Bổ sung C1..C6: Resource Catalog (categories + materials) nối BE thật.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { Material } from '@/types'

export interface MaterialCategoryDto {
  id: string
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export interface MaterialCatalogItemDto {
  id: string
  categoryId: string
  code: string
  name: string
  unit: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  /** Thông số kỹ thuật hiển thị cho người đi mua. */
  specification?: string | null
  /** Nhà cung cấp quen — text tự do. */
  supplierName?: string | null
  /** Đơn giá tham khảo (VND) theo đơn vị tính. */
  referenceUnitPrice?: number | null
  /** Mức tồn kho tối thiểu để gợi ý mua thêm. */
  minimumStock?: number | null
}

export interface CreateMaterialCategoryPayload {
  code: string
  name: string
  description?: string | null
}

export interface UpdateMaterialCategoryPayload {
  name?: string | null
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface CreateMaterialCatalogPayload {
  categoryId: string
  code: string
  name: string
  unit: string
  description?: string | null
  specification?: string | null
  supplierName?: string | null
  referenceUnitPrice?: number | null
  minimumStock?: number | null
}

export interface UpdateMaterialCatalogPayload {
  categoryId?: string
  name?: string | null
  unit?: string | null
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
  specification?: string | null
  supplierName?: string | null
  referenceUnitPrice?: number | null
  minimumStock?: number | null
}

export interface PagedResult<T> {
  data: T[]
  page: {
    page: number
    size: number
    totalItems: number
    totalPages: number
  }
}

export interface InventoryBalanceDto {
  workAreaId: string
  workAreaName: string
  seasonId: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  required: number
  confirmedAvailable: number
  allocated: number
  unallocated: number
  shortage: number
}

export type TransactionType =
  | 'OPENING_STOCK'
  | 'PURCHASE_DELIVERY'
  | 'DONATION_RECEIPT'
  | 'TASK_RETURN'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_DAMAGED'
  | 'ADJUSTMENT_LOST'
  | 'ADJUSTMENT_DISPOSED'

export interface InventoryTransactionDto {
  id: string
  workAreaId: string
  materialId: string
  transactionType: TransactionType
  quantity: number
  transactionDate: string
  referenceType: string | null
  referenceId: string | null
  createdByUserId: string | null
  note: string | null
}

export interface OpeningStockPayload {
  workAreaId: string
  materialId: string
  quantity: number
  transactionDate?: string | null
  note?: string | null
}

export interface MaterialRequirementDto {
  id: string
  workAreaId: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  requiredQuantity: number
  existingQuantity: number
  status: 'ACTIVE' | 'CANCELLED'
  note: string | null
  version: number
}

export interface MaterialShortageDto {
  workAreaId: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  required: number
  confirmedAvailable: number
  allocated: number
  unallocated: number
  shortage: number
}

export interface MaterialNeedDto {
  workAreaId: string
  workAreaName: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  required: number
  shortage: number
}

export interface CreateMaterialRequirementPayload {
  materialId: string
  requiredQuantity: number
  existingQuantity?: number | null
  note?: string | null
}

export interface UpdateMaterialRequirementPayload {
  version?: number | null
  requiredQuantity?: number | null
  existingQuantity?: number | null
  note?: string | null
  status?: 'ACTIVE' | 'CANCELLED' | null
}

export const materialKeys = {
  all: ['materials'] as const,
  categories: (status?: string) => ['material-categories', status] as const,
  catalog: (params?: Record<string, unknown>) => ['materials-catalog', params] as const,
  inventory: (params?: Record<string, unknown>) => ['inventory', params] as const,
  history: (materialId: string, params?: Record<string, unknown>) => ['material-history', materialId, params] as const,
  requirements: (workAreaId: string, status?: string) => ['material-requirements', workAreaId, status] as const,
  shortages: (workAreaId: string) => ['work-area-shortages', workAreaId] as const,
  needs: (seasonId: string, params?: Record<string, unknown>) => ['season-material-needs', seasonId, params] as const,
}

/** E1: GET /api/v1/work-areas/{workAreaId}/material-requirements */
export function useWorkAreaRequirements(workAreaId?: string, status?: 'ACTIVE' | 'CANCELLED') {
  return useQuery({
    queryKey: materialKeys.requirements(workAreaId || '', status),
    queryFn: async () => {
      if (!workAreaId) return []
      const qs = status ? `?status=${status}` : ''
      const res = await api<any>(`/api/v1/work-areas/${workAreaId}/material-requirements${qs}`)
      return (Array.isArray(res) ? res : res?.data || []) as MaterialRequirementDto[]
    },
    enabled: Boolean(workAreaId),
  })
}

/** E4: GET /api/v1/work-areas/{workAreaId}/shortages */
export function useWorkAreaShortages(workAreaId?: string) {
  return useQuery({
    queryKey: materialKeys.shortages(workAreaId || ''),
    queryFn: async () => {
      if (!workAreaId) return []
      const res = await api<any>(`/api/v1/work-areas/${workAreaId}/shortages`)
      return (Array.isArray(res) ? res : res?.data || []) as MaterialShortageDto[]
    },
    enabled: Boolean(workAreaId),
  })
}

/** E5: GET /api/v1/seasons/{seasonId}/material-needs */
export function useSeasonMaterialNeeds(
  seasonId?: string,
  params?: {
    page?: number
    size?: number
    workAreaId?: string
    materialId?: string
  },
) {
  return useQuery({
    queryKey: materialKeys.needs(seasonId || '', params as Record<string, unknown>),
    queryFn: async () => {
      if (!seasonId) {
        return {
          data: [],
          page: { page: 1, size: params?.size ?? 20, totalItems: 0, totalPages: 1 },
        }
      }
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.size) q.set('size', String(params.size))
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params?.materialId) q.set('materialId', params.materialId)
      const qs = q.toString()
      // apiPaged giữ `page` của BE: trước đây api() bóc mất meta nên totalItems
      // bị lấy bằng độ dài trang hiện tại → không bao giờ sang được trang 2.
      const res = await apiPaged<MaterialNeedDto>(
        `/api/v1/seasons/${seasonId}/material-needs${qs ? `?${qs}` : ''}`,
      )
      return {
        data: res.data,
        page: res.page ?? {
          page: params?.page ?? 1,
          size: params?.size ?? 20,
          totalItems: res.data.length,
          totalPages: 1,
        },
      }
    },
    enabled: Boolean(seasonId),
  })
}

/** E2: POST /api/v1/work-areas/{workAreaId}/material-requirements (MO) */
export function useCreateMaterialRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workAreaId,
      ...data
    }: CreateMaterialRequirementPayload & { workAreaId: string }) =>
      api<{ data: MaterialRequirementDto }>(
        `/api/v1/work-areas/${workAreaId}/material-requirements`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['material-requirements', vars.workAreaId] })
      qc.invalidateQueries({ queryKey: ['work-area-shortages', vars.workAreaId] })
      qc.invalidateQueries({ queryKey: ['season-material-needs'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

/** E3: PATCH /api/v1/material-requirements/{requirementId} (MO) */
export function useUpdateMaterialRequirement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      requirementId,
      workAreaId: _waId,
      ...data
    }: UpdateMaterialRequirementPayload & { requirementId: string; workAreaId?: string }) =>
      api<{ data: MaterialRequirementDto }>(
        `/api/v1/material-requirements/${requirementId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        },
      ),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['material-requirements'] })
      if (vars.workAreaId) {
        qc.invalidateQueries({ queryKey: ['work-area-shortages', vars.workAreaId] })
      }
      qc.invalidateQueries({ queryKey: ['season-material-needs'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

/** D2: GET /api/v1/inventory (PARISH, LEADER, MO) */
export function useInventory(params?: {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  materialId?: string
  onlyShortage?: boolean
}) {
  return useQuery({
    queryKey: materialKeys.inventory(params as Record<string, unknown>),
    queryFn: async () => {
      const q = new URLSearchParams()
      if (params?.page) q.set('page', String(params.page))
      if (params?.size) q.set('size', String(params.size))
      if (params?.seasonId) q.set('seasonId', params.seasonId)
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params?.materialId) q.set('materialId', params.materialId)
      if (typeof params?.onlyShortage === 'boolean') {
        q.set('onlyShortage', String(params.onlyShortage))
      }
      const qs = q.toString()
      const res = await apiPaged<InventoryBalanceDto>(`/api/v1/inventory${qs ? `?${qs}` : ''}`)
      return {
        data: res.data,
        page: res.page ?? {
          page: params?.page ?? 1,
          size: params?.size ?? 20,
          totalItems: res.data.length,
          totalPages: 1,
        },
      }
    },
  })
}

/** D3: GET /api/v1/materials/{materialId}/allocation-history (PARISH, LEADER, MO) */
export function useMaterialHistory(
  materialId?: string,
  params?: {
    from?: string
    to?: string
    workAreaId?: string
  },
) {
  return useQuery({
    queryKey: materialKeys.history(materialId || '', params as Record<string, unknown>),
    queryFn: async () => {
      if (!materialId) return []
      const q = new URLSearchParams()
      if (params?.from) q.set('from', params.from)
      if (params?.to) q.set('to', params.to)
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      const qs = q.toString()
      const res = await api<{ data?: InventoryTransactionDto[] } | InventoryTransactionDto[]>(
        `/api/v1/materials/${materialId}/allocation-history${qs ? `?${qs}` : ''}`,
      )
      return Array.isArray(res) ? res : res.data || []
    },
    enabled: Boolean(materialId),
  })
}

/** D1: POST /api/v1/inventory/opening-stock (MO) */
export function useRecordOpeningStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: OpeningStockPayload) =>
      api<{ data: InventoryTransactionDto }>('/api/v1/inventory/opening-stock', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['material-history'] })
      qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

/** D1b: POST /api/v1/inventory-adjustments (MO) — ghi nhận hỏng / mất / thanh lý. */
export type InventoryAdjustmentKind = 'Damaged' | 'Lost' | 'Disposed'

export interface InventoryAdjustmentPayload {
  workAreaId: string
  materialId: string
  type: InventoryAdjustmentKind
  quantity: number
  reason: string
  transactionDate?: string
}

export function useAdjustInventory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InventoryAdjustmentPayload) =>
      api<{ data?: InventoryTransactionDto } | InventoryTransactionDto>(
        '/api/v1/inventory-adjustments',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['material-history'] })
      qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

/** C1: GET /api/v1/material-categories */
export function useMaterialCategories(status?: 'ACTIVE' | 'INACTIVE') {
  return useQuery({
    queryKey: materialKeys.categories(status),
    queryFn: async () => {
      const qs = status ? `?status=${status}` : ''
      return api<MaterialCategoryDto[]>(`/api/v1/material-categories${qs}`)
    },
  })
}

/** C2: POST /api/v1/material-categories */
export function useCreateMaterialCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMaterialCategoryPayload) =>
      api<{ data: MaterialCategoryDto }>('/api/v1/material-categories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-categories'] })
    },
  })
}

/** C3: PATCH /api/v1/material-categories/{categoryId} */
export function useUpdateMaterialCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, ...data }: UpdateMaterialCategoryPayload & { categoryId: string }) =>
      api<{ data: MaterialCategoryDto }>(`/api/v1/material-categories/${categoryId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-categories'] })
    },
  })
}

/** C4: GET /api/v1/materials (Catalog) */
export function useMaterialCatalog(params?: {
  page?: number
  size?: number
  categoryId?: string
  status?: 'ACTIVE' | 'INACTIVE'
  q?: string
  sort?: string
}) {
  return useQuery({
    queryKey: materialKeys.catalog(params),
    queryFn: async () => {
      const query = new URLSearchParams()
      if (params?.page) query.set('page', String(params.page))
      if (params?.size) query.set('size', String(params.size))
      if (params?.categoryId) query.set('categoryId', params.categoryId)
      if (params?.status) query.set('status', params.status)
      if (params?.q) query.set('q', params.q)
      if (params?.sort) query.set('sort', params.sort)
      const qs = query.toString() ? `?${query.toString()}` : ''
        const token = localStorage.getItem('grotto-token')
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`/api/v1/materials${qs}`, { headers })
        if (!res.ok) throw new Error('Không thể tải danh sách vật tư')
        return res.json() as Promise<PagedResult<MaterialCatalogItemDto>>
    },
  })
}

/** C5: POST /api/v1/materials (Catalog) */
export function useCreateMaterialCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMaterialCatalogPayload) =>
      api<{ data: MaterialCatalogItemDto }>('/api/v1/materials', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials-catalog'] })
      qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

/** C6: PATCH /api/v1/materials/{materialId} (Catalog) */
export function useUpdateMaterialCatalogItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ materialId, ...data }: UpdateMaterialCatalogPayload & { materialId: string }) =>
      api<{ data: MaterialCatalogItemDto }>(`/api/v1/materials/${materialId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials-catalog'] })
      qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

/**
 * Danh mục vật tư ở dạng `Material` cũ (màn task/allocation/… vẫn dùng type này).
 *
 * LƯU Ý HỢP ĐỒNG: `/api/v1/materials` là **catalog** (`MaterialDto`: id/categoryId/
 * code/name/unit/status) — KHÔNG có `areaId/required/purchased/received`. BE chưa có
 * endpoint riêng theo khu (đã dùng `material-requirements` + `shortages` ở nơi khác —
 * xem API-GAP-STATUS-2026-11-04.md §2.3),
 * nên các field số lượng để 0 thay vì `undefined` (trước đây gây `NaN` ở
 * `AllocationPage`/`PurchaseConfirmPage`). `areaId` bị bỏ qua vì BE không trả.
 */
export function useMaterials(_areaId?: string) {
  return useQuery({
    queryKey: materialKeys.all,
    queryFn: async () => {
      const res = await apiPaged<MaterialCatalogItemDto>('/api/v1/materials?size=100')
      return res.data.map<Material>((m) => ({
        id: m.id,
        areaId: '',
        name: m.name,
        unit: m.unit,
        required: 0,
        existing: 0,
        purchased: 0,
        donatedPledged: 0,
        donatedReceived: 0,
        received: 0,
        status: 'ENOUGH',
        estUnitPrice: 0,
      }))
    },
  })
}
