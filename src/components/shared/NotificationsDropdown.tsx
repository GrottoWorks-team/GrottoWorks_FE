// Chuông thông báo trên header — dữ liệu từ NotificationAudit service:
//   GET  /api/v1/notifications?size=10         (10 mục mới nhất)
//   GET  /api/v1/notifications?isRead=false&size=1 → page.totalItems (số chưa đọc)
//   POST /api/v1/notifications/{id}/read | /read-all
//
// Bấm một mục = đánh dấu đã đọc trên server rồi điều hướng; "Đọc tất cả" gọi
// read-all. Không còn trạng thái localStorage.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
  useUnreadNotificationCount,
} from '@/features/notifications/api'
import { NotificationRow } from '@/features/notifications/NotificationRow'
import { useAuth } from '@/lib/auth'
import { rolePrefix } from '@/lib/roles'
import { EmptyState } from './EmptyState'

export function NotificationsDropdown() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const { items } = useNotificationFeed(10, open)
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const allHref = `/${rolePrefix(user?.role ?? 'COMMUNITY')}/notifications`
  const hasUnread = unreadCount > 0

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
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
                onClick={() => markAll.mutate()}
                disabled={!hasUnread || markAll.isPending}
                className="text-xs font-semibold text-primary transition-opacity hover:underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>
          {items.length ? (
            <>
              <ul className="max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="border-b border-border/60 last:border-0">
                    <NotificationRow
                      item={item}
                      unread={!item.isRead}
                      onActivate={() => {
                        if (!item.isRead) markRead.mutate(item.id)
                        setOpen(false)
                      }}
                    />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-end border-t border-border px-4 py-2">
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
