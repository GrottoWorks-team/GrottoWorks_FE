// Chuông thông báo trên header.
//
// Nguồn dữ liệu: features/notifications/api.ts — suy ra từ dữ liệu THẬT (khu
// được phân công, khu thiếu nhân sự, đơn mua chờ duyệt) vì BE chưa có service
// Notification. Trạng thái đã đọc ở features/notifications/seen.ts (localStorage,
// chia sẻ với trang Thông báo theo role).
//
// Hành vi: mở panel = đánh dấu đã đọc 10 mục đang thấy; nút "Đọc tất cả" đánh
// dấu TOÀN BỘ feed (kể cả mục ngoài 10); link cuối panel mở trang đầy đủ.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotificationFeed } from '@/features/notifications/api'
import { NotificationRow } from '@/features/notifications/NotificationRow'
import { markSeen, useSeenIds } from '@/features/notifications/seen'
import { useAuth } from '@/lib/auth'
import { rolePrefix } from '@/lib/roles'
import { EmptyState } from './EmptyState'

/** Số mục hiển thị tối đa trong panel. */
const MAX_ITEMS = 10

export function NotificationsDropdown() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const seen = useSeenIds()
  const { items } = useNotificationFeed()

  const allHref = `/${rolePrefix(user?.role ?? 'COMMUNITY')}/notifications`
  const visible = items.slice(0, MAX_ITEMS)
  const unreadCount = items.filter((i) => !seen.includes(i.id)).length
  const hasUnread = unreadCount > 0

  const toggle = () => {
    if (!open && visible.length) {
      // Mở panel = đã xem 10 mục này; mục ngoài 10 vẫn "chưa đọc" cho tới khi
      // bấm "Đọc tất cả" hoặc mở trang Thông báo.
      markSeen(visible.map((i) => i.id))
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t('shell.notifications')}
        aria-label={t('shell.notifications')}
        className="relative grid size-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <Bell className="size-5" />
        {hasUnread && (
          <span
            data-testid="unread-dot"
            className="absolute right-2.5 top-2.5 size-2 rounded-full bg-destructive"
            aria-hidden
          />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('shell.notifications')}
          className="absolute right-0 top-12 z-50 w-96 rounded-card border border-border bg-card shadow-hover"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="lbl-mono">
              {t('shell.notifications')}
              {unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] text-foreground">
                  {unreadCount}
                </span>
              )}
            </p>
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => markSeen(items.map((i) => i.id))}
                disabled={!hasUnread}
                className="text-xs font-semibold text-primary transition-opacity hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          {visible.length ? (
            <>
              <ul className="max-h-96 overflow-y-auto">
                {visible.map((item) => (
                  <li key={item.id} className="border-b border-border/60 last:border-0">
                    <NotificationRow
                      item={item}
                      unread={!seen.includes(item.id)}
                      onActivate={() => {
                        markSeen([item.id])
                        setOpen(false)
                      }}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {t('shell.feed.hint')}
                </p>
                <Link
                  to={allHref}
                  onClick={() => setOpen(false)}
                  className="shrink-0 text-[11px] font-semibold text-primary hover:underline"
                >
                  {t('notifications.viewAll')}
                </Link>
              </div>
            </>
          ) : (
            <EmptyState text={t('notifications.empty')} />
          )}
        </div>
      )}
    </div>
  )
}
