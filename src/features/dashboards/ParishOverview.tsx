// Tổng quan quản trị giáo xứ (route /parish, index route).
// Dựng từ dữ liệu THẬT: /api/v1/parishes, /api/v1/seasons, /api/v1/work-areas,
// /api/v1/parishes/{id}/communities, /api/v1/users.
// Bố cục + màu + cỡ chữ lấy đúng từ bản thiết kế Pen "Tổng Quan Giáo Xứ — Dashboard".
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { CalendarDays, ChevronDown, CircleCheck, CircleX, UserCog, Users } from 'lucide-react'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { useParish } from '@/features/parish/api'
import { cn } from '@/lib/utils'
import { viDate } from '@/lib/format'
import type { Season } from '@/types'

export default function ParishOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: parish } = useParish()
  const { data: seasons = [], isPending } = useSeasons()
  const { data: areas = [] } = useAreas()
  const { data: communities = [] } = useCommunities()
  // Chỉ cần đếm tài khoản → bỏ request danh mục kỹ năng.
  const { data: users = [] } = useUsers({ withSkills: false })

  // "Đã sẵn sàng chưa": mùa đang chạy (hoặc mùa mới nhất) làm mốc kiểm tra.
  const focusSeason = useMemo(
    () => seasons.find((s) => s.status === 'ACTIVE') ?? seasons[0],
    [seasons],
  )
  // 26/11/2026: `GET /dashboards/season` chỉ dành cho role PARISH (ban hành giáo); ADMIN bị 403.
  // Màn tổng quan của ADMIN vì thế tự tính độ sẵn sàng từ danh sách khu vực.
  const missingLeader = areas.filter((a) => !a.leaderId).length
  const missingOfficer = areas.filter((a) => !a.officerId).length
  const areaTotal = areas.length
  const readyAreas = areas.filter((a) => a.status === 'READY').length
  const failedMandatoryItems = 0

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.season.name'),
        render: (s: Season) => <span className="font-semibold">{s.name}</span>,
      },
      {
        key: 'year',
        header: t('features.season.year'),
        align: 'right' as const,
        render: (s: Season) => <span className="tabular">{s.year}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (s: Season) => <StatusTag status={s.status} />,
      },
      {
        key: 'startDate',
        header: t('features.season.startDate'),
        align: 'right' as const,
        render: (s: Season) => <span className="tabular">{viDate(s.startDate)}</span>,
      },
      {
        key: 'endDate',
        header: t('features.season.endDate'),
        align: 'right' as const,
        render: (s: Season) => <span className="tabular">{viDate(s.endDate)}</span>,
      },
    ],
    [t],
  )

  const readyPct = areaTotal === 0 ? 0 : Math.round((readyAreas / areaTotal) * 100)
  const areaStatuses = Object.entries(
    areas.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1
      return acc
    }, {}),
  )

  // Cờ mốc sẵn sàng — dùng chung cho khối checklist và thanh tiến độ.
  const readyRows = [
    { key: 'season', ok: Boolean(focusSeason), label: t('features.dashboards.readySeason', { name: focusSeason?.name ?? '—' }) },
    { key: 'areas', ok: areaTotal > 0, label: t('features.dashboards.readyAreasCount', { count: areaTotal }) },
    { key: 'leader', ok: missingLeader === 0, label: t('features.dashboards.readyLeader', { count: missingLeader }) },
    { key: 'officer', ok: missingOfficer === 0, label: t('features.dashboards.readyOfficer', { count: missingOfficer }) },
    { key: 'ready', ok: readyAreas === areaTotal && areaTotal > 0, label: t('features.dashboards.readyChecklist', { ready: readyAreas, total: areaTotal }) },
    { key: 'failed', ok: failedMandatoryItems === 0, label: t('features.dashboards.readyFailedItems', { count: failedMandatoryItems }) },
  ]
  const okCount = readyRows.filter((r) => r.ok).length

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Page header — bản thiết kế Pen "Tổng Quan Giáo Xứ" */}
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[25px] font-extrabold leading-[29px] tracking-[-0.7px] text-[#0B2E1F]">
            {t('features.dashboards.adminTitle')}
          </h1>
          <p className="text-[11.5px] text-[#7C9287]">
            {parish ? parish.name : t('features.dashboards.adminSub')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/parish/seasons')}
          className="flex h-[38px] items-center gap-2 rounded-[11px] border border-[#DBE5D6] bg-white px-3"
        >
          <CalendarDays className="size-3.5 text-[#2C463A]" aria-hidden />
          <span className="text-[12px] font-semibold text-[#2C463A]">{focusSeason?.name ?? t('nav.parish.seasons')}</span>
          <ChevronDown className="size-3 text-[#8AA298]" aria-hidden />
        </button>
      </div>

      {/* Stats */}
      <div className="flex w-full flex-row gap-[14px]">
        <StatCard
          className="flex-1"
          label={t('features.dashboards.seasonCount')}
          value={seasons.length}
          hint={focusSeason ? String(focusSeason.year) : undefined}
          icon={CalendarDays}
        />
        <StatCard
          className="flex-1"
          label={t('features.dashboards.communityCount')}
          value={communities.length}
          icon={Users}
        />
        <StatCard
          className="flex-1"
          label={t('features.dashboards.accountCount')}
          value={users.length}
          icon={UserCog}
        />
      </div>

      {/* Cards row: cột trái (mùa + sẵn sàng) | cột phải (thẻ mùa + khu vực) */}
      <div className="flex w-full items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex w-full flex-col gap-0 rounded-[16px] border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between p-[15px_18px]">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-[#97AB9E]">
                {t('features.dashboards.seasonsList')}
              </p>
              <span className="flex items-center gap-[5px] rounded-full bg-[#F1F6EE] px-2 py-[3px] text-[10px] font-bold text-[#4F7A61]">
                {seasons.length} {t('features.dashboards.seasonCount')}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
            <DataTable
              rows={seasons}
              columns={columns}
              pageSize={10}
              emptyText={isPending ? t('common.loading') : t('features.dashboards.noSeason')}
            />
          </Card>

          <Card className="flex w-full flex-1 flex-col gap-0 rounded-[16px] border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between p-[15px_18px]">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-[#97AB9E]">
                {t('features.dashboards.readinessTitle')}
              </p>
              <span className="flex items-center gap-[5px] rounded-full bg-[#F1F6EE] px-2 py-[3px] text-[10px] font-bold text-[#4F7A61]">
                {okCount}/{readyRows.length}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
            <div className="flex w-full items-center justify-between gap-4 p-[14px_18px]">
              <div className="flex items-end gap-[9px]">
                <span className="text-[26px] font-extrabold leading-[26px] tracking-[-1px] text-[#0B2E1F]">
                  {readyPct}%
                </span>
                <span className="text-[10.5px] text-[#8AA298]">
                  {t('features.dashboards.readyChecklist', { ready: readyAreas, total: areaTotal })}
                </span>
              </div>
              <div className="flex w-[200px] items-center gap-1">
                {Array.from({ length: readyRows.length }).map((_, i) => (
                  <span
                    key={i}
                    className={cn('h-1.5 flex-1 rounded-[3px]', i < okCount ? 'bg-[#12805A]' : 'bg-[#F0E0BB]')}
                  />
                ))}
              </div>
            </div>
            {areas.length === 0 && isPending ? (
              <p className="p-[14px_18px] text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : (
              <ul className="flex w-full flex-col justify-around px-2.5 pb-2 pt-1">
                {readyRows.map((row) => (
                  <li key={row.key} className="flex w-full items-center gap-2.5 rounded-[9px] p-[6px_8px]">
                    {row.ok ? (
                      <CircleCheck className="size-4 shrink-0 text-[#12805A]" aria-hidden />
                    ) : (
                      <CircleX className="size-4 shrink-0 text-[#C98A12]" aria-hidden />
                    )}
                    <span className={cn('flex-1 text-[12px]', row.ok ? 'text-[#3B5348]' : 'font-medium text-[#8A5A00]')}>
                      {row.label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex w-[344px] shrink-0 flex-col gap-4">
          <div className="relative flex w-full flex-col gap-3 overflow-hidden rounded-[16px] border border-[#0E7A46] bg-[#0A5C36] p-4">
            <div className="pointer-events-none absolute -top-[70px] left-[210px] size-[200px] rounded-full bg-[#E9B949]/20 blur-[25px]" aria-hidden />
            <div className="relative flex w-full items-center justify-between">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8FD0AE]">
                {t('features.dashboards.seasonCount')}
              </p>
              {focusSeason && (
                <span className="rounded-[9px] bg-white/[0.12] px-2 py-[3px] text-[10.5px] font-semibold text-[#F6E4B8]">
                  <StatusTag status={focusSeason.status} />
                </span>
              )}
            </div>
            <p className="relative text-[21px] font-extrabold leading-[24px] text-white">
              {focusSeason?.name ?? '—'}
            </p>
            <p className="relative text-[10.5px] leading-4 text-[#A9D7BF]">
              {t('features.dashboards.adminScopeHint')}
            </p>
            <div className="relative flex w-full gap-2 pt-1">
              <div className="flex flex-1 flex-col gap-[3px] rounded-[10px] bg-white/[0.08] px-2.5 py-2">
                <span className="font-mono text-[8.5px] font-semibold tracking-[1px] text-[#8FD0AE]">
                  {t('features.season.startDate')}
                </span>
                <span className="font-mono text-[11.5px] font-bold text-white">
                  {focusSeason ? viDate(focusSeason.startDate) : '—'}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-[3px] rounded-[10px] bg-white/[0.08] px-2.5 py-2">
                <span className="font-mono text-[8.5px] font-semibold tracking-[1px] text-[#8FD0AE]">
                  {t('features.season.endDate')}
                </span>
                <span className="font-mono text-[11.5px] font-bold text-white">
                  {focusSeason ? viDate(focusSeason.endDate) : '—'}
                </span>
              </div>
            </div>
            <div className="relative flex w-full flex-col gap-1.5 pt-1">
              <div className="flex w-full items-start justify-between">
                <span className="text-[10px] text-[#A9D7BF]">{t('features.dashboards.progress')}</span>
                <span className="font-mono text-[10px] font-bold text-white">{readyPct}%</span>
              </div>
              <div className="relative h-[5px] w-full rounded-[3px] bg-white/15">
                <div className="absolute left-0 top-0 h-[5px] rounded-[3px] bg-[#E9B949]" style={{ width: `${readyPct}%` }} />
              </div>
            </div>
          </div>

          <Card className="flex w-full flex-col gap-0 rounded-[16px] border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between p-[15px_18px]">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-[#97AB9E]">
                {t('features.dashboards.areaStatusBreakdown')}
              </p>
              <span className="flex items-center gap-[5px] rounded-full bg-[#F1F6EE] px-2 py-[3px] text-[10px] font-bold text-[#4F7A61]">
                {areaTotal} {t('features.dashboards.areaUnit')}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
            <div className="flex w-full flex-col gap-3 px-[18px] pb-4 pt-1.5">
              {areaStatuses.length === 0 ? (
                <EmptyState text={t('common.empty')} className="py-4" />
              ) : (
                areaStatuses.map(([status, count]) => (
                  <div key={status} className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="size-[7px] rounded-[4px] bg-[#C98A12]" aria-hidden />
                        <span className="text-[11.5px] font-medium text-[#3B5348]">
                          <StatusTag status={status} />
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[#0B2E1F]">{count}</span>
                    </div>
                    <div className="flex h-1.5 w-full gap-[3px]">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-[3px]',
                            i < Math.round((count / Math.max(areaTotal, 1)) * 8) ? 'bg-[#C98A12]' : 'bg-[#EEF3EB]',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
