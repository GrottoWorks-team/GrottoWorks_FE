// Materials domain — query key ['materials']. Lọc theo khu ở client
// (select) — mock trả nguyên mảng, không cần endpoint theo khu.
// POST/PATCH materials: handler tự tính lại received + status
// (received = existing + purchased + donatedReceived) — client chỉ gửi
// field nhập tay.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Material } from '@/types'

export const materialKeys = {
  all: ['materials'] as const,
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
