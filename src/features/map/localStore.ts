// LƯU TRỮ CỤC BỘ (FE-only) cho Bản đồ giáo xứ — CHỈ DÙNG TẠM.
//
// Lý do: BE (`GrottoWorks_BE`) chưa có endpoint `/parishMaps` và cũng chưa có
// API cập nhật toạ độ work area. Ảnh mặt bằng vẫn nằm ở IndexedDB
// (`lib/blobStore.ts`); ở đây giữ metadata của bản đồ + **toạ độ ghim khu**
// (thay cho `WorkArea.mapX/mapY` khi chưa có BE).
//
// ➜ Khi BE bổ sung endpoint: bỏ file này và thay bằng `api()` trong `api.ts`
//   (giữ nguyên hook surface + query key). Danh sách API còn thiếu: xem
//   `api-contracts.md` mục 1.10.
import type { ParishMap } from '@/types'

const KEY = 'grotto-parish-map-v1'

/** Toạ độ ghim một khu trên ảnh mặt bằng (chuẩn hoá 0..1). */
export interface MapPin {
  x: number
  y: number
}

interface MapDb {
  map: ParishMap | null
  pins: Record<string, MapPin>
}

const EMPTY: MapDb = { map: null, pins: {} }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function load(): MapDb {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...clone(EMPTY), ...(JSON.parse(raw) as MapDb) } : clone(EMPTY)
  } catch {
    return clone(EMPTY)
  }
}

function save(db: MapDb): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export const mapStore = {
  /** Bản đồ mặt bằng hiện tại (nếu đã tải lên). */
  getMap(): ParishMap | undefined {
    return load().map ?? undefined
  },
  /** Tạo/ghi đè ảnh mặt bằng (một bản ghi/giáo xứ). */
  saveMap(data: { imageKey: string; fileName?: string }): ParishMap {
    const db = load()
    const row: ParishMap = {
      id: db.map?.id ?? 'pm1',
      imageKey: data.imageKey,
      fileName: data.fileName,
      updatedAt: new Date().toISOString(),
    }
    db.map = row
    save(db)
    return row
  },

  /** Toạ độ ghim của tất cả khu: `areaId → { x, y }`. */
  listPins(): Record<string, MapPin> {
    return load().pins
  },
  /** Ghim (`pin`) hoặc bỏ ghim (`null`) một khu. */
  setPin(areaId: string, pin: MapPin | null): Record<string, MapPin> {
    const db = load()
    if (pin) db.pins[areaId] = pin
    else delete db.pins[areaId]
    save(db)
    return db.pins
  },

  /** Xoá TOÀN BỘ bản đồ + ghim (dùng khi nạp lại dữ liệu mẫu). */
  clear(): void {
    save(clone(EMPTY))
  },
}
