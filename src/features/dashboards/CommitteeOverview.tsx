// Tổng quan ban hành giáo (route /community, index route) — "Mùa — Dashboard Mùa".
// Số liệu tổng hợp: GET /api/v1/dashboards/season (Reporting, read-model theo scope).
// Danh sách khu/cộng đoàn vẫn lấy từ ParishCoordination để hiện tên + phân công.
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Layers, MapPin, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { useSeasonContext } from '@/features/season/season-context'
import { cn } from '@/lib/utils'
import { useDashboardData, useSeasonDashboard } from './api'

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const HEAD = 'font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]'

type Tab = 'list' | 'community' | 'summary'

export default function CommitteeOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { season } = useSeasonContext()
  const { areas, coverage, communities, userNameById, isPending } = useDashboardData({
    withCommunities: true,
  })
  const {
    data: dashboard,
    isPending: dashboardPending,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useSeasonDashboard(season?.id)
  const summary = dashboard?.summary
  const [tab, setTab] = useState<Tab>('list')

  // "Cả mùa tắc ở đâu": khu thiếu người lên đầu, cùng số vai thiếu thì tiến độ thấp trước.
  const riskRows = useMemo(() => {
    const progressById = new Map((dashboard?.workAreas ?? []).map((row) => [row.workAreaId, row]))
    return areas
      .map((a) => ({
        id: a.id,
        name: a.name,
        leader: userNameById.get(a.leaderId) ?? null,
        officer: userNameById.get(a.officerId) ?? null,
        missingLeader: !a.leaderId,
        missingMaterialOfficer: !a.officerId,
        progress: progressById.get(a.id)?.progressPercent,
      }))
      .sort((x, y) => {
        const xIssues = Number(x.missingLeader) + Number(x.missingMaterialOfficer)
        const yIssues = Number(y.missingLeader) + Number(y.missingMaterialOfficer)
        return yIssues - xIssues || (x.progress ?? 101) - (y.progress ?? 101)
      })
  }, [areas, dashboard, userNameById])

  const communityRows = useMemo(
    () =>
      communities.map((c) => ({
        id: c.id,
        name: c.name,
        count: areas.filter((a) => a.communityId === c.id).length,
      })),
    [communities, areas],
  )

  const missingStaff = coverage.total - coverage.fullyStaffed
  const maxCommunity = Math.max(1, ...communityRows.map((c) => c.count))

  const STATS = [
    {
      key: 'inSeason',
      label: t('features.dashboards.statInSeason', { defaultValue: 'Trong mùa' }),
      value: coverage.total,
      hint: t('features.dashboards.statInSeasonSub', { defaultValue: 'Khu vực đang thiết lập trong mùa' }),
      icon: MapPin,
      tone: 'ok' as const,
    },
    {
      key: 'missingLeader',
      label: t('features.dashboards.statMissingLeader', { defaultValue: 'Thiếu trưởng khu' }),
      value: coverage.missingLeader,
      hint: t('features.dashboards.statMissingLeaderSub', { defaultValue: 'Chưa có người phụ trách khu' }),
      icon: Users,
      tone: 'warn' as const,
    },
    {
      key: 'missingOfficer',
      label: t('features.dashboards.statMissingOfficer', { defaultValue: 'Thiếu trưởng vật tư' }),
      value: coverage.missingMaterialOfficer,
      hint: t('features.dashboards.statMissingOfficerSub', { defaultValue: 'Thiếu trưởng nhóm vật tư' }),
      icon: Layers,
      tone: 'warn' as const,
    },
    {
      key: 'staffed',
      label: t('features.dashboards.statStaffed', { defaultValue: 'Đã đủ người' }),
      value: coverage.fullyStaffed,
      hint: t('features.dashboards.statStaffedSub', { defaultValue: 'Đủ trưởng khu và vật tư' }),
      icon: CheckCircle2,
      tone: 'ok' as const,
    },
  ]

  const TABS: { key: Tab; label: string }[] = [
    { key: 'list', label: t('features.dashboards.tabAreaList', { defaultValue: 'Danh sách khu vực' }) },
    { key: 'community', label: t('features.dashboards.tabByCommunity', { defaultValue: 'Khu vực theo cộng đoàn' }) },
    { key: 'summary', label: t('features.dashboards.tabSummary', { defaultValue: 'Tóm tắt tổng hợp' }) },
  ]

  const summaryRows = summary
    ? [
        {
          key: 'tasks',
          label: t('features.dashboards.taskProgress'),
          value: `${summary.tasks.completed}/${summary.tasks.total} · ${Math.round(summary.tasks.progressPercent)}%`,
          tone: '',
        },
        {
          key: 'materials',
          label: t('features.dashboards.shortageMaterials'),
          value: `${summary.materials.linesWithShortage}/${summary.materials.lines}`,
          tone: summary.materials.linesWithShortage ? 'text-[#A65A12]' : '',
        },
        {
          key: 'purchases',
          label: t('features.dashboards.pendingPurchases'),
          value: String(summary.purchases.pendingApproval),
          tone: '',
        },
        {
          key: 'readiness',
          label: t('features.dashboards.readyAreas'),
          value: `${summary.readiness.ready}/${summary.workAreas}`,
          tone: '',
        },
        {
          key: 'hours',
          label: t('features.dashboards.approvedHours'),
          value: String(summary.volunteers.approvedHours),
          tone: '',
        },
      ]
    : []

  return (
    <div>
      <PageHeader
        title={t('features.dashboards.committeeTitle')}
        sub={
          <span>
            {season?.name ?? t('features.dashboards.noSeason')}
            {' · '}
            {t('features.dashboards.committeeFinding', {
              missing: missingStaff,
              total: coverage.total,
            })}
          </span>
        }
        actions={
          season && (
            <button
              type="button"
              onClick={() => navigate('/community/areas')}
              className="flex h-[38px] items-center rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
            >
              <span className="text-[12px] font-semibold text-[#2C463A]">
                {t('features.dashboards.viewAllAreas')}
              </span>
            </button>
          )
        }
      />

      {isPending ? (
        <p className="font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
      ) : !season ? (
        <div className={CARD}>
          <EmptyState text={t('features.dashboards.noSeason')} />
        </div>
      ) : (
        <div className="flex w-full flex-col items-start gap-[16px]">
          <div className="grid w-full gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map(({ key, label, value, hint, icon: Icon, tone }) => (
              <section
                key={key}
                className="flex w-full flex-col gap-[10px] rounded-[16px] border border-[#E3EAE0] bg-white p-4 shadow-[0px_1px_2px_#06281B0A]"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={cn(
                      'grid size-[26px] shrink-0 place-items-center rounded-[8px]',
                      tone === 'ok' ? 'bg-[#EDF4EA]' : 'bg-[#F7F4E7]',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-[13px]',
                        tone === 'ok' ? 'text-[#3F7F5B]' : 'text-[#A8830F]',
                      )}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                    {label}
                  </span>
                </div>
                <div className="flex w-fit items-center gap-2">
                  <span className="text-[30px] font-extrabold leading-[30px] tracking-[-1px] text-[#0B2E1F]">
                    {value}
                  </span>
                  <span className="text-[10.5px] text-[#A3B4A9]">
                    {t('features.dashboards.areaUnit')}
                  </span>
                </div>
                <p className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</p>
              </section>
            ))}
          </div>

          <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
            <div className="flex w-full min-w-0 flex-1 flex-col gap-[16px]">
              <section className={CARD}>
                <div className="flex items-center justify-between px-[18px] py-[14px]">
                  <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]">
                    {t('features.dashboards.riskTableTitle')}
                  </p>
                  <span className="flex w-fit items-center rounded-full bg-[#F7F4E7] px-[9px] py-1">
                    <span className="text-[10px] font-bold text-[#9A6A0C]">
                      {t('features.dashboards.riskChip', {
                        defaultValue: '{{missing}}/{{total}} khu thiếu người',
                        missing: missingStaff,
                        total: coverage.total,
                      })}
                    </span>
                  </span>
                </div>
                <div className={RULE} aria-hidden />

                <div className="flex items-center px-[18px] py-[10px]">
                  <div className="flex w-fit items-center gap-[4px] rounded-[10px] bg-[#F0F4EC] p-[3px]">
                    {TABS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setTab(item.key)}
                        aria-pressed={tab === item.key}
                        className={cn(
                          'flex h-7 items-center rounded-[8px] px-[11px] text-[11px] transition-colors',
                          tab === item.key
                            ? 'bg-white font-bold text-[#0A5C36]'
                            : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {tab === 'list' ? (
                  <>
                    <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-[18px] py-[9px]">
                      <span className="min-w-0 flex-1 font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                        {t('features.tasks.area')}
                      </span>
                      <span className="w-[120px] shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                        {t('features.dashboards.missingRoles', { defaultValue: 'Còn thiếu' })}
                      </span>
                      <span className="w-[170px] shrink-0 text-right font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                        {t('features.dashboards.progress')}
                      </span>
                    </div>
                    {riskRows.length === 0 ? (
                      <EmptyState text={t('features.dashboards.noAreas')} className="py-8" />
                    ) : (
                      <ul>
                        {riskRows.map((row) => {
                          const staffed = !row.missingLeader && !row.missingMaterialOfficer
                          const pct = typeof row.progress === 'number' ? Math.round(row.progress) : 0
                          return (
                            <li
                              key={row.id}
                              className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-[18px] py-3 last:border-0"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                                <span className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-[#DDE8D6] bg-[#EDF4EA]">
                                  <span className="text-[10px] font-extrabold text-[#3F7F5B]">
                                    {row.name.trim().charAt(0).toUpperCase()}
                                  </span>
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col gap-px">
                                  <span className="w-full truncate text-[12px] font-bold text-[#0B2E1F]">
                                    {row.name}
                                  </span>
                                  <span className="w-full truncate text-[10px] text-[#9AAE9F]">
                                    {[row.leader, row.officer].filter(Boolean).join(' · ') || '—'}
                                  </span>
                                </div>
                              </div>
                              <span className="w-[120px] shrink-0">
                                <span
                                  className={cn(
                                    'inline-flex w-fit items-center gap-[6px] rounded-full border px-[9px] py-1',
                                    staffed
                                      ? 'border-[#CBE3D2] bg-[#E9F4EC]'
                                      : 'border-[#EDDFBB] bg-[#FDF6E7]',
                                  )}
                                >
                                  <span
                                    className={cn(
                                      'size-[5px] rounded-full',
                                      staffed ? 'bg-[#12805A]' : 'bg-[#C98A12]',
                                    )}
                                    aria-hidden
                                  />
                                  <span
                                    className={cn(
                                      'text-[10px] font-semibold',
                                      staffed ? 'text-[#1B6B45]' : 'text-[#8A6412]',
                                    )}
                                  >
                                    {staffed ? t('features.dashboards.staffed') : t('features.dashboards.missingRoles')}
                                  </span>
                                </span>
                              </span>
                              <div className="flex w-[170px] shrink-0 flex-col items-end gap-1">
                                <span className="font-mono text-[10px] font-bold text-[#5C7468]">{pct}%</span>
                                <span className="relative h-[5px] w-[120px] overflow-hidden rounded-[3px] bg-[#EEF3EB]">
                                  <span
                                    className="absolute left-0 top-0 h-[5px] rounded-[3px] bg-[#12805A]"
                                    style={{ width: `${Math.min(100, Math.max(pct, 1))}%` }}
                                    aria-hidden
                                  />
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </>
                ) : tab === 'community' ? (
                  <ul>
                    {communityRows.length === 0 ? (
                      <EmptyState text={t('common.empty')} className="py-8" />
                    ) : (
                      communityRows.map((c) => (
                        <li
                          key={c.id}
                          className="flex w-full flex-col gap-[6px] border-b border-[#F0F4EC] px-[18px] py-3 last:border-0"
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-[11.5px] text-[#3B5348]">{c.name}</span>
                            <span className="font-mono text-[10px] font-bold text-[#0B2E1F]">
                              {c.count} {t('features.dashboards.areaUnit')}
                            </span>
                          </div>
                          <span className="relative h-[5px] w-full overflow-hidden rounded-[3px] bg-[#EEF3EB]">
                            <span
                              className="absolute left-0 top-0 h-[5px] rounded-[3px] bg-[#12805A]"
                              style={{ width: `${Math.round((c.count / maxCommunity) * 100)}%` }}
                              aria-hidden
                            />
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                ) : dashboardError ? (
                  <ErrorState compact onRetry={() => void refetchDashboard()} />
                ) : dashboardPending || !summary ? (
                  <EmptyState text={t('common.loading')} className="py-8" />
                ) : (
                  <ul>
                    {summaryRows.map((row) => (
                      <li
                        key={row.key}
                        className="flex w-full items-center justify-between border-b border-[#F0F4EC] px-[18px] py-[9px] last:border-0"
                      >
                        <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                        <span className={cn('font-mono text-[10.5px] font-bold text-[#0B2E1F]', row.tone)}>
                          {row.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center justify-between border-t border-[#ECF1E9] px-[18px] py-[11px]">
                  <span className="text-[10.5px] text-[#96AAA0]">
                    {t('features.dashboards.riskFoot', {
                      defaultValue: 'Dựa trên phân công trưởng khu và trưởng nhóm vật tư của từng khu.',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/community/areas')}
                    className="text-[10.5px] font-bold text-[#0A5C36] hover:underline"
                  >
                    {t('features.dashboards.viewAllAreas')}
                  </button>
                </div>
              </section>

              {riskRows.length <= 1 && (
                <section className={cn(CARD, 'flex flex-col items-center justify-center gap-2 py-6')}>
                  <p className="text-[11px] text-[#A3B4A9]">
                    {t('features.dashboards.onlyOneArea', {
                      defaultValue: 'Mùa này hiện chỉ có {{n}} khu vực',
                      n: riskRows.length,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/community/areas?create=1')}
                    className="flex w-fit items-center gap-[6px] rounded-full border border-[#E7EEE3] bg-[#F7F9F5] px-[10px] py-[5px] text-[10px] font-semibold text-[#6B8175] hover:text-[#0A5C36]"
                  >
                    {t('features.areas.create')}
                  </button>
                </section>
              )}
            </div>

            <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
              <section className={CARD}>
                <div className="px-4 py-[14px]">
                  <p className={HEAD}>{t('features.dashboards.communityCoverage')}</p>
                </div>
                <div className={RULE} aria-hidden />
                <div className="flex flex-col gap-[10px] px-4 pb-[14px] pt-3">
                  {communityRows.length === 0 ? (
                    <p className="text-[10.5px] text-[#A3B4A9]">{t('common.empty')}</p>
                  ) : (
                    communityRows.map((c) => (
                      <div key={c.id} className="flex w-full flex-col gap-[6px]">
                        <div className="flex w-full items-center justify-between">
                          <span className="truncate text-[11px] text-[#3B5348]">{c.name}</span>
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold',
                              c.count ? 'text-[#0B2E1F]' : 'text-[#B0BFB4]',
                            )}
                          >
                            {c.count} {t('features.dashboards.areaUnit')}
                          </span>
                        </div>
                        <span className="relative h-[5px] w-full overflow-hidden rounded-[3px] bg-[#EEF3EB]">
                          <span
                            className="absolute left-0 top-0 h-[5px] rounded-[3px] bg-[#12805A]"
                            style={{ width: `${Math.round((c.count / maxCommunity) * 100)}%` }}
                            aria-hidden
                          />
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className={CARD}>
                <div className="px-4 py-[14px]">
                  <p className={HEAD}>{t('features.dashboards.summaryTitle')}</p>
                </div>
                <div className={RULE} aria-hidden />
                <div className="flex flex-col px-4 pb-3 pt-[6px]">
                  {dashboardError ? (
                    <ErrorState compact onRetry={() => void refetchDashboard()} />
                  ) : dashboardPending || !summary ? (
                    <p className="py-4 text-[10.5px] text-[#A3B4A9]">{t('common.loading')}</p>
                  ) : (
                    summaryRows.map((row) => (
                      <div
                        key={row.key}
                        className="flex w-full items-center justify-between border-b border-[#F0F4EC] py-[9px] last:border-0"
                      >
                        <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                        <span className={cn('font-mono text-[10.5px] font-bold text-[#0B2E1F]', row.tone)}>
                          {row.value}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {missingStaff > 0 && (
                <section className="relative flex w-full items-start gap-[10px] overflow-hidden rounded-[14px] bg-[#0A5C36] px-[14px] py-[13px]">
                  <div
                    className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
                    aria-hidden
                  />
                  <AlertTriangle className="relative z-[1] mt-px size-[13px] shrink-0 text-[#F2D07A]" aria-hidden />
                  <div className="relative z-[2] flex min-w-0 flex-1 flex-col gap-[6px]">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                      {t('features.dashboards.actionHead', { defaultValue: 'Cần xử lý' })}
                    </span>
                    <p className="text-[10.5px] leading-4 text-[#A9D7BF]">
                      {t('features.dashboards.actionBody', { defaultValue: 'Khu thiếu trưởng khu hoặc trưởng nhóm vật tư sẽ bị chặn xác nhận Ready.' })}
                    </p>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}
