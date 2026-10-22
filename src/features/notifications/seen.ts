// Trạng thái "đã đọc" của thông báo.
//
// Lưu danh sách id đã đọc trong localStorage. Id của feed là ỔN ĐỊNH theo đối
// tượng nghiệp vụ (khu vực / đơn mua) chứ không theo thời gian — vì BE chưa trả
// mốc thời gian cho phân công (xem features/notifications/api.ts).
//
// Dùng useSyncExternalStore để chuông trên header và trang Thông báo dùng chung
// một nguồn: bấm "Đọc tất cả" ở một chỗ thì chỗ kia mất dot ngay, không cần
// reload. Đồng bộ cả khi mở nhiều tab (sự kiện `storage`).
import { useSyncExternalStore } from 'react'

const KEY = 'grotto-notif-seen'
/** Chặn localStorage phình vô hạn khi phân công/đơn mua thay đổi nhiều lần. */
const MAX_SEEN = 200

let cache: string[] | null = null
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Snapshot ổn định (React yêu cầu cùng tham chiếu khi chưa có thay đổi). */
export function getSeenIds(): string[] {
  cache ??= read()
  return cache
}

/** Đánh dấu đã đọc các id; trả về danh sách sau khi gộp. */
export function markSeen(ids: string[]): string[] {
  if (!ids.length) return getSeenIds()
  const next = [...new Set([...getSeenIds(), ...ids])].slice(-MAX_SEEN)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage đầy / bị chặn → vẫn giữ trong bộ nhớ phiên
  }
  cache = next
  emit()
  return next
}

/** Xoá toàn bộ trạng thái đã đọc (dùng cho test / đăng xuất nếu cần). */
export function resetSeen(): void {
  cache = []
  try {
    localStorage.removeItem(KEY)
  } catch {
    // bỏ qua
  }
  emit()
}

/** Id đã đọc, tự cập nhật khi có người gọi markSeen(). */
export function useSeenIds(): string[] {
  return useSyncExternalStore(subscribe, getSeenIds, getSeenIds)
}
