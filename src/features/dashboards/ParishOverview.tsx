// Tổng quan quản trị giáo xứ (route /parish, index route).
// Dựng từ dữ liệu THẬT:
//   /api/v1/parishes, /api/v1/seasons, /api/v1/communities, /api/v1/users
//   /api/v1/dashboards/season?seasonId=
//   /api/v1/seasons/{id}/support-summary
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ShoppingBag, HeartHandshake, Activity } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeasons, useSeasonSupportSummary } from '@/features/season/api'
import { useSeasonReadiness } from '@/features/readiness/api'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { useParish } from '@/features/parish/api'
import { useSeasonDashboard } from '@/features/dashboards/api'
import { viDate } from '@/lib/format'
import type { Season, WorkAreaProgressDto, CommunityProgressDto } from '@/types'

const SELECT_CLS =
  'h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function ParishOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: parish } = useParish()
  const { data: seasons = [], isPending: seasonsPending } = useSeasons()
  const { data: communities = [] } = useCommunities()
  const { data: users = [] } = useUsers({ withSkills: false })

  const activeSeason = seasons.find((s) => s.status === 'ACTIVE') ?? seasons[0] ?? null
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const currentSeasonId = selectedSeasonId || activeSeason?.id || ''

  const { data: dashboard } = useSeasonDashboard(currentSeasonId)
  const { data: supportSummary } = useSeasonSupportSummary(currentSeasonId)
  const { data: seasonReadiness } = useSeasonReadiness(currentSeasonId)

  const communityNameById = useMemo(
    () => new Map(communities.map((c) => [c.id, c.name])),
    [communities],
  )

  const seasonColumns = useMemo(
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

  const areaProgressColumns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.tasks.area', { defaultValue: 'Khu vực' }),
        render: (a: WorkAreaProgressDto) => <span className="font-semibold">{a.name}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkAreaProgressDto) => <StatusTag status={a.status} />,
      },
      {
        key: 'tasks',
        header: t('features.tasks.title', { defaultValue: 'Nhiệm vụ' }),
        align: 'right' as const,
        render: (a: WorkAreaProgressDto) => (
          <span className="tabular">{a.completed} / {a.tasks}</span>
        ),
      },
      {
        key: 'progress',
        header: t('features.dashboards.progress', { defaultValue: 'Tiến độ' }),
        align: 'right' as const,
        render: (a: WorkAreaProgressDto) => (
          <span className="tabular font-medium">{Math.round(a.progressPercent)}%</span>
        ),
      },
      {
        key: 'readiness',
        header: t('features.readiness.title', { defaultValue: 'Điều kiện mặt bằng' }),
        render: (a: WorkAreaProgressDto) => {
          const areaRd = seasonReadiness?.areas.find((ar) => ar.workAreaId === a.workAreaId)
          const status = a.readiness || (areaRd ? (areaRd.ready ? 'READY' : areaRd.checklistStatus) : null)
          return status ? (
            <StatusTag status={status} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
      },
    ],
    [t, seasonReadiness],
  )

  const communityProgressColumns = useMemo(
    () => [
      {
        key: 'community',
        header: t('features.season.communities', { defaultValue: 'Cộng đoàn' }),
        render: (c: CommunityProgressDto) => (
          <span className="font-semibold">
            {c.communityId ? communityNameById.get(c.communityId) ?? c.communityId : 'Toàn xứ'}
          </span>
        ),
      },
      {
        key: 'workAreas',
        header: t('features.dashboards.myAreas', { defaultValue: 'Khu vực' }),
        align: 'right' as const,
        render: (c: CommunityProgressDto) => <span className="tabular">{c.workAreas}</span>,
      },
      {
        key: 'tasks',
        header: t('features.tasks.title', { defaultValue: 'Nhiệm vụ' }),
        align: 'right' as const,
        render: (c: CommunityProgressDto) => (
          <span className="tabular">{c.completed} / {c.tasks}</span>
        ),
      },
      {
        key: 'progress',
        header: t('features.dashboards.progress', { defaultValue: 'Tiến độ' }),
        align: 'right' as const,
        render: (c: CommunityProgressDto) => (
          <span className="tabular font-medium">{Math.round(c.progressPercent)}%</span>
        ),
      },
    ],
    [t, communityNameById],
  )

  return (
    <div>
      <PageHeader
        title={t('features.dashboards.adminTitle')}
        sub={parish ? parish.name : t('features.dashboards.adminSub')}
        actions={
          <div className="flex items-center gap-2">
            {seasons.length > 1 && (
              <select
                aria-label={t('features.season.name')}
                value={currentSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className={SELECT_CLS}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.year})
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" onClick={() => navigate('/parish/seasons')}>
              {t('nav.parish.seasons')}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Tổng quan giáo xứ */}
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label={t('features.dashboards.seasonCount')} value={seasons.length} />
          <StatCard label={t('features.dashboards.communityCount')} value={communities.length} />
          <StatCard label={t('features.dashboards.accountCount')} value={users.length} />
        </div>

        {/* Chỉ số mùa từ GET /api/v1/dashboards/season */}
        {dashboard && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('features.dashboards.seasonDashboardTitle', { defaultValue: 'Chỉ số vận hành mùa' })}
              </h2>
              {supportSummary && (
                <span className="text-xs text-muted-foreground">
                  {supportSummary.totalRequests} {t('features.dashboards.supportRequests', { defaultValue: 'yêu cầu hỗ trợ liên cộng đoàn' })}
                </span>
              )}
            </div>

            <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t('features.dashboards.taskProgress', { defaultValue: 'Tiến độ nhiệm vụ' })}
                value={Math.round(dashboard.summary.tasks.progressPercent)}
                unit="%"
                tone={dashboard.summary.tasks.progressPercent >= 100 ? 'ok' : 'warn'}
                icon={Activity}
              />
              <StatCard
                label={t('features.dashboards.readyWorkAreas', { defaultValue: 'Khu vực sẵn sàng' })}
                value={seasonReadiness?.readyWorkAreas ?? dashboard.summary.readiness.ready}
                unit={`/ ${seasonReadiness?.workAreas ?? dashboard.summary.workAreas} khu`}
                tone={
                  (seasonReadiness?.readyWorkAreas ?? dashboard.summary.readiness.ready) ===
                  (seasonReadiness?.workAreas ?? dashboard.summary.workAreas)
                    ? 'ok'
                    : 'warn'
                }
                icon={CheckCircle2}
              />
              <StatCard
                label={t('features.dashboards.pendingPurchases', { defaultValue: 'Mua sắm chờ duyệt' })}
                value={dashboard.summary.purchases.pendingApproval}
                unit="đơn"
                tone={dashboard.summary.purchases.pendingApproval > 0 ? 'warn' : 'ok'}
                icon={ShoppingBag}
              />
              <StatCard
                label={t('features.dashboards.openDonations', { defaultValue: 'Quyên góp mở' })}
                value={dashboard.summary.donations.openPledges}
                unit="lượt"
                icon={HeartHandshake}
              />
            </div>

            {/* Tiến độ từng khu vực */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="lbl-mono">
                  {t('features.dashboards.areaProgress', { defaultValue: 'Tiến độ các khu vực' })}
                </p>
              </div>
              <DataTable
                rows={dashboard.workAreas}
                columns={areaProgressColumns}
                pageSize={10}
                emptyText={t('features.dashboards.noArea', { defaultValue: 'Chưa có khu vực trong mùa' })}
              />
            </Card>

            {/* Tiến độ từng cộng đoàn */}
            {dashboard.communities.length > 0 && (
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="lbl-mono">
                    {t('features.dashboards.communityProgress', { defaultValue: 'Tiến độ theo cộng đoàn' })}
                  </p>
                </div>
                <DataTable
                  rows={dashboard.communities}
                  columns={communityProgressColumns}
                  pageSize={10}
                  emptyText={t('features.dashboards.noCommunity', { defaultValue: 'Chưa có dữ liệu cộng đoàn' })}
                />
              </Card>
            )}
          </div>
        )}

        {/* Danh sách mùa */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="lbl-mono">{t('features.dashboards.seasonsList')}</p>
          </div>
          <DataTable
            rows={seasons}
            columns={seasonColumns}
            pageSize={10}
            emptyText={seasonsPending ? t('common.loading') : t('features.dashboards.noSeason')}
          />
        </Card>
      </div>
    </div>
  )
}
