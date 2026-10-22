// Một dòng thông báo — dùng chung cho panel chuông (header) và trang Thông báo
// theo role, để nhãn/icon/trạng thái luôn giống nhau.
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CircleAlert, PackageCheck, ShoppingCart, UserCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatusTag } from '@/components/shared/StatusTag'
import { cn } from '@/lib/utils'
import type { FeedItem } from './api'

const ICONS: Record<FeedItem['kind'], LucideIcon> = {
  ASSIGNED_LEADER: UserCheck,
  ASSIGNED_OFFICER: PackageCheck,
  AREA_MISSING_LEADER: CircleAlert,
  AREA_MISSING_OFFICER: CircleAlert,
  PURCHASE_PENDING: ShoppingCart,
}

/** Nhãn theo loại sự kiện (đã dịch). */
export function useNotificationLabel() {
  const { t } = useTranslation()
  return (item: FeedItem): string => {
    switch (item.kind) {
      case 'ASSIGNED_LEADER':
        return t('shell.feed.assignedLeader', { area: item.areaName ?? '' })
      case 'ASSIGNED_OFFICER':
        return t('shell.feed.assignedOfficer', { area: item.areaName ?? '' })
      case 'AREA_MISSING_LEADER':
        return t('shell.feed.missingLeader', { area: item.areaName ?? '' })
      case 'AREA_MISSING_OFFICER':
        return t('shell.feed.missingOfficer', { area: item.areaName ?? '' })
      case 'PURCHASE_PENDING':
        return t('shell.feed.pendingPurchases', { n: item.count ?? 0 })
    }
  }
}

export function NotificationRow({
  item,
  unread,
  onActivate,
  className,
}: {
  item: FeedItem
  unread?: boolean
  /** Gọi khi người dùng bấm vào dòng (đánh dấu đã đọc / đóng panel). */
  onActivate?: () => void
  className?: string
}) {
  const label = useNotificationLabel()(item)
  const Icon = ICONS[item.kind]

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-primary' : 'bg-transparent',
        )}
      />
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm text-foreground', unread && 'font-semibold')}>{label}</p>
        {item.areaStatus && (
          <div className="mt-1">
            <StatusTag status={item.areaStatus} />
          </div>
        )}
      </div>
    </>
  )

  const base = cn('flex items-start gap-3 px-4 py-3', className)

  if (!item.href) return <div className={base}>{content}</div>

  return (
    <Link
      to={item.href}
      onClick={onActivate}
      className={cn(base, 'transition-colors hover:bg-background')}
    >
      {content}
    </Link>
  )
}
