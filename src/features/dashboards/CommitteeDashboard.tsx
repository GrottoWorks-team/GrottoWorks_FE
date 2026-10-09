// Dashboard ban hành giáo (route /community, index route): dải tiến độ mùa +
// 4 StatCard count-up, khu vực vòm (animated progress), HoursChart tuần
// hiện tại, bảng "Việc cần chú ý". Dữ liệu: GET /api/dashboard/community +
// seasons (mùa ACTIVE) + timesheets (vẽ chart) + activity (nhật ký).
import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeasons } from '@/features/season/api'
import { useTimesheets } from '@/features/timesheets/api'
import { viDate } from '@/lib/format'
import { useActivity, useCommitteeSummary } from './api'
import { AdventProgress } from './components/AdventProgress'
import { HoursChart, type DayHours } from './components/HoursChart'
import type { ActivityLog } from '@/types'

const d = (n: number) => ({ '--d': n }) as CSSProperties

export default function CommitteeDashboard() {
  const { t } = useTranslation()
  const { data: summary, isPending } = useCommitteeSummary()
  const { data: seasons = [] } = useSeasons()
  const activeSeason = seasons.find((s) => s.status === 'ACTIVE')
  const { data: timesheets = [] } = useTimesheets()
  const { data: activity = [] } = useActivity()

  const navigate = useNavigate()

  // Chart giờ công: group theo ngày, 14 ngày cuối. Mốc "tuần hiện tại" của
  // mock = 7 ngày tính từ ngày chấm công cuối (weekFrom, handlers.ts) — FE
  // suy lại cùng quy tắc: ngày cuối dữ liệu trừ 6, toLocale ISO. Cột trong
  // tuần hiện tại tô terra, tuần trước moss nhạt.
  const chart = useMemo(() => {
    const byDate: Record<string, number> = {}
    for (const x of timesheets) byDate[x.date] = (byDate[x.date] ?? 0) + x.hours
    const days = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0]))
    let weekFrom: string | undefined
    if (days.length) {
      const last = new Date(`${days[days.length - 1][0]}T00:00:00Z`)
      last.setUTCDate(last.getUTCDate() - 6)
      weekFrom = last.toISOString().slice(0, 10)
    }
    return {
      weekFrom,
      data: days.slice(-14).map(([date, hours]): DayHours => ({ date, hours })),
    }
  }, [timesheets])

  const attentionRows = useMemo(() => activity.slice(0, 5), [activity])
  const attentionColumns = useMemo(
    () => [
      {
        key: 'action',
        header: t('features.dashboards.action'),
        render: (r: ActivityLog) => <span className="font-semibold">{r.action}</span>,
      },
      {
        key: 'target',
        header: t('features.dashboards.target'),
        render: (r: ActivityLog) => <span className="tabular">{r.target}</span>,
      },
      {
        key: 'at',
        header: t('features.dashboards.time'),
        align: 'right' as const,
        render: (r: ActivityLog) => (
          <span className="tabular">{viDate(r.at.slice(0, 10))}</span>
        ),
      },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={t('features.dashboards.committeeTitle')}
        sub={t('features.dashboards.committeeSub')}
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !summary ? null : (
        <div className="space-y-6">
          {activeSeason && <AdventProgress season={activeSeason} />}

          {/* 4 StatCard count-up — tone theo mức độ cần chú ý. */}
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div style={d(0)}>
              <StatCard
                label={t('features.dashboards.shortageMaterials')}
                value={summary.materialsShortage}
                tone="alert"
              />
            </div>
            <div style={d(1)}>
              <StatCard
                label={t('features.dashboards.pendingPurchases')}
                value={summary.pendingPurchases}
                tone="warn"
              />
            </div>
            <div style={d(2)}>
              <StatCard
                label={t('features.dashboards.donationPercent')}
                value={summary.donationPercent}
                unit="%"
                tone="ok"
              />
            </div>
            <div style={d(3)}>
              <StatCard
                label={t('features.dashboards.weekHours')}
                value={summary.weekHours}
                unit={t('features.volunteers.hourUnit')}
                tone="ok"
              />
            </div>
          </div>

          {/* Khu vực + (giờ công, việc cần chú ý): 2 cột trên màn rộng. */}
          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            <Card className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="lbl-mono">{t('features.dashboards.areasOverview')}</p>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/community/areas')}>
                    {t('features.dashboards.viewAllAreas')}
                  </Button>
                </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {summary.areas.map((a, i) => (
                  <div
                    key={a.id}
                    style={d(i)}
                    className="g-item rounded-card border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-bold text-foreground">{a.name}</h3>
                      <StatusTag status={a.status} />
                    </div>
                    <div className="mt-3">
                      <div className="flex items-baseline justify-between">
                        <span className="lbl-mono">{t('features.areas.progress')}</span>
                        <span className="tabular text-sm font-extrabold text-foreground">
                          {a.progress}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={a.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={a.name}
                        className="mt-1.5 h-2 overflow-hidden rounded-full bg-border"
                      >
                        <div
                          className="g-bar h-full rounded-full bg-brand-pine"
                          style={{ width: `${a.progress}%`, ...d(i) }}
                        />
                      </div>
                    </div>
                    <p className="tabular mt-3 text-xs font-semibold text-muted-foreground">
                      {a.volunteerCount} {t('features.areas.volunteers')} · {a.taskCount}{' '}
                      {t('features.areas.tasks')}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-5">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="lbl-mono">{t('features.dashboards.hoursByDay')}</p>
                  <p className="tabular text-sm font-extrabold text-foreground">
                    {summary.weekHours.toLocaleString()} {t('features.volunteers.hourUnit')}
                  </p>
                </div>
                <HoursChart data={chart.data} highlightFrom={chart.weekFrom} />
              </Card>

              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="lbl-mono">{t('features.dashboards.attention')}</p>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/community/support')}>
                    {t('features.dashboards.viewSupport')}
                  </Button>
                </div>
                <DataTable
                  rows={attentionRows}
                  columns={attentionColumns}
                  pageSize={5}
                  emptyText={t('common.empty')}
                />
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
