// Trang Thông báo đầy đủ cho các role vận hành:
//   /community/notifications | /leader/notifications | /material-officer/notifications
//
// Nguồn: `GET /api/v1/notifications` (NotificationAudit) — trạng thái đã đọc do
// server giữ (`isRead`), "Đọc tất cả" gọi `POST /api/v1/notifications/read-all`.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCheck, Inbox } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorState } from '@/components/shared/ErrorState'
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

  const { data, isPending, isError, refetch } = useNotifications({
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
    <div>
      <PageHeader
        title={t('notifications.title')}
        sub={`${t('notifications.sub')}.`}
        actions={
          <button
            type="button"
            onClick={() => void onMarkAll()}
            disabled={unreadCount === 0 || markAll.isPending}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
          >
            <CheckCheck className="size-[13px] text-[#3F7F5B]" aria-hidden />
            <span className="text-[12px] font-semibold text-[#2C463A]">{t('notifications.markAllRead')}</span>
          </button>
        }
      />

      <div className="mb-[16px] flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[12px] bg-[#EAF0E6] p-1">
          {(['ALL', 'UNREAD'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'flex h-8 items-center rounded-[9px] px-[14px] text-[12px] transition-colors',
                filter === f
                  ? 'bg-white font-bold text-[#0A5C36] shadow-[0px_1px_3px_#06281B1A]'
                  : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
              )}
            >
              {f === 'ALL' ? t('notifications.filterAll') : t('notifications.filterUnread')}
              {f === 'UNREAD' && unreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-[#E9B949] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#06281B]">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E3EAE0] bg-white px-[10px] py-[5px]">
          <Inbox className="size-[11px] text-[#4F7A61]" aria-hidden />
          <span className="text-[10.5px] font-semibold text-[#4F7A61]">
            {t('notifications.countChip', { defaultValue: '{{count}} thông báo', count: items.length })}
          </span>
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
        {isError ? (
          <ErrorState compact message={t('notifications.loadError')} onRetry={() => void refetch()} />
        ) : items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-b border-[#F0F4EC] last:border-0">
                <NotificationRow
                  item={item}
                  unread={!item.isRead}
                  onActivate={() => {
                    if (!item.isRead) markRead.mutate(item.id)
                  }}
                  className={cn(!item.isRead && 'bg-[#F4F8F1]')}
                />
              </li>
            ))}
          </ul>
        ) : isPending ? (
          <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-[9px] px-5 py-14">
            {filter === 'UNREAD' ? (
              <CheckCheck className="size-[26px] text-[#B9C8BE]" aria-hidden />
            ) : (
              <Inbox className="size-[26px] text-[#B9C8BE]" aria-hidden />
            )}
            <span className="text-[12.5px] font-semibold text-[#7C9287]">
              {filter === 'UNREAD' ? t('notifications.noneUnread') : t('notifications.empty')}
            </span>
            <span className="w-full max-w-[340px] text-center text-[10.5px] leading-[16px] text-[#A3B4A9]">
              {t('notifications.emptyHint', { defaultValue: 'Phân công khu vực, đơn mua và việc cần xử lý sẽ xuất hiện tại đây.' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
