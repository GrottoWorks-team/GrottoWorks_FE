// Tổng quan quản trị giáo xứ (route /parish, index route).
// Trước đây route này chỉ là Placeholder "Đang xây dựng" — giờ dựng từ dữ liệu THẬT:
//   /api/v1/parishes(+/{id}), /api/v1/seasons, /api/v1/work-areas (mọi mùa),
//   /api/v1/parishes/{id}/communities, /api/v1/users (ADMIN → /admin/users).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CircleCheck, CircleX } from 'lucide-react'
import { useSeasonDashboard } from './api'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { useParish } from '@/features/parish/api'
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
  const {
    data: seasonDashboard,
    isPending: seasonDashboardPending,
    isError: seasonDashboardError,
    refetch: refetchSeasonDashboard,
  } = useSeasonDashboard(focusSeason?.id)
  const readiness = seasonDashboard?.summary.readiness
  const missingLeader = areas.filter((a) => !a.leaderId).length
  const missingOfficer = areas.filter((a) => !a.officerId).length
  const readyAreas = readiness?.ready ?? 0
  const areaTotal = seasonDashboard?.summary.workAreas ?? areas.length

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

  return (
    <div>
      <PageHeader
        title={t('features.dashboards.adminTitle')}
        finding={t('features.dashboards.parishFinding', { ready: readyAreas, total: areaTotal })}
        sub={parish ? parish.name : t('features.dashboards.adminSub')}
        actions={
          <Button variant="outline" onClick={() => navigate('/parish/seasons')}>
            {t('nav.parish.seasons')}
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label={t('features.dashboards.seasonCount')} value={seasons.length} />
          <StatCard label={t('features.dashboards.communityCount')} value={communities.length} />
          <StatCard label={t('features.dashboards.accountCount')} value={users.length} />
        </div>

        <Card className="p-5">
          <p className="lbl-mono mb-3">{t('features.dashboards.readinessTitle')}</p>
          {seasonDashboardError ? (
            <ErrorState compact onRetry={() => void refetchSeasonDashboard()} />
          ) : seasonDashboardPending ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {[
                {
                  key: 'season',
                  ok: Boolean(focusSeason),
                  label: t('features.dashboards.readySeason', { name: focusSeason?.name ?? '—' }),
                },
                {
                  key: 'areas',
                  ok: areaTotal > 0,
                  label: t('features.dashboards.readyAreasCount', { count: areaTotal }),
                },
                {
                  key: 'leader',
                  ok: missingLeader === 0,
                  label: t('features.dashboards.readyLeader', { count: missingLeader }),
                },
                {
                  key: 'officer',
                  ok: missingOfficer === 0,
                  label: t('features.dashboards.readyOfficer', { count: missingOfficer }),
                },
                {
                  key: 'ready',
                  ok: readyAreas === areaTotal && areaTotal > 0,
                  label: t('features.dashboards.readyChecklist', { ready: readyAreas, total: areaTotal }),
                },
                {
                  key: 'failed',
                  ok: (readiness?.failedMandatoryItems ?? 0) === 0,
                  label: t('features.dashboards.readyFailedItems', {
                    count: readiness?.failedMandatoryItems ?? 0,
                  }),
                },
              ].map((row) => (
                <li key={row.key} className="flex items-start gap-2">
                  {row.ok ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-status-successText" aria-hidden />
                  ) : (
                    <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  )}
                  <span className={row.ok ? 'text-foreground' : 'font-medium text-destructive'}>
                    {row.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="lbl-mono">{t('features.dashboards.seasonsList')}</p>
          </div>
          <DataTable
            rows={seasons}
            columns={columns}
            pageSize={10}
            emptyText={isPending ? t('common.loading') : t('features.dashboards.noSeason')}
          />
        </Card>

        <Card className="p-5">
          <p className="lbl-mono mb-3">{t('features.dashboards.areaStatusBreakdown')}</p>
          {areas.length === 0 ? (
            <EmptyState text={t('common.empty')} className="py-6" />
          ) : (
            <ul className="space-y-2">
              {Object.entries(
                areas.reduce<Record<string, number>>((acc, a) => {
                  acc[a.status] = (acc[a.status] ?? 0) + 1
                  return acc
                }, {}),
              ).map(([status, count]) => (
                <li key={status} className="flex items-center justify-between gap-3 text-sm">
                  <StatusTag status={status} />
                  <span className="tabular font-semibold text-foreground">
                    {count} {t('features.dashboards.areaUnit')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {t('features.dashboards.adminScopeHint')}
          </p>
        </Card>
      </div>
    </div>
  )
}
