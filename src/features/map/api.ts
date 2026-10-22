// API hooks cho Bản đồ mặt bằng giáo xứ.
//
// ⚠️ TẠM THỜI (FE-only): BE chưa có endpoint `/parishMaps` và chưa có API cập
// nhật toạ độ work area → metadata bản đồ + toạ độ ghim khu lưu ở localStorage
// qua `localStore`. Ảnh mặt bằng vẫn nằm ở IndexedDB (`lib/blobStore.ts`).
// Khi BE bổ sung endpoint: thay `mapStore.*` bằng `api(...)` (giữ hook surface).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ParishMap } from '@/types'
import { mapStore } from './localStore'
import type { MapPin } from './localStore'

export const mapKeys = {
  parish: ['parishMaps'] as const,
  pins: ['parishMapPins'] as const,
}

/** Bản đồ mặt bằng hiện tại của giáo xứ (nếu đã tải lên). */
export function useParishMap() {
  return useQuery({
    queryKey: mapKeys.parish,
    // React Query v5 không nhận `undefined` → chưa có bản đồ thì trả `null`.
    queryFn: async (): Promise<ParishMap | null> => mapStore.getMap() ?? null,
  })
}

/** Lưu ảnh mặt bằng (một bản ghi/giáo xứ). */
export function useSaveParishMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { id?: string; imageKey: string; fileName?: string }) =>
      mapStore.saveMap({ imageKey: data.imageKey, fileName: data.fileName }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mapKeys.parish }),
  })
}

/** Toạ độ ghim khu trên bản đồ: `areaId → { x, y }`. */
export function useMapPins() {
  return useQuery({
    queryKey: mapKeys.pins,
    queryFn: async (): Promise<Record<string, MapPin>> => mapStore.listPins(),
  })
}

/** Ghim (`{x,y}`) hoặc bỏ ghim (`null`) một khu. */
export function useSetMapPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ areaId, pin }: { areaId: string; pin: MapPin | null }) =>
      mapStore.setPin(areaId, pin),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mapKeys.pins }),
  })
}
