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

/**
 * Toạ độ ghim khu trên bản đồ: `areaId → { x, y }`.
 * 26/11/2026: BE đã lưu ghim trong `WorkArea.mapX/mapY` nên chỉ cần suy ra từ danh sách khu vực
 * (localStorage chỉ còn dùng cho dữ liệu cũ/legacy).
 */
export function pinsOfAreas(areas: { id: string; mapX?: number; mapY?: number }[]): Record<string, MapPin> {
  const pins: Record<string, MapPin> = {}
  for (const area of areas) {
    if (typeof area.mapX === 'number' && typeof area.mapY === 'number') {
      pins[area.id] = { x: area.mapX, y: area.mapY }
    }
  }
  return pins
}

/** Ghim (`{x,y}`) hoặc bỏ ghim (`null`) một khu — PATCH `WorkArea.mapX/mapY` ở BE. */
export function useSetMapPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      areaId,
      version,
      pin,
    }: {
      areaId: string
      version?: number
      pin: MapPin | null
    }) =>
      api<unknown>(`/api/v1/work-areas/${areaId}`, {
        method: 'PATCH',
        headers: version === undefined ? {} : { 'If-Match': `"${version}"` },
        body: JSON.stringify({ mapX: pin?.x ?? null, mapY: pin?.y ?? null }),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['areas'] }),
  })
}
