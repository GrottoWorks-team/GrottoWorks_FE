// Phân bổ vật tư — BE Resource `MaterialAllocation` (API Contract v1.3.2).
// Một phiếu gắn với Work Area nguồn (+ Task tùy chọn) và nhiều dòng vật tư.
// Số khả dụng lấy từ `GET /api/v1/inventory` (field `unallocated`), KHÔNG tự
// cộng trừ ở client — BE kiểm tra lại trong transaction và trả 409 nếu vượt.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { Allocation } from '@/types'

export const allocationKeys = { all: ['allocations'] as const }

export interface AllocationQuery {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  taskId?: string
  materialId?: string
}

export function useAllocations(params?: AllocationQuery) {
  return useQuery({
    queryKey: [...allocationKeys.all, params ?? {}],
    queryFn: async () => {
      const q = new URLSearchParams({ size: String(params?.size ?? 100) })
      if (params?.page) q.set('page', String(params.page))
      if (params?.seasonId) q.set('seasonId', params.seasonId)
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params?.taskId) q.set('taskId', params.taskId)
      if (params?.materialId) q.set('materialId', params.materialId)
      const res = await apiPaged<Allocation>(`/api/v1/material-allocations?${q.toString()}`)
      return res.data
    },
  })
}

export interface CreateAllocationInput {
  workAreaId: string
  taskId?: string
  items: { materialId: string; quantity: number }[]
  allocationDate?: string
  note?: string
}

/** POST /api/v1/material-allocations — 409 MATERIAL_INSUFFICIENT_AVAILABLE khi vượt `unallocated`. */
export function useCreateAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAllocationInput) =>
      api<Allocation>('/api/v1/material-allocations', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: allocationKeys.all })
      // Cấp phát làm giảm `unallocated` → làm mới tồn kho.
      void qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}
