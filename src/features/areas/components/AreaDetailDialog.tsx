// Ngăn kéo chi tiết khu vực (phải, 488px) — bố cục theo bản thiết kế Pen
// "Khu vực — Chi tiết Thông tin chung / Nhu cầu vật tư / Hình ảnh".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, X } from 'lucide-react'
import { useArea, useAreaProgress, useSeasons, useUsers } from '../api'
import { AreaMaterialsTab } from './AreaMaterialsTab'
import { AreaImagesTab } from './AreaImagesTab'
import { cn } from '@/lib/utils'

interface AreaDetailDialogProps {
  areaId: string | null
  open: boolean
  onClose: () => void
}

type Tab = 'info' | 'materials' | 'images'

const STATUS_STYLE: Record<string, { pill: string; dot: string; text: string }> = {
  PLANNING: { pill: 'border-[#EDD9A6] bg-[#FCF3DE]', dot: 'bg-[#C98A12]', text: 'text-[#9A6A0C]' },
  ACTIVE: { pill: 'border-[#CBE3D2] bg-[#E9F4EC]', dot: 'bg-[#12805A]', text: 'text-[#1B6B45]' },
  READY: { pill: 'border-[#CBE3D2] bg-[#E9F4EC]', dot: 'bg-[#12805A]', text: 'text-[#1B6B45]' },
  COMPLETED: { pill: 'border-[#DDE8D6] bg-[#F1F6EE]', dot: 'bg-[#5C7468]', text: 'text-[#3B5348]' },
  ARCHIVED: { pill: 'border-[#E7EEE3] bg-[#F7F9F5]', dot: 'bg-[#97AB9E]', text: 'text-[#6B8175]' },
}

const LABEL = 'font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

