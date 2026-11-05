// Trang Thông báo đầy đủ cho các role vận hành:
//   /community/notifications | /leader/notifications | /material-officer/notifications
//
// Nguồn: `GET /api/v1/notifications` (NotificationAudit) — trạng thái đã đọc do
// server giữ (`isRead`), "Đọc tất cả" gọi `POST /api/v1/notifications/read-all`.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCheck, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../api'
import { NotificationRow } from '../NotificationRow'

type Filter = 'ALL' | 'UNREAD'

export default function RoleNotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('ALL')

  const { data, isPending } = useNotifications({
    isRead: filter === 'UNREAD' ? false : undefined,
  })
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const items = data?.items ?? []

  const onMarkAll = async () => {
    try {
      await markAll.mutateAsync()
      toast(t('notifications.allRead'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <>
      <PageHeader title={t('notifications.title')} sub={t('notifications.sub')} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-1">
          {(['ALL', 'UNREAD'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f === 'ALL' ? t('notifications.filterAll') : t('notifications.filterUnread')}
              {f === 'UNREAD' && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] text-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onMarkAll}
          disabled={unreadCount === 0 || markAll.isPending}
        >
          <CheckCheck aria-hidden />
          {t('notifications.markAllRead')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-border last:border-0">
                <NotificationRow
                  item={item}
                  unread={!item.isRead}
                  onActivate={() => {
                    if (!item.isRead) markRead.mutate(item.id)
                  }}
                  className={cn(!item.isRead && 'bg-brand-pineLight/40')}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={filter === 'UNREAD' ? <CheckCheck aria-hidden /> : <Inbox aria-hidden />}
            text={
              isPending
                ? t('common.loading')
                : filter === 'UNREAD'
                  ? t('notifications.noneUnread')
                  : t('notifications.empty')
            }
          />
        )}
      </Card>
    </>
  )
}
