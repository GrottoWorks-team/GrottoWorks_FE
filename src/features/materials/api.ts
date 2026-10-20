// Materials domain — query key ['materials']. Lọc theo khu ở client
// (select) — mock trả nguyên mảng, không cần endpoint theo khu.
// POST/PATCH materials: handler tự tính lại received + status
// (received = existing + purchased + donatedReceived) — client chỉ gửi
// field nhập tay.
// Bổ sung C1..C6: Resource Catalog (categories + materials) nối BE thật.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
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
}

export interface UpdateMaterialCatalogPayload {
  categoryId?: string
  name?: string | null
  unit?: string | null
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
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

export const materialKeys = {
  all: ['materials'] as const,
  categories: (status?: string) => ['material-categories', status] as const,
  catalog: (params?: Record<string, unknown>) => ['materials-catalog', params] as const,
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
      return api<PagedResult<MaterialCatalogItemDto>>(`/api/v1/materials${qs}`)
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

export function useMaterials(areaId?: string) {
  return useQuery({
    queryKey: materialKeys.all,
    queryFn: () => api<Material[]>('/materials'),
    select: areaId ? (ms) => ms.filter((m) => m.areaId === areaId) : undefined,
  })
}

function useMaterialMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: materialKeys.all }),
  })
}

export function useCreateMaterial() {
  return useMaterialMutation((data: Omit<Material, 'id' | 'received' | 'status'>) =>
    api<Material>('/materials', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateMaterial() {
  return useMaterialMutation(
    ({ id, ...data }: Partial<Omit<Material, 'id' | 'received' | 'status'>> & { id: string }) =>
      api<Material>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}