export function AreaDetailDialog({ areaId, open, onClose }: AreaDetailDialogProps) {
  const { t } = useTranslation()
  const { data: area, isPending } = useArea(areaId ?? undefined)
  const { data: progress, isPending: progressPending } = useAreaProgress(areaId ?? undefined)
  const { data: seasons = [] } = useSeasons()
  const { data: users = [] } = useUsers()
  const season = seasons.find((row) => row.id === area?.seasonId)
  const nameOf = (id?: string | null) =>
    (id ? users.find((row) => row.id === id)?.name : '') ?? '—'
  const [activeTab, setActiveTab] = useState<Tab>('info')

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const style = STATUS_STYLE[area?.status ?? ''] ?? STATUS_STYLE.ARCHIVED
  const seasonLabel = season
    ? t('features.areas.seasonBadge', { year: season.year })
    : area?.seasonId
      ? `#${area.seasonId.slice(0, 8)}`
      : '—'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info', label: t('features.areas.tabs.info', { defaultValue: 'Thông tin chung' }) },
    { key: 'materials', label: t('features.requirements.tabTitle', { defaultValue: 'Nhu cầu vật tư' }) },
    { key: 'images', label: t('features.areas.tabs.images', { defaultValue: 'Hình ảnh' }) },
  ]

  const infoRows = [
    {
      key: 'id',
      label: t('features.areas.codeId', { defaultValue: 'Mã khu vực (ID)' }),
      value: area ? `#${area.id.slice(0, 8)}` : '—',
      mono: true,
    },
    {
      key: 'type',
      label: t('features.areas.typeLabel'),
      value: area?.type ? t(`features.areas.type.${area.type}`, { defaultValue: area.type }) : '—',
      mono: false,
    },
    {
      key: 'status',
      label: t('features.areas.buildStatusLabel'),
      value: area ? t(`status.${area.status}`) : '—',
      mono: false,
    },
    {
      key: 'season',
      label: t('features.areas.seasonCodeLabel'),
      value: seasonLabel,
      mono: true,
    },
    {
      key: 'community',
      label: t('features.areas.communityInCharge'),
      value: area?.communityId ? `${area.communityId.slice(0, 8)}…` : '—',
      mono: true,
    },
    {
      key: 'version',
      label: t('features.areas.versionLabel'),
      value: 'v1',
      mono: true,
    },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={t('features.areas.detail')}>
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 bg-[#06281B59]"
      />
      <section className="relative flex h-full w-full max-w-[488px] flex-col overflow-hidden rounded-l-[22px] border-l border-[#E3EAE0] bg-white shadow-[-20px_0px_40px_#06281B26]">
        {/* Đầu */}
        <div className="flex w-full flex-col gap-[10px] px-5 pb-[14px] pt-[18px]">
          <div className="flex w-full items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              {isPending ? (
                <span className="text-[13px] text-[#8AA298]">{t('common.loading')}</span>
              ) : (
                <span className="w-full truncate text-[16px] font-extrabold tracking-[-0.3px] text-[#0B2E1F]">
                  {area?.name || t('features.areas.fallbackName', { id: (area?.id ?? '').slice(0, 8) })}
                </span>
              )}
              <span className="w-full truncate text-[10.5px] text-[#8AA298]">
                {t('features.areas.detailSub', { defaultValue: 'Chi tiết Phân khu thi công hang đá · Mùa' })}{' '}
                {season?.year ?? area?.seasonId?.slice(0, 8) ?? ''}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#F6F8F4] text-[#5C7468] transition-colors hover:bg-[#ECF1E9]"
            >
              <X className="size-[14px]" aria-hidden />
            </button>
          </div>
          <div className="flex w-full items-center gap-2">
            <span className={cn('flex w-fit items-center gap-[6px] rounded-full border px-[9px] py-1', style.pill)}>
              <span className={cn('size-[5px] rounded-full', style.dot)} aria-hidden />
              <span className={cn('text-[10px] font-semibold', style.text)}>
                {area ? t(`status.${area.status}`) : '—'}
              </span>
            </span>
            <span className="flex w-fit items-center rounded-full bg-[#F7F9F5] px-[9px] py-1 font-mono text-[9px] text-[#8C9F94]">
              #{area ? area.id.slice(0, 8) : '—'}
            </span>
          </div>
        </div>

        {/* Tab */}
        <div className="flex w-full items-start gap-[18px] border-b border-[#ECF1E9] px-5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-pressed={activeTab === tab.key}
              className={cn(
                'flex h-[34px] shrink-0 flex-col justify-center border-b-2 py-[9px] text-[11.5px] transition-colors',
                activeTab === tab.key
                  ? 'border-[#0A5C36] font-bold text-[#0A5C36]'
                  : 'border-transparent font-medium text-[#8C9F94] hover:text-[#0B2E1F]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Nội dung */}
        <div className="flex w-full flex-1 flex-col gap-[14px] overflow-y-auto px-5 py-4">
          {activeTab === 'images' && areaId ? (
            <AreaImagesTab areaId={areaId} />
          ) : activeTab === 'materials' && areaId ? (
            <AreaMaterialsTab workAreaId={areaId} />
          ) : isPending ? (
            <p className="py-8 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
          ) : !area ? (
            <p className="py-8 text-center text-sm text-[#7C9287]">
              {t('common.notFound', { defaultValue: 'Không tìm thấy thông tin khu vực.' })}
            </p>
          ) : (
            <>
              <div className="flex w-full flex-col">
                {infoRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#F2F5EF] py-2"
                  >
                    <span className="min-w-0 flex-1 text-[11px] text-[#8AA298]">{row.label}</span>
                    <span
                      className={cn(
                        'shrink-0 truncate text-[11px] text-[#233A2E]',
                        row.mono ? 'font-mono text-[9.5px] font-medium' : 'font-semibold',
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex w-full flex-col gap-[5px] rounded-[12px] border border-[#EDF1E9] bg-[#F7F9F5] px-[13px] py-[11px]">
                <span className={LABEL}>{t('features.areas.description')}</span>
                <p className="w-full text-[11px] leading-[17px] text-[#3B5348]">
                  {area.description || '—'}
                </p>
              </div>

              <div className="flex w-full flex-col gap-[10px] rounded-[12px] border border-[#E3EAE0] bg-white px-[13px] py-3">
                <span className={LABEL}>{t('features.areas.progressWork', { defaultValue: 'Tiến độ công việc' })}</span>
                {progressPending ? (
                  <p className="text-[10.5px] text-[#8AA298]">{t('common.loading')}</p>
                ) : !progress ? (
                  <p className="text-[10.5px] text-[#8AA298]">
                    {t('features.areas.progressUnavailable', { defaultValue: t('features.areas.noProgress') })}
                  </p>
                ) : (
                  <div className="grid w-full grid-cols-4 gap-2">
                    {[
                      { key: 'total', label: t('features.areas.totalTasks', { defaultValue: 'Tổng việc' }), value: progress.totalTasks, tone: 'text-[#0B2E1F]' },
                      { key: 'done', label: t('features.areas.completedTasks', { defaultValue: 'Hoàn thành' }), value: progress.completedTasks, tone: 'text-[#1B6B45]' },
                      { key: 'late', label: t('features.areas.overdueTasks', { defaultValue: 'Trễ hạn' }), value: progress.overdueTasks, tone: 'text-[#A65A37]' },
                      { key: 'cancelled', label: t('features.areas.cancelledTasks', { defaultValue: 'Đã huỷ' }), value: progress.cancelledTasks, tone: 'text-[#8C9F94]' },
                    ].map((cell) => (
                      <div key={cell.key} className="flex flex-col gap-[2px] rounded-[10px] bg-[#F7F9F5] px-[10px] py-2">
                        <span className="text-[9px] text-[#96AAA0]">{cell.label}</span>
                        <span className={cn('font-mono text-[15px] font-bold', cell.tone)}>{cell.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col gap-2 rounded-[12px] border border-[#E3EAE0] bg-white px-[13px] py-[11px]">
                <span className={LABEL}>{t('features.areas.assignment', { defaultValue: 'Phân công' })}</span>
                {[
                  { key: 'leader', label: t('features.areas.leader'), value: nameOf(area.leaderId) },
                  { key: 'officer', label: t('features.areas.officer'), value: nameOf(area.officerId) },
                  { key: 'community', label: t('features.areas.communityInCharge'), value: area.communityId ? `#${area.communityId.slice(0, 8)}` : '—' },
                ].map((row) => (
                  <div key={row.key} className="flex w-full items-center justify-between gap-[10px]">
                    <span className="text-[10px] text-[#96AAA0]">{row.label}</span>
                    <span className="truncate text-[10.5px] font-semibold text-[#233A2E]">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1 text-[10px] text-[#A3B4A9]">
                <ShieldCheck className="size-[13px] shrink-0 text-[#7FA391]" aria-hidden />
                <span>{t('features.areas.verifiedNote')}</span>
              </div>
            </>
          )}
        </div>

        {/* Chân */}
        <div className="flex w-full items-center justify-between gap-[10px] border-t border-[#ECF1E9] px-5 py-3">
          <span className="min-w-0 flex-1 text-[10px] leading-[14px] text-[#A3B4A9]">
            {t('features.areas.backendNote', { defaultValue: 'Dữ liệu xác thực từ backend ParishCoordination' })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 shrink-0 items-center justify-center rounded-[9px] bg-[#0A5C36] px-[14px] transition-colors hover:bg-[#0D7344]"
          >
            <span className="text-[11.5px] font-bold text-white">{t('common.close')}</span>
          </button>
        </div>
      </section>
    </div>
  )
}
