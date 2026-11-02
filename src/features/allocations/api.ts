// Phân bổ vật tư domain — query key ['allocations'].
// Kết nối GET /api/v1/material-allocations và POST /api/v1/material-allocations
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Allocation, Material } from '@/types'

export interface AllocationFilterParams {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  taskId?: string
  materialId?: string
}

export interface CreateAllocationLinePayload {
  materialId: string
  quantity: number
}

export interface CreateAllocationPayload {
  workAreaId: string
  taskId?: string
  items: CreateAllocationLinePayload[]
  allocationDate?: string
  note?: string
}

export const allocationKeys = {
  all: ['allocations'] as const,
  list: (filter?: AllocationFilterParams) => ['allocations', 'list', filter] as const,
}

export function useAllocations(filter?: AllocationFilterParams) {
  return useQuery({
    queryKey: allocationKeys.list(filter),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filter?.page) sp.set('page', String(filter.page))
      if (filter?.size) sp.set('size', String(filter.size))
      if (filter?.seasonId) sp.set('seasonId', filter.seasonId)
      if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
      if (filter?.taskId) sp.set('taskId', filter.taskId)
      if (filter?.materialId) sp.set('materialId', filter.materialId)
      const qs = sp.toString()
      const res = await api<{ data?: Allocation[] } | Allocation[]>(
        `/api/v1/material-allocations${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAllocationPayload) =>
      api<Allocation>('/api/v1/material-allocations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: allocationKeys.all }),
  })
}

// Map materialId → số còn khả dụng để phân bổ (hỗ trợ backward compatibility).
export function availableMap(
  materials: Material[],
  allocations: Allocation[],
): Record<string, number> {
  const allocated: Record<string, number> = {}
  for (const a of allocations) {
    if (a.items && Array.isArray(a.items)) {
      for (const it of a.items) {
        allocated[it.materialId] = (allocated[it.materialId] ?? 0) + it.allocatedQuantity
      }
    } else if (a.materialId && a.qty) {
      allocated[a.materialId] = (allocated[a.materialId] ?? 0) + a.qty
    }
  }
  return Object.fromEntries(
    materials.map((m) => [m.id, Math.max(0, m.received - (allocated[m.id] ?? 0))]),
  )
}
