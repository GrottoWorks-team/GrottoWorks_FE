// API hooks cho Bản đồ mặt bằng giáo xứ.
//
// Mock: ảnh mặt bằng nằm ở IndexedDB (lib/blobStore), metadata (imageKey) đi
// qua MSW dưới resource `parishMaps` (một bản ghi/giáo xứ). Toạ độ từng khu
// lưu ngay trên WorkArea (mapX/mapY) — dùng useUpdateArea của domain areas.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ParishMap } from '@/types'

export const mapKeys = {
  parish: ['parishMaps'] as const,
}

/** Bản đồ mặt bằng hiện tại của giáo xứ (nếu đã tải lên). */
export function useParishMap() {
  return useQuery({
    queryKey: mapKeys.parish,
    queryFn: () => api<ParishMap[]>('/parishMaps'),
    select: (list) => (list ?? [])[0],
  })
}

/**
 * Lưu bản đồ: PATCH khi đã có bản ghi, POST khi tải lên lần đầu.
 * Trả về bản ghi ParishMap sau khi lưu.
 */
export function useSaveParishMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { id?: string; imageKey: string; fileName?: string }) => {
      const updatedAt = new Date().toISOString()
      const body = JSON.stringify({ imageKey: data.imageKey, fileName: data.fileName, updatedAt })
      return data.id
        ? api<ParishMap>(`/parishMaps/${data.id}`, { method: 'PATCH', body })
        : api<ParishMap>('/parishMaps', { method: 'POST', body })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: mapKeys.parish }),
  })
}
