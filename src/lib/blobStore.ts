// Kho blob phía client cho file review 2D/3D trong giai đoạn mock — dự án chưa
// có backend/object storage. Blob ảnh/model không nhét vừa localStorage
// (~5MB) nên dùng IndexedDB.
//
// Giới hạn đã biết: dữ liệu CHỈ nằm trong trình duyệt này, không đồng bộ giữa
// máy/người dùng. Production phải thay bằng endpoint upload + storage thật của
// dự án (metadata vẫn do tầng DB hiện có quản lý).
//
// jsdom (môi trường test) không có IndexedDB → fallback Map trong bộ nhớ để
// test/SSR không vỡ; khi đó blob chỉ sống trong phiên.

const DB_NAME = 'grotto-blobs-v1'
const STORE = 'blobs'

const memory = new Map<string, Blob>()

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = op(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

/** Sinh khoá blob mới. crypto.randomUUID chỉ có ở secure context → có fallback. */
export function newBlobKey(prefix = 'blob'): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${rand}`
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  if (!hasIndexedDb()) {
    memory.set(key, blob)
    return
  }
  await run('readwrite', (s) => s.put(blob, key))
}

export async function getBlob(key: string): Promise<Blob | null> {
  if (!hasIndexedDb()) return memory.get(key) ?? null
  const value = await run<Blob | undefined>('readonly', (s) => s.get(key))
  return value ?? null
}

export async function deleteBlob(key: string): Promise<void> {
  if (!hasIndexedDb()) {
    memory.delete(key)
    return
  }
  await run('readwrite', (s) => s.delete(key))
}
