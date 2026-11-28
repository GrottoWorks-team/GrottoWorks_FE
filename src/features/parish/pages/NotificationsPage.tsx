// Trang thông báo (route /parish/notifications): cấu hình KÊNH nhận thông báo
// của người đang đăng nhập — NotificationAudit service:
//   GET  /api/v1/users/me/notification-preferences
//   PUT  /api/v1/users/me/notification-preferences  { inAppEnabled, pushEnabled, emailEnabled }
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Thông Báo — Kênh Nhận Tin".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Lightbulb, Mail, Smartphone } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferenceDto,
} from '@/features/notifications/api'

type Channel = keyof NotificationPreferenceDto

const CHANNELS: Channel[] = ['inAppEnabled', 'pushEnabled', 'emailEnabled']

const CHANNEL_ICON = { inAppEnabled: Bell, pushEnabled: Smartphone, emailEnabled: Mail }

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

// Mặc định của BE khi user chưa có bản ghi (NotificationPreference.CreateDefault).
const DEFAULTS: NotificationPreferenceDto = {
  inAppEnabled: true,
  pushEnabled: true,
  emailEnabled: false,
}

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const HEAD = 'font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]'

// Toggle 38×22 đúng bản thiết kế: nền xanh khi bật, be khi tắt, núm 16px.
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
        'flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors disabled:opacity-50',
        checked ? 'justify-end bg-[#0A5C36]' : 'justify-start bg-[#E4EBE1]',
      )}
    >
      <span
        aria-hidden
        className="size-4 shrink-0 rounded-full bg-white shadow-[0px_1px_2px_#06281B26]"
      />
    </button>
  )
}

