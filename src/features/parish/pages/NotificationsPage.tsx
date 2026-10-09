// Trang thông báo (route /parish/notifications): chọn loại sự kiện nào sẽ sinh
// thông báo cho hệ thống (mọi role đều nhận). KHÔNG có model notifications
// trong seed — prefs lưu localStorage 'grotto-notification-prefs' theo event
// key; mặc định bật hết.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const PREFS_KEY = 'grotto-notification-prefs'

// Loại sự kiện sinh thông báo — key theo domain feature có thật trong app
// (task hoàn thành / duyệt mua lớn / nhận quyên góp / Timesheet PENDING_FIX /
// yêu cầu hỗ trợ OPEN / đăng ký TNV chờ duyệt).
const EVENTS = [
  'taskDone',
  'purchaseApproved',
  'purchaseRejected',
  'donationReceived',
  'correctionRequested',
  'supportOpened',
  'regPending',
] as const
type EventKey = (typeof EVENTS)[number]
type Prefs = Partial<Record<EventKey, boolean>>

// Mặc định: bật hết. localStorage hỏng → mặc định.
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw) as Prefs
  } catch {
    // blob hỏng — dùng mặc định
  }
  return {}
}
// Key không có trong prefs = mặc định bật (true).
const isOn = (p: Prefs, k: EventKey) => p[k] !== false

// Switch — pattern ChecklistPage.
function Toggle({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-brand-pine bg-brand-pine' : 'border-border bg-background',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-3.5 rounded-full bg-card shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  // Mọi toggle persist ngay (không cần nút lưu).
  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  const toggle = (k: EventKey) => {
    setPrefs((p) => ({ ...p, [k]: !isOn(p, k) }))
    toast(t(isOn(prefs, k) ? 'features.parish.notifOff' : 'features.parish.notifOn', { name: t(`features.parish.notifEvent.${k}`) }))
  }

  const onCount = EVENTS.filter((k) => isOn(prefs, k)).length

  return (
    <div>
      <PageHeader title={t('features.parish.notificationsTitle')} sub={t('features.parish.notificationsSub')} />

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          <Bell className="size-4" aria-hidden />
          <span className="tabular">
            {onCount}/{EVENTS.length}
          </span>
          {t('features.parish.notificationsOn')}
        </div>
        <ul>
          {EVENTS.map((k, i) => (
            <li
              key={k}
              style={{ '--d': i } as React.CSSProperties}
              className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {t(`features.parish.notifEvent.${k}`)}
                </p>
                <p className="text-xs text-muted-foreground">{t(`features.parish.notifEventSub.${k}`)}</p>
              </div>
              <Toggle
                checked={isOn(prefs, k)}
                label={t(`features.parish.notifEvent.${k}`)}
                onToggle={() => toggle(k)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
