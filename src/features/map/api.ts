// API hooks cho Bản đồ mặt bằng giáo xứ.
//
// ⚠️ TẠM THỜI (FE-only): BE chưa có endpoint `/parishMaps` và chưa có API cập
// nhật toạ độ work area → metadata bản đồ + toạ độ ghim khu lưu ở localStorage
// qua `localStore`. Ảnh mặt bằng vẫn nằm ở IndexedDB (`lib/blobStore.ts`).
// Khi BE bổ sung endpoint: thay `mapStore.*` bằng `api(...)` (giữ hook surface).
//
// Mọi hook nhận `parishId` vì ADMIN quản lý nhiều giáo xứ — mỗi giáo xứ có
// bản đồ + ghim riêng. Không truyền → rơi về giáo xứ trong hồ sơ người dùng.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import type { ParishMap } from '@/types'
import { api } from '@/lib/api'
import { mapStore } from './localStore'
import type { MapPin } from './localStore'

export const mapKeys = {
  /** `['parishMaps', parishId]` */
  parish: (parishId: string) => ['parishMaps', parishId] as const,
  /** `['parishMapPins', parishId]` */
  pins: (parishId: string) => ['parishMapPins', parishId] as const,
}

/** Giáo xứ đang xét: tham số truyền vào, hoặc giáo xứ trong hồ sơ (COMMUNITY/LEADER/MO). */
function useScopeParishId(parishId?: string): string {
  const { user } = useAuth()
  return parishId ?? user?.parishId ?? ''
}

/** Bản đồ mặt bằng hiện tại của giáo xứ (nếu đã tải lên). */
export function useParishMap(parishId?: string) {
  const scopeId = useScopeParishId(parishId)
  return useQuery({
    queryKey: mapKeys.parish(scopeId),
    queryFn: async (): Promise<ParishMap | null> => {
      const map = await api<{ imageFileId: string | null; fileName: string | null; updatedAt: string | null }>(
        `/api/v1/parishes/${scopeId}/map`,
      ).catch(() => null)
      if (!map?.imageFileId) return null
      return {
        id: `pm-${scopeId}`,
        imageKey: map.imageFileId,
        fileName: map.fileName ?? undefined,
        updatedAt: map.updatedAt ?? new Date().toISOString(),
      }
    },
    enabled: Boolean(scopeId),
  })
}

/** Lưu ảnh mặt bằng (một bản ghi/giáo xứ). */
export function useSaveParishMap(parishId?: string) {
  const qc = useQueryClient()
  const scopeId = useScopeParishId(parishId)
  return useMutation({
    mutationFn: async (data: { id?: string; imageKey: string; fileName?: string }) => {
      const saved = await api<{ imageFileId: string | null; fileName: string | null; updatedAt: string | null }>(
        `/api/v1/parishes/${scopeId}/map`,
        { method: 'PUT', body: JSON.stringify({ fileId: data.imageKey, fileName: data.fileName ?? '' }) },
      )
      if (!saved.imageFileId) throw new Error('Không lưu được bản đồ giáo xứ')
      mapStore.removeMap(scopeId)
      return {
        id: data.id ?? `pm-${scopeId}`,
        imageKey: saved.imageFileId,
        fileName: saved.fileName ?? data.fileName,
        updatedAt: saved.updatedAt ?? new Date().toISOString(),
      } satisfies ParishMap
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: mapKeys.parish(scopeId) }),
  })
}

/** Toạ độ ghim khu trên bản đồ: `areaId → { x, y }`. */
export function useMapPins(parishId?: string) {
  const scopeId = useScopeParishId(parishId)
  return useQuery({
    queryKey: mapKeys.pins(scopeId),
    queryFn: async (): Promise<Record<string, MapPin>> => mapStore.listPins(scopeId),
    enabled: Boolean(scopeId),
  })
}

/** Ghim (`{x,y}`) hoặc bỏ ghim (`null`) một khu. */
export function useSetMapPin(parishId?: string) {
  const qc = useQueryClient()
  const scopeId = useScopeParishId(parishId)
  return useMutation({
    mutationFn: async ({ areaId, pin }: { areaId: string; pin: MapPin | null }) =>
      mapStore.setPin(scopeId, areaId, pin),
    onSuccess: () => void qc.invalidateQueries({ queryKey: mapKeys.pins(scopeId) }),
  })
}
