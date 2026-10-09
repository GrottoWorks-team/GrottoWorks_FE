// Dropdown thông báo từ AppShell: chuông mở panel 10 activity mới nhất
// (GET /api/activity). Dot đỏ khi có log mới hơn log mới nhất đã xem — so id
// log ('grotto-notif-read' lưu lastSeenId, so số hậu tố 'log{N}') — mở panel
// = đánh dấu đã đọc.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity as ActivityIcon, Bell, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { relTime } from '@/lib/format'
import { useActivity } from '@/features/dashboards/api'
import { useUsers } from '@/features/users/api'
import { EmptyState } from './EmptyState'

const READ_KEY = 'grotto-notif-read'

// Id log do nextId sinh tăng dần ('log41' > 'log40'...). Timestamp không so được:
// seed có mốc tương lai còn log mới mang `at` = now (thực tế NHỎ hơn seed) —
// nên so số hậu tố 'log{N}'; id lạ thì fallback so chuỗi.
const logNum = (id: string): number | null => {
  const m = /^log(\d+)$/.exec(id)
  return m ? Number(m[1]) : null
}
const isNewer = (id: string, seen: string | null): boolean => {
  if (!seen) return true
  const a = logNum(id)
  const b = logNum(seen)
  return a != null && b != null ? a > b : id > seen
}

// Icon theo động từ trong action (seed/logMutation là chuỗi tiếng Việt).
const ICON_RULES: [string, LucideIcon][] = [
  ['hoàn thành', CheckCircle2],
  ['tạo', Plus],
  ['thêm', Plus],
  ['đăng ký', Plus],
  ['mở', Plus],
  ['duyệt', CheckCircle2],
  ['xoá', Trash2],
  ['từ chối', Trash2],
]
const iconOf = (action: string) => ICON_RULES.find(([k]) => action.includes(k))?.[1] ?? ActivityIcon

export function NotificationsDropdown() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  // Id log mới nhất đã xem — so id (logNum) thay timestamp.
  const [lastSeenId, setLastSeenId] = useState(() => localStorage.getItem(READ_KEY))
  const { data: logs = [] } = useActivity()
  const { data: users = [] } = useUsers()

  const items = logs.slice(0, 10)
  const hasUnread = items.some((x) => isNewer(x.id, lastSeenId))
  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? id

  const toggle = () => {
    if (!open && items.length) {
      // Đánh dấu đã đọc lúc mở: lưu id của log mới nhất (đứng đầu list) —
      // log sinh sau đó có id lớn hơn → dot sáng lại đúng, không lệ thuộc đồng hồ.
      localStorage.setItem(READ_KEY, items[0].id)
      setLastSeenId(items[0].id)
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
          <p className="lbl-mono border-b border-border px-4 py-3">
            {t('shell.notifications')}
          </p>
          {items.length ? (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((x) => {
                const Icon = iconOf(x.action)
                return (
                  <li
                    key={x.id}
                    className="flex items-start gap-3 border-b border-border/60 px-4 py-3 last:border-0"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{nameOf(x.actor)}</span> {x.action}{' '}
                        <span className="font-semibold">{x.target}</span>
                      </p>
                      <p className="lbl-mono mt-0.5">{relTime(x.at, t)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState text={t('notifications.empty')} />
          )}
        </div>
      )}
    </div>
  )
}
