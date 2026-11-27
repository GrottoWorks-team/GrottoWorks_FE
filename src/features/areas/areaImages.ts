// Ảnh theo từng khu vực công tác — FE-only (26/11/2026).
// Metadata (thứ tự + thời điểm) ở localStorage `grotto-area-images-v1`,
// blob ảnh ở IndexedDB (`lib/blobStore`). Chỉ tồn tại trên máy đang dùng;
// khi BE có `work_area_image` thì thay 2 hàm đọc/ghi bằng API (giữ nguyên UI).
import { deleteBlob, getBlob, newBlobKey, putBlob } from '@/lib/blobStore'

export interface AreaImageMeta {
  key: string
  addedAt: string
  fileName: string
}

const STORAGE_KEY = 'grotto-area-images-v1'

type Store = Record<string, AreaImageMeta[]>

function readAll(): Store {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Store
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(store: Store): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Hết quota: bỏ qua, ảnh vẫn xem được trong phiên.
  }
}

export function listAreaImages(areaId: string): AreaImageMeta[] {
  return readAll()[areaId] ?? []
}

export async function addAreaImage(areaId: string, file: Blob, fileName: string): Promise<AreaImageMeta> {
  const key = newBlobKey('areaimg')
  await putBlob(key, file)
  const meta: AreaImageMeta = { key, addedAt: new Date().toISOString(), fileName }
  const store = readAll()
  store[areaId] = [...(store[areaId] ?? []), meta]
  writeAll(store)
  return meta
}

export async function removeAreaImage(areaId: string, key: string): Promise<void> {
  const store = readAll()
  store[areaId] = (store[areaId] ?? []).filter((meta) => meta.key !== key)
  writeAll(store)
  await deleteBlob(key).catch(() => undefined)
}

/** Object URL cho ảnh đã lưu (nhớ revoke khi unmount). */
export async function getAreaImageUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key).catch(() => null)
  return blob ? URL.createObjectURL(blob) : null
}
