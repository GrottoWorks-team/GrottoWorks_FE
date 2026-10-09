// Phân bổ vật tư domain — query key ['allocations']. available = received −
// tổng đã phân bổ của vật tư (client tính, validate trước khi POST).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Allocation, Material } from '@/types'

export const allocationKeys = { all: ['allocations'] as const }

export function useAllocations() {
  return useQuery({
    queryKey: allocationKeys.all,
    queryFn: () => api<Allocation[]>('/allocations'),
  })
}

// Map materialId → số còn khả dụng để phân bổ.
export function availableMap(
  materials: Material[],
  allocations: Allocation[],
): Record<string, number> {
  const allocated: Record<string, number> = {}
  for (const a of allocations) allocated[a.materialId] = (allocated[a.materialId] ?? 0) + a.qty
  return Object.fromEntries(
    materials.map((m) => [m.id, Math.max(0, m.received - (allocated[m.id] ?? 0))]),
  )
}

// byUserId optional (pattern createdBy của useCreatePurchaseRequest): mock
// POST persist nguyên body — thiếu key thì ActivityLog suy actor 'u1'.
export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Allocation, 'id' | 'byUserId'> & { byUserId?: string }) =>
      api<Allocation>('/allocations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: allocationKeys.all }),
  })
}
