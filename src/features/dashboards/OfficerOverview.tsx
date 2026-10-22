// Tổng quan trưởng nhóm vật tư (route /material-officer, index route).
// Dữ liệu THẬT: khu vực mình phụ trách vật tư trong mùa đang chọn + độ phủ
// leader/hạn. Số liệu vật tư / đơn mua / quyên góp chưa có endpoint (BE-gap §2).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboardData } from './api'
import type { WorkArea } from '@/types'

const SELECT_CLS =
  'h-10 max-w-56 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function OfficerOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { areas, coverage, userNameById, isPending } = useDashboardData()

  const requestedAreaId = searchParams.get('area')
  const area = areas.find((a) => a.id === requestedAreaId) ?? areas[0] ?? null

  const selectArea = (areaId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (areaId) next.set('area', areaId)
        else next.delete('area')
        return next
      },
      { replace: true },
    )
  }

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
    ],
    [t, userNameById],
  )

  const areaSelector = area && areas.length > 1 && (
    <select
      aria-label={t('features.tasks.area')}
      value={area.id}
      onChange={(e) => selectArea(e.target.value)}
      className={SELECT_CLS}
    >
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  )

  return (
    <div>
      <PageHeader
        title={
          area
            ? area.name.startsWith('Khu vực')
              ? area.name
              : t('features.dashboards.officerTitle', { name: area.name })
            : t('features.dashboards.officerTitleNoArea')
        }
        sub={
          areas.length > 1
            ? t('features.dashboards.officerSubMulti', { count: areas.length })
            : t('features.dashboards.officerSub')
        }
        actions={
          area && (
            <div className="flex items-center gap-2">
              {areaSelector}
              <Button variant="outline" onClick={() => navigate('/material-officer/materials')}>
                {t('features.dashboards.viewMaterials')}
              </Button>
            </div>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !area ? (
        <EmptyState text={t('features.materials.noArea')} />
      ) : (
        <div className="space-y-6">
          <div className="stagger grid gap-4 sm:grid-cols-3">
            <StatCard label={t('features.dashboards.myAreas')} value={coverage.total} />
            <StatCard
              label={t('features.dashboards.missingLeader')}
              value={coverage.missingLeader}
              tone={coverage.missingLeader ? 'alert' : 'ok'}
            />
            <StatCard
              label={t('features.dashboards.fullyStaffed')}
              value={coverage.fullyStaffed}
              tone={coverage.fullyStaffed === coverage.total ? 'ok' : 'warn'}
            />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="lbl-mono">{t('features.dashboards.myAreas')}</p>
              {areaSelector}
            </div>
            <DataTable
              rows={areas}
              columns={columns}
              pageSize={10}
              emptyText={t('features.materials.noArea')}
            />
          </Card>

          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t('features.dashboards.pendingApi')}</p>
          </Card>
        </div>
      )}
    </div>
  )
}
