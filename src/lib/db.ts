// DB ảo: seed → localStorage 'grotto-db-v1'. Mọi mutation của MSW handlers
// đều load → sửa → save; resetDb xóa để về seed gốc.
import { seed } from '../mocks/seed'

const KEY = 'grotto-db-v1'

// any: db có shape của seed, truy cập động theo resource key — mock layer.
export function loadDb(): any {
  const raw = localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : structuredClone(seed)
}

export function saveDb(db: any): void {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export function resetDb(): void {
  localStorage.removeItem(KEY)
}
