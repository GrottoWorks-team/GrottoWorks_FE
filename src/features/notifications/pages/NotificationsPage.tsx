// Trang Thông báo đầy đủ cho các role vận hành:
//   /community/notifications | /leader/notifications | /material-officer/notifications
//
// Kết nối trực tiếp NotificationAudit qua useNotificationFeed và useMarkNotificationRead.
// Hỗ trợ lọc Chưa đọc và Đọc tất cả.
import { useMemo, useState } from 'react'
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
  useNotificationFeed,
} from '../api'
import { NotificationRow } from '../NotificationRow'
import { markSeen, useSeenIds } from '../seen'

type Filter = 'ALL' | 'UNREAD'

export default function RoleNotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { items, isPending, source } = useNotificationFeed()
  const seen = useSeenIds()
  const [filter, setFilter] = useState<Filter>('ALL')
  const markReadMut = useMarkNotificationRead()
  const markAllMut = useMarkAllNotificationsRead()

  const unread = useMemo(() => items.filter((i) => !seen.includes(i.id)), [items, seen])
  const shown = filter === 'UNREAD' ? unread : items

  const markAll = () => {
    markSeen(items.map((i) => i.id))
    markAllMut.mutate(items.map((i) => i.id))
    toast(t('notifications.allRead'))
  }

  const handleActivate = (id: string) => {
    markSeen([id])
    markReadMut.mutate(id)
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
              {f === 'UNREAD' && unread.length > 0 && (
                <span className="ml-1.5 rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] text-foreground">
                  {unread.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={markAll} disabled={unread.length === 0}>
          <CheckCheck aria-hidden />
          {t('notifications.markAllRead')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {shown.length ? (
          <ul>
            {shown.map((item) => (
              <li key={item.id} className="border-b border-border last:border-0">
                <NotificationRow
                  item={item}
                  unread={!seen.includes(item.id)}
                  onActivate={() => handleActivate(item.id)}
                  className={cn(!seen.includes(item.id) && 'bg-brand-pineLight/40')}
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

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {source === 'BE'
          ? 'Dữ liệu thông báo trực tiếp từ NotificationAudit service (/api/v1/notifications).'
          : t('notifications.derivedHint')}
      </p>
    </>
  )
}
