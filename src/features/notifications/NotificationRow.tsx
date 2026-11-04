// Một dòng thông báo — dùng chung cho panel chuông (header) và trang Thông báo
// theo role. Dữ liệu là `NotificationDto` thật của NotificationAudit.
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Bell, Calendar, ClipboardList, Clock, Gift, LifeBuoy, ListChecks, MapPin, ShoppingCart,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relTime } from '@/lib/format'
import { rolePrefix } from '@/lib/roles'
import { NAV } from '@/components/shared/nav-config'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/types'
import type { NotificationDto } from './api'

const ICON_BY_PREFIX: Array<[string, LucideIcon]> = [
  ['task.', ClipboardList],
  ['purchase.', ShoppingCart],
  ['resource.', ShoppingCart],
  ['attendance.', Clock],
  ['planning.season.', Calendar],
  ['planning.work-area.', MapPin],
  ['readiness.', ListChecks],
  ['support.', LifeBuoy],
  ['contribution.', Gift],
  ['recognition.', Gift],
]

function iconFor(eventType: string): LucideIcon {
  const hit = ICON_BY_PREFIX.find(([prefix]) => eventType.startsWith(prefix))
  return hit ? hit[1] : Bell
}

/** Trang đích của thông báo — chỉ trả về route role hiện tại THẬT SỰ có. */
export function notificationHref(item: NotificationDto, role: Role): string | undefined {
  const prefix = rolePrefix(role)
  const id = item.referenceId
  const type = (item.referenceType ?? '').toLowerCase()

  let candidate: string | undefined
  switch (type) {
    case 'task':
      candidate = id ? `/${prefix}/tasks/${id}` : `/${prefix}/tasks`
      break
    case 'purchase-request':
      candidate = id ? `/${prefix}/purchases/${id}` : `/${prefix}/purchases`
      break
    case 'attendance':
      candidate = `/${prefix}/timesheets`
      break
    case 'season':
      candidate = `/${prefix}`
      break
    case 'work-area':
      candidate = `/${prefix}/areas`
      break
    case 'readiness':
      candidate = `/${prefix}/checklist`
      break
    case 'support-request':
    case 'support':
      candidate = `/${prefix}/support`
      break
    case 'donation':
      candidate = `/${prefix}/donations`
      break
    case 'borrowed-item':
      candidate = `/${prefix}/borrowed`
      break
    default:
      candidate = undefined
  }

  if (!candidate) return undefined
  const known = NAV[role].flatMap((group) => group.items.map((entry) => entry.to))
  return known.some((path) => candidate === path || candidate.startsWith(`${path}/`))
    ? candidate
    : undefined
}

export function NotificationRow({
  item,
  unread,
  onActivate,
  className,
}: {
  item: NotificationDto
  unread?: boolean
  /** Gọi khi người dùng bấm vào dòng (đánh dấu đã đọc / đóng panel). */
  onActivate?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const Icon = iconFor(item.eventType)
  const href = user ? notificationHref(item, user.role) : undefined
  const isUnread = unread ?? !item.isRead

  const content = (
    <>
      <span
        aria-hidden
        className={cn('mt-1.5 size-2 shrink-0 rounded-full', isUnread ? 'bg-primary' : 'bg-transparent')}
      />
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm text-foreground', isUnread && 'font-semibold')}>{item.title}</p>
        {item.body && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.body}</p>}
        <p className="mt-1 text-[11px] text-muted-foreground">
          {relTime(item.createdAt, t)}
        </p>
      </div>
    </>
  )

  const base = cn('flex items-start gap-3 px-4 py-3', className)

  if (!href) {
    return (
      <button type="button" onClick={onActivate} className={cn(base, 'w-full text-left')}>
        {content}
      </button>
    )
  }

  return (
    <Link
      to={href}
      onClick={onActivate}
      className={cn(base, 'transition-colors hover:bg-background')}
    >
      {content}
    </Link>
  )
}
