// Tổng quan ban hành giáo (route /community, index route).
// Số liệu tổng hợp: GET /api/v1/dashboards/season (Reporting, read-model theo scope).
// Danh sách khu/cộng đoàn vẫn lấy từ ParishCoordination để hiện tên + phân công.
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSeasonContext } from '@/features/season/season-context'
import { useDashboardData, useSeasonDashboard } from './api'
import type { WorkArea } from '@/types'

export default function CommitteeOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { season } = useSeasonContext()
  const { areas, coverage, communities, userNameById, isPending } = useDashboardData({
    withCommunities: true,
  })
  const { data: dashboard, isPending: dashboardPending } = useSeasonDashboard(season?.id)
  const summary = dashboard?.summary

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.tasks.area'),
        render: (a: WorkArea) => <span className="font-semibold">{a.name}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkArea) => <StatusTag status={a.status} />,
      },
      {
        key: 'leader',
        header: t('features.areas.leader'),
        render: (a: WorkArea) => userNameById.get(a.leaderId) ?? '—',
      },
      {
        key: 'officer',
        header: t('features.areas.officer'),
        render: (a: WorkArea) => userNameById.get(a.officerId) ?? '—',
      },
    ],
    [t, userNameById],
  )

  const communityRows = useMemo(
    () =>
      communities.map((c) => ({
        id: c.id,
        name: c.name,
        count: areas.filter((a) => a.communityId === c.id).length,
      })),
    [communities, areas],
  )

  return (
    <div>
      <PageHeader
        title={t('features.dashboards.committeeTitle')}
        sub={season?.name ?? t('features.dashboards.noSeason')}
        actions={
          season && (
            <Button variant="outline" onClick={() => navigate('/community/areas')}>
              {t('features.dashboards.viewAllAreas')}
            </Button>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !season ? (
        <EmptyState text={t('features.dashboards.noSeason')} />
      ) : (
        <div className="space-y-6">
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('features.dashboards.areasInSeason')} value={coverage.total} />
            <StatCard
              label={t('features.dashboards.missingLeader')}
              value={coverage.missingLeader}
              tone={coverage.missingLeader ? 'alert' : 'ok'}
            />
            <StatCard
              label={t('features.dashboards.missingMaterialOfficer')}
              value={coverage.missingMaterialOfficer}
              tone={coverage.missingMaterialOfficer ? 'warn' : 'ok'}
            />
            <StatCard
              label={t('features.dashboards.fullyStaffed')}
              value={coverage.fullyStaffed}
              tone={coverage.fullyStaffed === coverage.total ? 'ok' : 'warn'}
            />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="lbl-mono">{t('features.dashboards.areaList')}</p>
              <Button variant="ghost" size="sm" onClick={() => navigate('/community/areas')}>
                {t('features.dashboards.viewAllAreas')}
              </Button>
            </div>
            <DataTable
              rows={areas}
              columns={columns}
              pageSize={10}
              emptyText={t('common.empty')}
            />
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <p className="lbl-mono mb-3">{t('features.dashboards.communityCoverage')}</p>
              {communityRows.length === 0 ? (
                <EmptyState text={t('common.empty')} className="py-6" />
              ) : (
                <ul className="space-y-2">
                  {communityRows.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-foreground">{c.name}</span>
                      <span className="tabular text-muted-foreground">
                        {c.count} {t('features.dashboards.areaUnit')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <p className="lbl-mono mb-3">{t('features.dashboards.summaryTitle')}</p>
              {dashboardPending || !summary ? (
                <EmptyState text={t('common.loading')} className="py-6" />
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t('features.dashboards.taskProgress')}</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {summary.tasks.completed}/{summary.tasks.total} ·{' '}
                      {Math.round(summary.tasks.progressPercent)}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t('features.dashboards.shortageMaterials')}</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {summary.materials.linesWithShortage}/{summary.materials.lines}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t('features.dashboards.pendingPurchases')}</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {summary.purchases.pendingApproval}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t('features.dashboards.readyAreas')}</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {summary.readiness.ready}/{summary.workAreas}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{t('features.dashboards.approvedHours')}</dt>
                    <dd className="tabular font-semibold text-foreground">
                      {summary.volunteers.approvedHours}
                    </dd>
                  </div>
                </dl>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
