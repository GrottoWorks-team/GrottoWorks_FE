// LƯU TRỮ CỤC BỘ (FE-only) cho Bản đồ giáo xứ — CHỈ DÙNG TẠM.
//
// Lý do: BE (`GrottoWorks_BE`) chưa có endpoint `/parishMaps` và cũng chưa có
// API cập nhật toạ độ work area. Ảnh mặt bằng vẫn nằm ở IndexedDB
// (`lib/blobStore.ts`); ở đây giữ metadata của bản đồ + **toạ độ ghim khu**.
//
// Từ 11/11/2026: lưu **theo từng giáo xứ** (`parishId`) vì ADMIN xem được nhiều
// giáo xứ. Dữ liệu cũ (một bản đồ dùng chung) được tự động chuyển sang giáo xứ
// đầu tiên mở bản đồ (legacy → per-parish) khi đọc/ghi.
//
// ➜ Khi BE bổ sung endpoint: bỏ file này và thay bằng `api()` trong `api.ts`
//   (giữ nguyên hook surface + query key).
import type { ParishMap } from '@/types'

const KEY = 'grotto-parish-map-v1'

/** Toạ độ ghim một khu trên ảnh mặt bằng (chuẩn hoá 0..1). */
export interface MapPin {
  x: number
  y: number
}

interface MapDb {
  version: 2
  /** `parishId → ảnh mặt bằng hiện hành`. */
  maps: Record<string, ParishMap>
  /** `parishId → { areaId → toạ độ }`. */
  pins: Record<string, Record<string, MapPin>>
  /** Dữ liệu bản cũ (1 bản đồ dùng chung) — gom vào giáo xứ đầu tiên truy cập. */
  legacy?: { map: ParishMap | null; pins: Record<string, MapPin> }
}

const EMPTY: MapDb = { version: 2, maps: {}, pins: {} }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function load(): MapDb {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return clone(EMPTY)
    const parsed = JSON.parse(raw) as MapDb & {
      map?: ParishMap | null
      pins?: Record<string, MapPin>
    }
    if (parsed.version === 2 && parsed.maps && parsed.pins) {
      return {
        version: 2,
        maps: parsed.maps,
        pins: parsed.pins,
        ...(parsed.legacy ? { legacy: parsed.legacy } : {}),
      }
    }
    // Bản cũ: { map, pins } dùng chung cho mọi giáo xứ.
    return {
      version: 2,
      maps: {},
      pins: {},
      legacy: { map: parsed.map ?? null, pins: parsed.pins ?? {} },
    }
  } catch {
    return clone(EMPTY)
  }
}

function save(db: MapDb): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

/** Chuyển dữ liệu legacy sang giáo xứ đang truy cập (chỉ 1 lần). */
function adoptLegacy(db: MapDb, parishId: string): void {
  if (!db.legacy) return
  if (db.legacy.map) db.maps[parishId] = db.legacy.map
  if (Object.keys(db.legacy.pins).length > 0) db.pins[parishId] = db.legacy.pins
  delete db.legacy
}

export const mapStore = {
  /** Bản đồ mặt bằng hiện hành của một giáo xứ (nếu đã tải lên). */
  getMap(parishId: string): ParishMap | undefined {
    if (!parishId) return undefined
    const db = load()
    if (db.legacy) {
      adoptLegacy(db, parishId)
      save(db)
    }
    return db.maps[parishId]
  },

  /** Tạo/ghi đè ảnh mặt bằng của một giáo xứ. */
  saveMap(parishId: string, data: { imageKey: string; fileName?: string }): ParishMap {
    const db = load()
    adoptLegacy(db, parishId)
    const row: ParishMap = {
      id: db.maps[parishId]?.id ?? `pm-${parishId}`,
      imageKey: data.imageKey,
      fileName: data.fileName,
      updatedAt: new Date().toISOString(),
    }
    db.maps[parishId] = row
    save(db)
    return row
  },

  /** Toạ độ ghim của tất cả khu trong giáo xứ: `areaId → { x, y }`. */
  listPins(parishId: string): Record<string, MapPin> {
    if (!parishId) return {}
    const db = load()
    if (db.legacy) {
      adoptLegacy(db, parishId)
      save(db)
    }
    return db.pins[parishId] ?? {}
  },

  /** Ghim (`pin`) hoặc bỏ ghim (`null`) một khu trong giáo xứ. */
  setPin(parishId: string, areaId: string, pin: MapPin | null): Record<string, MapPin> {
    if (!parishId) return {}
    const db = load()
    adoptLegacy(db, parishId)
    const pins = { ...(db.pins[parishId] ?? {}) }
    if (pin) pins[areaId] = pin
    else delete pins[areaId]
    db.pins[parishId] = pins
    save(db)
    return pins
  },

  /** Xoá TOÀN BỘ bản đồ + ghim của mọi giáo xứ (dùng khi nạp lại dữ liệu mẫu). */
  clear(): void {
    save(clone(EMPTY))
  },
}
