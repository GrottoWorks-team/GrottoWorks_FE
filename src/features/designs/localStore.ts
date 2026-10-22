// LƯU TRỮ CỤC BỘ (FE-only) cho Design Review 2D/3D — CHỈ DÙNG TẠM.
//
// Lý do: BE (`GrottoWorks_BE`) chưa có endpoint `/designs`, `/designVersions`,
// `/designComments`. Trước đây các endpoint này do MSW mock; MSW đã bị gỡ khỏi
// dự án nên tính năng không còn dữ liệu để chạy. Store này giữ metadata ở
// localStorage để 2D/3D review hoạt động được trên FE.
//
// File (ảnh / `.glb`) vẫn nằm ở IndexedDB — xem `lib/blobStore.ts`.
//
// ➜ Khi BE bổ sung endpoint: bỏ file này và thay bằng `api()` trong `api.ts`
//   (giữ nguyên hook surface + query key). Danh sách API còn thiếu: xem
//   `api-contracts.md` mục 1.10.
import type { Design, DesignComment, DesignVersion } from '@/types'

const KEY = 'grotto-designs-v1'

interface DesignDb {
  designs: Design[]
  designVersions: DesignVersion[]
  designComments: DesignComment[]
}

const EMPTY: DesignDb = { designs: [], designVersions: [], designComments: [] }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function load(): DesignDb {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...clone(EMPTY), ...(JSON.parse(raw) as DesignDb) } : clone(EMPTY)
  } catch {
    return clone(EMPTY)
  }
}

function save(db: DesignDb): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

function nextId(rows: { id: string }[], prefix: string): string {
  let max = 0
  for (const row of rows) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(row.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

export const designStore = {
  // ── Design ───────────────────────────────────────────────────────────────
  listDesigns(): Design[] {
    return load().designs
  },
  createDesign(data: Omit<Design, 'id'>): Design {
    const db = load()
    const row: Design = { ...data, id: nextId(db.designs, 'dg') }
    db.designs.push(row)
    save(db)
    return row
  },
  updateDesign(id: string, patch: Partial<Omit<Design, 'id'>>): Design {
    const db = load()
    const i = db.designs.findIndex((d) => d.id === id)
    if (i < 0) throw new Error('NOT_FOUND')
    db.designs[i] = { ...db.designs[i], ...patch }
    save(db)
    return db.designs[i]
  },

  // ── DesignVersion ────────────────────────────────────────────────────────
  listVersions(): DesignVersion[] {
    return load().designVersions
  },
  createVersion(data: Omit<DesignVersion, 'id'>): DesignVersion {
    const db = load()
    const row: DesignVersion = { ...data, id: nextId(db.designVersions, 'dv') }
    db.designVersions.push(row)
    save(db)
    return row
  },
  updateVersion(id: string, patch: Partial<Omit<DesignVersion, 'id'>>): DesignVersion {
    const db = load()
    const i = db.designVersions.findIndex((v) => v.id === id)
    if (i < 0) throw new Error('NOT_FOUND')
    db.designVersions[i] = { ...db.designVersions[i], ...patch }
    save(db)
    return db.designVersions[i]
  },

  // ── DesignComment ────────────────────────────────────────────────────────
  listComments(): DesignComment[] {
    return load().designComments
  },
  createComment(data: Omit<DesignComment, 'id'>): DesignComment {
    const db = load()
    const row: DesignComment = { ...data, id: nextId(db.designComments, 'dc') }
    db.designComments.push(row)
    save(db)
    return row
  },
  updateComment(id: string, patch: Partial<Omit<DesignComment, 'id'>>): DesignComment {
    const db = load()
    const i = db.designComments.findIndex((c) => c.id === id)
    if (i < 0) throw new Error('NOT_FOUND')
    db.designComments[i] = { ...db.designComments[i], ...patch }
    save(db)
    return db.designComments[i]
  },
  deleteComment(id: string): void {
    const db = load()
    db.designComments = db.designComments.filter((c) => c.id !== id)
    save(db)
  },

  /** Xoá TOÀN BỘ dữ liệu (dùng khi nạp lại dữ liệu mẫu ở chế độ xem trước). */
  clear(): void {
    save(clone(EMPTY))
  },
}
