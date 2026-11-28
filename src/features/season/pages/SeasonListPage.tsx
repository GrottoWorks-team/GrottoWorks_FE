// Trang danh sách mùa (COMMITTEE): số liệu mùa + bảng mùa một thẻ liền,
// tạo/sửa qua SeasonFormDialog, chốt mùa/kích hoạt/lưu trữ qua ConfirmDialog.
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Mùa Giáng sinh — Danh Sách".
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Calendar, Copy, LockKeyhole, Pencil, Rocket } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useAreas } from '@/features/areas/api'
import { useSeasons, useCompleteSeason, useActivateSeason, useArchiveSeason } from '../api'
import { SeasonFormDialog } from './SeasonFormDialog'
import { CloneSeasonDialog } from './CloneSeasonDialog'
import { SeasonActivateDialog, validateSeasonActivation } from './SeasonActivateDialog'
import type { Season } from '@/types'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import i18n from '@/lib/i18n'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]'

const STATUS_STYLE: Record<string, { pill: string; dot: string; text: string }> = {
  PLANNING: { pill: 'border-[#EDD9A6] bg-[#FCF3DE]', dot: 'bg-[#C98A12]', text: 'text-[#9A6A0C]' },
  ACTIVE: { pill: 'border-[#CBE3D2] bg-[#E9F4EC]', dot: 'bg-[#12805A]', text: 'text-[#1B6B45]' },
  COMPLETED: { pill: 'border-[#DDE8D6] bg-[#F1F6EE]', dot: 'bg-[#5C7468]', text: 'text-[#3B5348]' },
  ARCHIVED: { pill: 'border-[#E7EEE3] bg-[#F7F9F5]', dot: 'bg-[#97AB9E]', text: 'text-[#6B8175]' },
}

