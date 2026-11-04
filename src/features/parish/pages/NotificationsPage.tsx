// Trang thông báo (route /parish/notifications): cấu hình KÊNH nhận thông báo
// của người đang đăng nhập — NotificationAudit service:
//   GET  /api/v1/users/me/notification-preferences
//   PUT  /api/v1/users/me/notification-preferences  { inAppEnabled, pushEnabled, emailEnabled }
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferenceDto,
} from '@/features/notifications/api'

type Channel = keyof NotificationPreferenceDto

const CHANNELS: Channel[] = ['inAppEnabled', 'pushEnabled', 'emailEnabled']

const LABEL_KEY: Record<Channel, string> = {
  inAppEnabled: 'features.parish.notifChannel.inApp',
  pushEnabled: 'features.parish.notifChannel.push',
  emailEnabled: 'features.parish.notifChannel.email',
}

const SUB_KEY: Record<Channel, string> = {
  inAppEnabled: 'features.parish.notifChannelSub.inApp',
  pushEnabled: 'features.parish.notifChannelSub.push',
  emailEnabled: 'features.parish.notifChannelSub.email',
}

// Switch — pattern ChecklistPage.
function Toggle({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean
  label: string
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
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
  const { data: prefs, isPending, isError } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()

  const toggle = (channel: Channel) => {
    if (!prefs) return
    const next: NotificationPreferenceDto = { ...prefs, [channel]: !prefs[channel] }
    update.mutate(next, {
      onSuccess: () =>
        toast(
          t(next[channel] ? 'features.parish.notifOn' : 'features.parish.notifOff', {
            name: t(LABEL_KEY[channel]),
          }),
        ),
      onError: () => toast(t('features.parish.notifSaveFailed'), 'alert'),
    })
  }

  const onCount = prefs ? CHANNELS.filter((channel) => prefs[channel]).length : 0

  return (
    <div>
      <PageHeader
        title={t('features.parish.notificationsTitle')}
        sub={t('features.parish.notificationsSub')}
      />

      <Card className="p-5">
        {isPending ? (
          <EmptyState text={t('common.loading')} />
        ) : isError || !prefs ? (
          <EmptyState text={t('features.parish.notifLoadFailed')} />
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Bell className="size-4" aria-hidden />
              <span className="tabular">
                {onCount}/{CHANNELS.length}
              </span>
              {t('features.parish.notificationsOn')}
            </div>
            <ul>
              {CHANNELS.map((channel, i) => (
                <li
                  key={channel}
                  style={{ '--d': i } as React.CSSProperties}
                  className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {t(LABEL_KEY[channel])}
                    </p>
                    <p className="text-xs text-muted-foreground">{t(SUB_KEY[channel])}</p>
                  </div>
                  <Toggle
                    checked={prefs[channel]}
                    disabled={update.isPending}
                    label={t(LABEL_KEY[channel])}
                    onToggle={() => toggle(channel)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
