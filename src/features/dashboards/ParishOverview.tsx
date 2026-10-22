// Tổng quan quản trị giáo xứ (route /parish, index route).
// Trước đây route này chỉ là Placeholder "Đang xây dựng" — giờ dựng từ dữ liệu THẬT:
//   /api/v1/parishes(+/{id}), /api/v1/seasons, /api/v1/work-areas (mọi mùa),
//   /api/v1/parishes/{id}/communities, /api/v1/users (ADMIN → /admin/users).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAreas } from '@/features/areas/api'
import { useSeasons } from '@/features/season/api'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { useParish } from '@/features/parish/api'
import { viDate } from '@/lib/format'
import type { Season } from '@/types'

export default function ParishOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: parish } = useParish()
  const { data: seasons = [], isPending } = useSeasons()
  const { data: communities = [] } = useCommunities()
  // Chỉ cần đếm tài khoản → bỏ request danh mục kỹ năng.
  const { data: users = [] } = useUsers({ withSkills: false })

  // Chỉ tải khu vực của MỘT mùa (mặc định mùa đang chạy / mới nhất) — trước đây
  // useAreas() fan-out mỗi mùa 1 request (N+1).
  const requestedSeasonId = searchParams.get('season')
  const season =
    seasons.find((s) => s.id === requestedSeasonId) ??
    seasons.find((s) => s.status === 'ACTIVE') ??
    seasons[0]
  const { data: areas = [] } = useAreas(season ? [season.id] : [])

  const selectSeason = (seasonId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (seasonId) next.set('season', seasonId)
        else next.delete('season')
        return next
      },
      { replace: true },
    )
  }

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
        sub={parish ? parish.name : t('features.dashboards.adminSub')}
        actions={
          <div className="flex items-center gap-2">
            {seasons.length > 1 && (
              <select
                aria-label={t('season.label')}
                value={season?.id ?? ''}
                onChange={(e) => selectSeason(e.target.value)}
                className="h-10 max-w-56 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.year} — {s.name}
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
        <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={t('features.dashboards.seasonCount')} value={seasons.length} />
          <StatCard label={t('features.dashboards.areasInSeason')} value={areas.length} />
          <StatCard label={t('features.dashboards.communityCount')} value={communities.length} />
          <StatCard label={t('features.dashboards.accountCount')} value={users.length} />
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="lbl-mono">{t('features.dashboards.seasonsList')}</p>
            <Button variant="ghost" size="sm" onClick={() => navigate('/parish/seasons')}>
              {t('features.dashboards.viewAllAreas')}
            </Button>
          </div>
          <DataTable
            rows={seasons}
            columns={columns}
            pageSize={10}
            emptyText={isPending ? t('common.loading') : t('features.dashboards.noSeason')}
          />
        </Card>

        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{t('features.dashboards.pendingApi')}</p>
        </Card>
      </div>
    </div>
  )
}