export default function SeasonListPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  // 12/11/2026: chỉ ban hành giáo (COMMUNITY = BE `PARISH`) được tạo/tương tác;
  // ADMIN hệ thống (FE `PARISH`) chỉ xem — trang được nhúng vào hub "Giáo xứ & cộng đoàn".
  const canManage = user?.role === 'COMMUNITY'
  const { data: seasons = [], isPending } = useSeasons()
  const { data: communities = [] } = useCommunities()
  const { data: areas = [] } = useAreas()
  const completeSeason = useCompleteSeason()
  const activateSeason = useActivateSeason()
  const archiveSeason = useArchiveSeason()

  const [formOpen, setFormOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [editing, setEditing] = useState<Season | null>(null)
  const [closing, setClosing] = useState<Season | null>(null)
  const [archiving, setArchiving] = useState<Season | null>(null)
  const [activatingCheck, setActivatingCheck] = useState<Season | null>(null)
  const [activatingConfirm, setActivatingConfirm] = useState<Season | null>(null)
  // 409/412 từ server: giữ dialog kiểm tra mở và hiện đúng danh sách BE trả về.
  const [activationServer, setActivationServer] = useState<{
    message: string
    issues: string[]
  } | null>(null)

  const active = seasons.filter((s) => s.status === 'ACTIVE')
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  const communityMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of communities) map[c.id] = c.name
    return map
  }, [communities])

  const communityIdsOf = (s: Season) => [
    ...new Set(
      areas.filter((a) => a.seasonId === s.id).map((a) => a.communityId).filter(Boolean),
    ),
  ] as string[]

  const onActivateClick = (s: Season) => {
    const areasOfSeason = areas.filter((a) => a.seasonId === s.id)
    const { canActivate } = validateSeasonActivation(s, areasOfSeason)
    setActivationServer(null)
    if (canActivate) {
      setActivatingConfirm(s)
    } else {
      setActivatingCheck(s)
    }
  }

  const onConfirmActivate = async (s: Season) => {
    try {
      await activateSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.activateSuccess', { year: s.year }))
      setActivatingConfirm(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
      // Server kiểm tra lại (409/412) → mở checklist kèm lý do/danh sách của BE.
      if (e instanceof ApiError && (e.status === 409 || e.status === 412)) {
        setActivationServer({
          message: e.message,
          issues: e.errors ? Object.values(e.errors).flat() : [],
        })
        setActivatingConfirm(null)
        setActivatingCheck(s)
      }
    }
  }

  // Link "Sửa tại đây" trong dialog kích hoạt → mở đúng khu, đúng mùa.
  const areaFixHref = (areaId: string) => {
    const base = user?.role === 'COMMUNITY' ? '/community/areas' : '/parish/communities'
    const params = new URLSearchParams({ area: areaId })
    if (user?.role !== 'COMMUNITY') params.set('tab', 'areas')
    if (activatingCheck?.id) params.set('season', activatingCheck.id)
    return `${base}?${params.toString()}`
  }

  const onCloseSeason = async (s: Season) => {
    try {
      await completeSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.closed', { year: s.year }))
      setClosing(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  const onArchiveSeason = async (s: Season) => {
    try {
      await archiveSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.archived', { year: s.year }))
      setArchiving(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  const manageActions = canManage ? (
    <>
      <button
        type="button"
        onClick={() => setCloneOpen(true)}
        className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
      >
        <Copy className="size-[13px] text-[#5C7468]" aria-hidden />
        <span className="text-[12px] font-semibold text-[#2C463A]">
          {t('features.season.cloneTitle')}
        </span>
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(null)
          setFormOpen(true)
        }}
        className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
      >
        <Calendar className="size-[13px] text-[#F2D07A]" aria-hidden />
        <span className="text-[12px] font-bold text-white">{t('features.season.create')}</span>
      </button>
    </>
  ) : undefined

  const year = seasons[0]?.year ?? new Date().getFullYear()
  const hasPlanning = seasons.some((s) => s.status === 'PLANNING')

  const STATS = [
    {
      key: 'total',
      label: t('features.season.statTotal', { defaultValue: 'Mùa đã tạo' }),
      value: seasons.length,
      unit: t('features.season.statTotalUnit', { defaultValue: 'mùa' }),
      hint: t('features.season.statTotalSub', { defaultValue: 'Toàn bộ mùa Giáng sinh đã khai báo' }),
    },
    {
      key: 'active',
      label: t('features.season.statActive', { defaultValue: 'Mùa đang chạy' }),
      value: active.length,
      unit: t('features.season.statTotalUnit', { defaultValue: 'mùa' }),
      hint: active.length
        ? t('features.season.statActiveSub', { defaultValue: 'Mùa đang áp dụng cho toàn giáo xứ' })
        : t('features.season.statActiveNone', { defaultValue: 'Chưa có mùa nào được kích hoạt' }),
    },
    {
      key: 'budget',
      label: t('features.season.statBudget', { defaultValue: 'Ngân sách mùa đang chạy' }),
      value: active.reduce((sum, s) => sum + s.budget, 0).toLocaleString(locale),
      unit: '₫',
      hint: t('features.season.statBudgetSub', { defaultValue: 'Tổng ngân sách của mùa đang chạy' }),
    },
  ]

  return (
    <div>
      {embedded ? (
        manageActions && <div className="mb-4 flex justify-end gap-2">{manageActions}</div>
      ) : (
        <PageHeader
          title={t('features.season.title')}
          sub={
            <span>
              {t('features.season.listFindingShort', {
                defaultValue: '{{active}} mùa đang chạy trên {{total}} mùa · ',
                active: active.length,
                total: seasons.length,
              })}
              {t('features.season.sub')}
            </span>
          }
          actions={manageActions}
        />
      )}

      {embedded && !canManage && (
        <p className="mb-4 rounded-[12px] border border-[#E3EAE0] bg-[#F7F9F5] px-3 py-2 text-xs leading-relaxed text-[#7C9287]">
          {t('features.parish.seasonsReadOnly')}
        </p>
      )}

      <div className="grid gap-[14px] sm:grid-cols-3">
        {STATS.map((stat) => (
          <section
            key={stat.key}
            className="flex w-full flex-col gap-[10px] rounded-[16px] border border-[#E3EAE0] bg-white p-4 shadow-[0px_1px_2px_#06281B0A]"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="grid size-[26px] shrink-0 place-items-center rounded-[8px] bg-[#EDF4EA]">
                <Calendar className="size-[13px] text-[#3F7F5B]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                {stat.label}
              </span>
            </div>
            <div className="flex w-fit items-center gap-2">
              <span className="max-w-full truncate text-[30px] font-extrabold leading-[30px] tracking-[-1px] text-[#0B2E1F]">
                {stat.value}
              </span>
              <span className="text-[10.5px] text-[#A3B4A9]">{stat.unit}</span>
            </div>
            <p className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{stat.hint}</p>
          </section>
        ))}
      </div>

      <section className={cn(CARD, 'mt-[16px]')}>
        <div className="flex items-center justify-between px-[18px] py-[14px]">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
            {t('features.season.tableHead', { defaultValue: 'Mùa Giáng sinh' })}
          </p>
          <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1">
            <span className="text-[10px] font-bold text-[#4F7A61]">
              {t('features.season.countChip', {
                defaultValue: '{{n}} mùa',
                n: seasons.length,
              })}
            </span>
          </span>
        </div>
        <div className={RULE} aria-hidden />

        <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-[18px] py-[10px]">
          <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.season.name')}</span>
          <span className={cn(TH, 'w-[150px] shrink-0')}>{t('features.season.period')}</span>
          <span className={cn(TH, 'w-[96px] shrink-0 text-right')}>{t('features.season.communities')}</span>
          <span className={cn(TH, 'w-[110px] shrink-0 text-right')}>{t('features.season.budget')}</span>
          <span className={cn(TH, 'w-[104px] shrink-0')}>{t('common.status')}</span>
          <span className={cn(TH, 'w-[180px] shrink-0')}>{t('features.season.description')}</span>
          {canManage ? (
            <span className={cn(TH, 'w-[56px] shrink-0 text-right')}>{t('common.actions')}</span>
          ) : (
            <span className="w-[56px] shrink-0" aria-hidden />
          )}
        </div>

        {isPending ? (
          <p className="px-[18px] py-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
        ) : seasons.length === 0 ? (
          <p className="px-[18px] py-8 text-center text-[11px] text-[#A3B4A9]">
            {t('features.season.empty')}
          </p>
        ) : (
          <ul>
            {seasons.map((s) => {
              const style = STATUS_STYLE[s.status] ?? STATUS_STYLE.ARCHIVED
              const ids = communityIdsOf(s)
              const communityNames = ids.map((id) => communityMap[id] ?? id).join(', ')
              const editable = canManage && s.status === 'PLANNING'
              return (
                <li
                  key={s.id}
                  onClick={
                    editable
                      ? () => {
                          setEditing(s)
                          setFormOpen(true)
                        }
                      : undefined
                  }
                  className={cn(
                    'flex w-full items-center gap-3 border-b border-[#F0F4EC] px-[18px] py-[11px] last:border-0',
                    editable && 'cursor-pointer hover:bg-[#FAFCF7]',
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <span className="w-full truncate text-[12.5px] font-bold text-[#0B2E1F]">
                      {s.name}
                    </span>
                    <span className="w-full truncate text-[10px] text-[#9AAE9F]">
                      {t('features.season.year')} {s.year}
                    </span>
                  </div>
                  <span className="w-[150px] shrink-0 truncate font-mono text-[9.5px] text-[#5C7468]">
                    {viDate(s.startDate)} → {viDate(s.endDate)}
                  </span>
                  <span
                    className="w-[96px] shrink-0 truncate text-right text-[11px] text-[#5C7468]"
                    title={communityNames || undefined}
                  >
                    {ids.length
                      ? t('features.season.communityCount', {
                          defaultValue: '{{n}} Cộng đoàn',
                          n: ids.length,
                        })
                      : '—'}
                  </span>
                  <span className="w-[110px] shrink-0 text-right font-mono text-[10.5px] font-bold text-[#0B2E1F]">
                    {s.budget.toLocaleString(locale)} ₫
                  </span>
                  <span className="w-[104px] shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center gap-[6px] rounded-full border px-[9px] py-1',
                        style.pill,
                      )}
                    >
                      <span className={cn('size-[5px] rounded-full', style.dot)} aria-hidden />
                      <span className={cn('text-[10px] font-semibold', style.text)}>
                        {t(`status.${s.status}`)}
                      </span>
                    </span>
                  </span>
                  <span
                    className="w-[180px] shrink-0 truncate text-[10.5px] text-[#9AAE9F]"
                    title={s.description || undefined}
                  >
                    {s.description || '—'}
                  </span>
                  <div
                    className="flex w-[56px] shrink-0 items-center justify-end gap-[2px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canManage && s.status === 'PLANNING' && (
                      <button
                        type="button"
                        aria-label={t('features.season.activate')}
                        onClick={() => onActivateClick(s)}
                        className="grid size-[26px] place-items-center rounded-[8px] text-[#0A5C36] transition-colors hover:bg-[#F1F6EE]"
                      >
                        <Rocket className="size-[13px]" aria-hidden />
                      </button>
                    )}
                    {canManage && s.status === 'PLANNING' && (
                      <button
                        type="button"
                        aria-label={t('common.edit')}
                        onClick={() => {
                          setEditing(s)
                          setFormOpen(true)
                        }}
                        className="grid size-[26px] place-items-center rounded-[8px] text-[#8AA298] transition-colors hover:bg-[#F1F6EE] hover:text-[#0A5C36]"
                      >
                        <Pencil className="size-[13px]" aria-hidden />
                      </button>
                    )}
                    {canManage && s.status === 'COMPLETED' && (
                      <button
                        type="button"
                        aria-label={t('features.season.archive')}
                        onClick={() => setArchiving(s)}
                        className="grid size-[26px] place-items-center rounded-[8px] text-[#C98A12] transition-colors hover:bg-[#FDF6E7]"
                      >
                        <Archive className="size-[13px]" aria-hidden />
                      </button>
                    )}
                    {canManage && s.status !== 'COMPLETED' && s.status !== 'ARCHIVED' && (
                      <button
                        type="button"
                        aria-label={t('features.season.close')}
                        onClick={() => setClosing(s)}
                        className="grid size-[26px] place-items-center rounded-[8px] text-[#8AA298] transition-colors hover:bg-[#F1F6EE] hover:text-[#0A5C36]"
                      >
                        <LockKeyhole className="size-[13px]" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-[#ECF1E9] px-[18px] py-[11px]">
          <span className="text-[10.5px] text-[#96AAA0]">
            {hasPlanning
              ? t('features.season.footPlanning', {
                  defaultValue: 'Mùa chưa kích hoạt — bấm Tạo mùa để bắt đầu mùa Giáng sinh {{year}}.',
                  year,
                })
              : t('features.season.footActive', {
                  defaultValue: 'Mùa đang chạy — mọi thay đổi sẽ ghi vào nhật ký hệ thống.',
                })}
          </span>
          {user?.role !== 'COMMUNITY' && (
            <a
              href="/parish/point-rules"
              className="text-[10.5px] font-bold text-[#0A5C36] hover:underline"
            >
              {t('features.season.viewPointRules', { defaultValue: 'Xem quy tắc điểm' })}
            </a>
          )}
        </div>
      </section>

      {formOpen && (
        <SeasonFormDialog season={editing} onClose={() => setFormOpen(false)} />
      )}
      {cloneOpen && <CloneSeasonDialog onClose={() => setCloneOpen(false)} />}
      <ConfirmDialog
        open={Boolean(closing)}
        title={t('features.season.closeTitle')}
        description={
          closing ? t('features.season.closeConfirm', { year: closing.year }) : undefined
        }
        confirmLabel={t('features.season.close')}
        onConfirm={() => closing && onCloseSeason(closing)}
        onClose={() => setClosing(null)}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        title={t('features.season.archiveTitle')}
        description={
          archiving ? t('features.season.archiveConfirm', { year: archiving.year }) : undefined
        }
        confirmLabel={t('features.season.archive')}
        onConfirm={() => archiving && onArchiveSeason(archiving)}
        onClose={() => setArchiving(null)}
      />
      <ConfirmDialog
        open={Boolean(activatingConfirm)}
        title={t('features.season.activateTitle', { year: activatingConfirm?.year })}
        description={
          activatingConfirm
            ? t('features.season.activateConfirm', { year: activatingConfirm.year })
            : undefined
        }
        confirmLabel={t('features.season.activate')}
        onConfirm={() => activatingConfirm && onConfirmActivate(activatingConfirm)}
        onClose={() => setActivatingConfirm(null)}
      />
      {activatingCheck && (
        <SeasonActivateDialog
          season={activatingCheck}
          areas={areas}
          onClose={() => {
            setActivatingCheck(null)
            setActivationServer(null)
          }}
          fixAreaHref={areaFixHref}
          serverMessage={activationServer?.message}
          serverIssues={activationServer?.issues}
        />
      )}
    </div>
  )
}