export default function NotificationsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: prefs, isPending, isError } = useNotificationPreferences()
  const update = useUpdateNotificationPreferences()

  // Sửa trên bản nháp rồi mới "Lưu thay đổi" — bấm Hủy/đổi trang không ghi nửa chừng.
  const [draft, setDraft] = useState<NotificationPreferenceDto | null>(null)
  useEffect(() => {
    if (prefs) setDraft(prefs)
  }, [prefs])

  const view = draft ?? prefs ?? DEFAULTS
  const onCount = CHANNELS.filter((c) => view[c]).length

  const save = (next: NotificationPreferenceDto) => {
    update.mutate(next, {
      onSuccess: () => toast(t('features.parish.notifSaved')),
      onError: () => toast(t('features.parish.notifSaveFailed'), 'alert'),
    })
  }

  const onSave = () => {
    if (!prefs) return
    save(view)
  }

  const onReset = () => {
    setDraft(DEFAULTS)
    save(DEFAULTS)
  }

  const EVENTS = [
    { code: 'task.created', name: 'taskCreated' },
    { code: 'purchase.request.decided', name: 'purchaseDecided' },
    { code: 'material.shortage.changed', name: 'materialShortage' },
  ]

  const stateLabel = (on: boolean, short = false) =>
    t(
      on
        ? short
          ? 'features.parish.notifOnShort'
          : 'features.parish.notifStateOn'
        : short
          ? 'features.parish.notifOffShort'
          : 'features.parish.notifStateOff',
    )

  return (
    <div>
      <PageHeader
        title={t('features.parish.notificationsTitle')}
        sub={t('features.parish.notificationsSub')}
        actions={
          <>
            <button
              type="button"
              onClick={onReset}
              disabled={!prefs || update.isPending}
              className="flex h-[38px] items-center rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-50"
            >
              <span className="text-[12px] font-semibold text-[#2C463A]">
                {t('features.parish.notifReset')}
              </span>
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!prefs || update.isPending}
              className="flex h-[38px] items-center rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-opacity hover:bg-[#0D7344] disabled:opacity-50"
            >
              <span className="text-[12px] font-bold text-white">
                {t('features.parish.notifSave')}
              </span>
            </button>
          </>
        }
      />

      {isError ? (
        <div className={CARD}>
          <EmptyState text={t('features.parish.notifLoadFailed')} />
        </div>
      ) : (
        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-[16px]">
            {/* Kênh nhận thông báo */}
            <section className={CARD}>
              <div className="flex items-center justify-between px-[18px] py-[14px]">
                <p className={HEAD}>
                  {t('features.parish.notifChannelsHead')}
                </p>
                <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1">
                  <span className="text-[10px] font-bold text-[#4F7A61]">
                    {t('features.parish.notifChannelsChip', { on: onCount, total: CHANNELS.length })}
                  </span>
                </span>
              </div>
              <div className={RULE} aria-hidden />
              {isPending ? (
                <p className="px-[18px] py-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
              ) : (
                <ul>
                  {CHANNELS.map((channel) => {
                    const Icon = CHANNEL_ICON[channel]
                    const active = view[channel]
                    return (
                      <li
                        key={channel}
                        className="flex items-center justify-between gap-4 border-b border-[#F0F4EC] px-[18px] py-[14px] last:border-0"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span
                            className={cn(
                              'grid size-8 shrink-0 place-items-center rounded-[10px] border',
                              active
                                ? 'border-[#DDE8D6] bg-[#EDF4EA]'
                                : 'border-[#EDF1E9] bg-[#F5F7F3]',
                            )}
                          >
                            <Icon
                              className={cn('size-[11px]', active ? 'text-[#3F7F5B]' : 'text-[#97AB9E]')}
                              aria-hidden
                            />
                          </span>
                          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                            <span className="truncate text-[12.5px] font-bold text-[#0B2E1F]">
                              {t(LABEL_KEY[channel])}
                            </span>
                            <span className="w-full text-[11px] text-[#8AA298]">
                              {t(SUB_KEY[channel])}
                            </span>
                          </div>
                        </div>
                        <Toggle
                          checked={active}
                          disabled={!prefs || update.isPending}
                          label={t(LABEL_KEY[channel])}
                          onToggle={() => setDraft({ ...view, [channel]: !active })}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="flex items-center justify-between border-t border-[#ECF1E9] px-[18px] py-[11px]">
                <span className="text-[10.5px] text-[#96AAA0]">
                  {t('features.parish.notifFoot', { name: user?.name ?? user?.email ?? '' })}
                </span>
                <span className="size-[6px] shrink-0 rounded-full bg-[#12805A]" aria-hidden />
              </div>
            </section>

            {/* Sự kiện gửi thông báo */}
            <section className={CARD}>
              <div className="flex items-center justify-between px-[18px] py-[14px]">
                <p className={HEAD}>
                  {t('features.parish.notifEventsHead')}
                </p>
                <span className="flex w-fit items-center rounded-full bg-[#F7F4E7] px-[9px] py-1">
                  <span className="text-[10px] font-bold text-[#8A6412]">
                    {t('features.parish.notifEventsChip', { n: EVENTS.length })}
                  </span>
                </span>
              </div>
              <div className={RULE} aria-hidden />
              <ul>
                {EVENTS.map((ev) => (
                  <li
                    key={ev.code}
                    className="flex items-center justify-between gap-4 border-b border-[#F0F4EC] px-[18px] py-[10px] last:border-0"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="font-mono text-[10px] font-semibold text-[#52705F]">{ev.code}</span>
                      <span className="w-full text-[10.5px] text-[#9AAE9F]">
                        {t(`features.parish.notifEventSub.${ev.name}`)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'flex w-fit shrink-0 items-center gap-[6px] rounded-full border px-[9px] py-1',
                        view.inAppEnabled
                          ? 'border-[#CBE3D2] bg-[#E9F4EC]'
                          : 'border-[#E7EEE3] bg-[#F7F9F5]',
                      )}
                    >
                      <span
                        className={cn(
                          'size-[5px] rounded-full',
                          view.inAppEnabled ? 'bg-[#12805A]' : 'bg-[#97AB9E]',
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          'text-[10px] font-bold',
                          view.inAppEnabled ? 'text-[#1B6B45]' : 'text-[#5C7468]',
                        )}
                      >
                        {stateLabel(view.inAppEnabled, true)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Cột phụ 300px */}
          <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
            <section className={CARD}>
              <div className="px-4 py-[14px]">
                <p className={HEAD}>{t('features.parish.notifOverviewHead')}</p>
              </div>
              <div className={RULE} aria-hidden />
              <div className="flex flex-col gap-3 px-4 pb-4 pt-[14px]">
                <div className="flex w-fit items-end gap-2">
                  <span className="text-[30px] font-extrabold leading-[30px] tracking-[-1.2px] text-[#0B2E1F]">
                    {onCount}/{CHANNELS.length}
                  </span>
                  <span className="text-[11px] text-[#8AA298]">
                    {t('features.parish.notificationsOn')}
                  </span>
                </div>
                <div className="flex w-full gap-1">
                  {CHANNELS.map((c) => (
                    <span
                      key={c}
                      className={cn(
                        'h-[6px] flex-1 rounded-[3px]',
                        view[c] ? 'bg-[#12805A]' : 'bg-[#EEF3EB]',
                      )}
                      aria-hidden
                    />
                  ))}
                </div>
                {CHANNELS.map((c) => (
                  <div
                    key={c}
                    className="flex w-full items-center justify-between border-t border-[#F0F4EC] pt-[9px]"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'size-[6px] shrink-0 rounded-full',
                          view[c] ? 'bg-[#12805A]' : 'bg-[#C2D0C4]',
                        )}
                        aria-hidden
                      />
                      <span className="text-[11px] text-[#5C7468]">{t(LABEL_KEY[c])}</span>
                    </span>
                    <span
                      className={cn(
                        'font-mono text-[10px] font-bold',
                        view[c] ? 'text-[#1B6B45]' : 'text-[#B0BFB4]',
                      )}
                    >
                      {stateLabel(view[c], true)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] px-[14px] py-[13px]">
              <div
                className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
                aria-hidden
              />
              <span className="relative z-[1] flex w-fit items-center gap-[7px]">
                <Lightbulb className="size-[11px] text-[#F2D07A]" aria-hidden />
                <span className="font-mono text-[9px] font-bold tracking-[1.1px] text-[#F2D07A]">
                  {t('features.parish.notifTipLabel')}
                </span>
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
                {t('features.parish.notifTipBody')}
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
