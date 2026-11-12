// Tổng quan trưởng nhóm vật tư (route /material-officer, index route).
// Dữ liệu THẬT: khu vực mình phụ trách vật tư trong mùa đang chọn + độ phủ
// leader/hạn. Bảng tổng hợp vật tư từ GET /api/v1/dashboards/materials.
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, AlertTriangle, HeartHandshake, DollarSign } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDashboardData, useMaterialsDashboard } from './api'
import type { WorkArea, MaterialLineDto } from '@/types'

const SELECT_CLS =
  'h-10 max-w-56 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function OfficerOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { areas, coverage, userNameById, isPending } = useDashboardData()

  const requestedAreaId = searchParams.get('area')
  const area = areas.find((a) => a.id === requestedAreaId) ?? areas[0] ?? null

  const { data: materialsDashboard } = useMaterialsDashboard({
    workAreaId: area?.id,
    seasonId: area?.seasonId,
  })

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

  const materialLineColumns = useMemo(
    () => [
      {
        key: 'material',
        header: t('features.materials.name', { defaultValue: 'Vật tư' }),
        render: (line: MaterialLineDto) => (
          <div>
            <span className="font-semibold">{line.materialName ?? line.materialId}</span>
            {line.materialCode && (
              <p className="font-mono text-xs text-muted-foreground">{line.materialCode}</p>
            )}
          </div>
        ),
      },
      {
        key: 'workArea',
        header: t('features.tasks.area', { defaultValue: 'Khu vực' }),
        render: (line: MaterialLineDto) => <span>{line.workAreaName}</span>,
      },
      {
        key: 'required',
        header: t('features.materials.required', { defaultValue: 'Nhu cầu' }),
        align: 'right' as const,
        render: (line: MaterialLineDto) => (
          <span className="tabular">
            {line.required} {line.unit ?? ''}
          </span>
        ),
      },
      {
        key: 'confirmedAvailable',
        header: t('features.materials.available', { defaultValue: 'Hiện có' }),
        align: 'right' as const,
        render: (line: MaterialLineDto) => (
          <span className="tabular">
            {line.confirmedAvailable} {line.unit ?? ''}
          </span>
        ),
      },
      {
        key: 'shortage',
        header: t('features.materials.shortage', { defaultValue: 'Thiếu hụt' }),
        align: 'right' as const,
        render: (line: MaterialLineDto) => (
          <span className={`tabular font-bold ${line.shortage > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
            {line.shortage} {line.unit ?? ''}
          </span>
        ),
      },
      {
        key: 'pledged',
        header: t('features.donations.promised', { defaultValue: 'Đã cam kết' }),
        align: 'right' as const,
        render: (line: MaterialLineDto) => (
          <span className="tabular">
            {line.pledged} {line.unit ?? ''}
          </span>
        ),
      },
      {
        key: 'purchased',
        header: t('features.materials.purchased', { defaultValue: 'Đã mua' }),
        align: 'right' as const,
        render: (line: MaterialLineDto) => (
          <span className="tabular">
            {line.purchasedUsable} {line.unit ?? ''}
          </span>
        ),
      },
    ],
    [t],
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
          {/* Độ phủ khu vực phụ trách */}
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

          {/* Bảng điều khiển vật tư từ GET /api/v1/dashboards/materials */}
          {materialsDashboard && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('features.dashboards.materialsDashboardTitle', {
                  defaultValue: 'Chỉ số vật tư & mua sắm',
                })}
              </h2>

              <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label={t('features.dashboards.shortageLines', { defaultValue: 'Mặt hàng thiếu' })}
                  value={materialsDashboard.lines.filter((l) => l.shortage > 0).length}
                  unit="mặt hàng"
                  tone={
                    materialsDashboard.lines.filter((l) => l.shortage > 0).length > 0
                      ? 'warn'
                      : 'ok'
                  }
                  icon={AlertTriangle}
                />
                <StatCard
                  label={t('features.dashboards.pendingPurchases', { defaultValue: 'Mua sắm chờ duyệt' })}
                  value={materialsDashboard.purchases.pendingApproval}
                  unit="đơn"
                  tone={materialsDashboard.purchases.pendingApproval > 0 ? 'warn' : 'ok'}
                  icon={ShoppingBag}
                />
                <StatCard
                  label={t('features.dashboards.openDonations', { defaultValue: 'Quyên góp mở' })}
                  value={materialsDashboard.donations.openPledges}
                  unit="lượt"
                  icon={HeartHandshake}
                />
                <StatCard
                  label={t('features.dashboards.purchaseCost', { defaultValue: 'Chi phí mua sắm' })}
                  value={materialsDashboard.purchases.actualCost}
                  unit="₫"
                  icon={DollarSign}
                />
              </div>

              {/* Bảng các dòng vật tư */}
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="lbl-mono">
                    {t('features.dashboards.materialLines', { defaultValue: 'Cân đối nhu cầu vật tư' })}
                  </p>
                </div>
                <DataTable
                  rows={materialsDashboard.lines}
                  columns={materialLineColumns}
                  pageSize={10}
                  emptyText={t('features.materials.noMaterial', {
                    defaultValue: 'Chưa có mặt hàng vật tư nào phát sinh nhu cầu trong khu vực',
                  })}
                />
              </Card>
            </div>
          )}

          {/* Danh sách khu vực */}
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
        </div>
      )}
    </div>
  )
}
