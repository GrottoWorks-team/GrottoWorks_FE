// DB ảo: seed → localStorage 'grotto-db-v1'. Mọi mutation của MSW handlers
// đều load → sửa → save; resetDb xóa để về seed gốc.
import { seed } from '../mocks/seed'

const KEY = 'grotto-db-v1'

// any: db có shape của seed, truy cập động theo resource key — mock layer.
// Bổ sung resource mới thêm vào seed nhưng chưa có trong bản lưu cũ (localStorage
// giữ db từ phiên bản trước) — tránh vỡ khi thêm bảng mới như designs/parishMaps.
export function loadDb(): any {
  const raw = localStorage.getItem(KEY)
  if (!raw) return structuredClone(seed)
  const stored = JSON.parse(raw)
  for (const key of Object.keys(seed)) {
    if (!(key in stored)) stored[key] = structuredClone((seed as any)[key])
  }
  return stored
}

export function saveDb(db: any): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDb(): void {
  localStorage.removeItem(KEY)
}
