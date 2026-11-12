// Tổng quan trưởng khu (route /leader, index route).
// Một leader CÓ THỂ lãnh nhiều khu → danh sách khu lấy thật từ useScopedAreas()
// (lọc leaderId + mùa đang chọn), nhiều khu thì hiện select (`?area=`).
// Gọi /api/v1/dashboards/work-area?workAreaId= khi đã chọn khu.
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileImage, Activity, AlertTriangle, Users, ShoppingBag } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboardData, useWorkAreaDashboard } from './api'
import type { WorkArea } from '@/types'

const SELECT_CLS =
  'h-10 max-w-56 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function LeaderOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { areas, coverage, userNameById, isPending } = useDashboardData()

  const requestedAreaId = searchParams.get('area')
  const area = areas.find((a) => a.id === requestedAreaId) ?? areas[0] ?? null

  const { data: areaDashboard } = useWorkAreaDashboard(area?.id)

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
        key: 'officer',
        header: t('features.areas.officer'),
        render: (a: WorkArea) => userNameById.get(a.officerId) ?? '—',
      },
    ],
    [t, userNameById],
  )

  return (
    <div>
      <PageHeader
        title={
          area
            ? area.name.startsWith('Khu vực')
              ? area.name
              : t('features.dashboards.leaderTitle', { name: area.name })
            : t('features.dashboards.leaderTitleNoArea')
        }
        sub={
          areas.length > 1
            ? t('features.dashboards.leaderSubMulti', { count: areas.length })
            : t('features.dashboards.leaderSub')
        }
        actions={
          area && (
            <div className="flex items-center gap-2">
              {areas.length > 1 && (
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
              )}
              <Button variant="outline" onClick={() => navigate(`/leader/areas/${area.id}/design`)}>
                <FileImage className="size-4" />
                {t('features.design.title')}
              </Button>
            </div>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !area ? (
        <EmptyState text={t('features.tasks.noArea')} />
      ) : (
        <div className="space-y-6">
          {/* Độ phủ các khu của leader */}
          <div className="stagger grid gap-4 sm:grid-cols-3">
            <StatCard label={t('features.dashboards.myAreas')} value={coverage.total} />
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

          {/* Chỉ số vận hành khu vực từ GET /api/v1/dashboards/work-area */}
          {areaDashboard && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('features.dashboards.areaDashboardTitle', {
                  defaultValue: 'Vận hành khu vực: {{name}}',
                  name: areaDashboard.name,
                })}
              </h2>

              <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t('features.dashboards.taskProgress', { defaultValue: 'Tiến độ nhiệm vụ' })}
                  value={Math.round(areaDashboard.summary.tasks.progressPercent)}
                  unit="%"
                  tone={areaDashboard.summary.tasks.progressPercent >= 100 ? 'ok' : 'warn'}
                  icon={Activity}
                />
                <StatCard
                  label={t('features.dashboards.tasksNeedingAction', { defaultValue: 'Cần xử lý' })}
                  value={areaDashboard.summary.tasks.overdue + areaDashboard.summary.tasks.revisionRequired}
                  unit="việc"
                  tone={
                    areaDashboard.summary.tasks.overdue + areaDashboard.summary.tasks.revisionRequired > 0
                      ? 'alert'
                      : 'ok'
                  }
                  icon={AlertTriangle}
                />
                <StatCard
                  label={t('features.dashboards.volunteers', { defaultValue: 'Tình nguyện viên' })}
                  value={areaDashboard.summary.volunteers.assigned}
                  unit="người"
                  icon={Users}
                />
                <StatCard
                  label={t('features.dashboards.materialShortageLines', { defaultValue: 'Vật tư thiếu hụt' })}
                  value={areaDashboard.summary.materials.linesWithShortage}
                  unit="mặt hàng"
                  tone={areaDashboard.summary.materials.linesWithShortage > 0 ? 'warn' : 'ok'}
                  icon={ShoppingBag}
                />
              </div>

              {/* Chi tiết nhiệm vụ theo trạng thái */}
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="lbl-mono">
                    {t('features.dashboards.taskStatusBreakdown', { defaultValue: 'Phân bố trạng thái nhiệm vụ' })}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {t('common.status')}: <StatusTag status={areaDashboard.status} />
                  </span>
                </div>
                {Object.keys(areaDashboard.summary.tasks.byStatus).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(areaDashboard.summary.tasks.byStatus).map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium"
                      >
                        <StatusTag status={status} />
                        <span className="tabular font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t('features.tasks.empty', { defaultValue: 'Chưa có nhiệm vụ nào trong khu vực' })}
                  </p>
                )}
              </Card>
            </div>
          )}

          {/* Danh sách khu vực quản lý */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="lbl-mono">{t('features.dashboards.myAreas')}</p>
              {areas.length > 1 && (
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
              )}
            </div>
            <DataTable
              rows={areas}
              columns={columns}
              pageSize={10}
              emptyText={t('features.tasks.noArea')}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
