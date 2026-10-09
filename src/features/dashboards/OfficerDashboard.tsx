// Dashboard trưởng nhóm vật tư (route /material-officer, index route): số mặt hàng
// thiếu, đề nghị mua chờ duyệt, % quyên góp đã về và danh sách hàng sắp về /
// đơn chờ duyệt. Dữ liệu: GET /api/dashboard/material-officer (suy khu từ Bearer
// token, fallback u4) + materials (danh sách INCOMING sắp về).
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMaterials } from '@/features/materials/api'
import { useOfficerSummary, type OfficerSummary } from './api'

const d = (n: number) => ({ '--d': n }) as CSSProperties

export default function OfficerDashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: summary, isPending } = useOfficerSummary()
  const area = summary?.area ?? null
  const { data: materials = [] } = useMaterials(area?.id)

  // Hàng sắp về: donatedPledged chưa nhận hết — "đơn vị & quy đổi" demo.
  const incoming = useMemo(
    () =>
      materials
        .filter((m) => m.status === 'INCOMING')
        .map((m) => ({
          ...m,
          pledgedRemaining: m.donatedPledged - m.donatedReceived,
        })),
    [materials],
  )

  const shortagePercent = useMemo(() => {
    if (!summary) return 0
    const shortageCount = summary.shortageList.length
    return materials.length ? Math.round((shortageCount / materials.length) * 100) : 0
  }, [summary, materials])

  const shortageColumns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.materials.name'),
        render: (m: OfficerSummary['shortageList'][number]) => (
          <span className="font-semibold">{m.name}</span>
        ),
      },
      {
        key: 'short',
        header: t('features.materials.remainingShort'),
        align: 'right' as const,
        render: (m: OfficerSummary['shortageList'][number]) => (
          <span className="tabular font-bold text-destructive">
            {m.short} {m.unit}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (m: OfficerSummary['shortageList'][number]) => <StatusTag status={m.status} />,
      },
    ],
    [t],
  )

  const purchaseColumns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.id'),
        render: (p: { id: string }) => <span className="tabular font-semibold">{p.id}</span>,
      },
      {
        key: 'note',
        header: t('features.purchases.note'),
        render: (p: { note?: string }) => p.note ?? '—',
      },
      {
        key: 'total',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (p: { total: number }) => (
          <span className="tabular font-bold">{p.total.toLocaleString('vi-VN')} ₫</span>
        ),
      },
    ],
    [t],
  )

  const incomingColumns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.materials.name'),
        render: (m: (typeof incoming)[number]) => <span className="font-semibold">{m.name}</span>,
      },
      {
        key: 'pledgedRemaining',
        header: t('features.dashboards.incomingQty'),
        align: 'right' as const,
        render: (m: (typeof incoming)[number]) => (
          <span className="tabular">
            {m.pledgedRemaining} {m.unit}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (m: (typeof incoming)[number]) => <StatusTag status={m.status} />,
      },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={area ? t('features.dashboards.officerTitle', { name: area.name }) : t('features.dashboards.officerTitleNoArea')}
        sub={t('features.dashboards.officerSub')}
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !area || !summary ? (
        <EmptyState text={t('features.materials.noArea')} />
      ) : (
        <div className="space-y-6">
          {/* Shortage callout banner if needed */}
          {summary.shortageList.length > 0 && (
            <div className="flex items-center justify-between rounded-card border border-destructive/30 bg-destructive/10 p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-bold text-destructive">
                    Cảnh báo: Đang thiếu hụt {summary.shortageList.length} mặt hàng vật tư cho phân khu!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cần đề xuất đơn mua sắm hoặc huy động quyên góp bổ sung để kịp tiến độ thi công.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => navigate('/material-officer/purchases')}
              >
                Tạo đơn mua ngay
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* 4 StatCard: thiếu, chờ duyệt, % quyên góp, giờ công tuần. */}
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div style={d(0)}>
              <StatCard
                label={t('features.dashboards.shortageItems')}
                value={summary.shortageList.length}
                tone={summary.shortageList.length > 0 ? 'alert' : 'ok'}
              />
            </div>
            <div style={d(1)}>
              <StatCard
                label={t('features.dashboards.pendingPurchases')}
                value={summary.pendingPurchases.length}
                tone={summary.pendingPurchases.length > 0 ? 'warn' : 'ok'}
              />
            </div>
            <div style={d(2)}>
              <StatCard
                label={t('features.dashboards.shortageRate')}
                value={shortagePercent}
                unit="%"
                tone="warn"
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

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="lbl-mono">{t('features.dashboards.shortageList')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/material-officer/materials')}
                >
                  {t('features.dashboards.viewMaterials')}
                </Button>
              </div>
              <DataTable
                rows={summary.shortageList}
                columns={shortageColumns}
                pageSize={5}
                emptyText={t('features.materials.empty')}
              />
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="lbl-mono">{t('features.dashboards.pendingPurchaseList')}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/material-officer/purchases')}
                >
                  {t('features.dashboards.viewPurchases')}
                </Button>
              </div>
              <DataTable
                rows={summary.pendingPurchases}
                columns={purchaseColumns}
                pageSize={5}
                emptyText={t('features.purchases.empty')}
              />
            </Card>

            <Card className="p-5 xl:col-span-2">
              <p className="lbl-mono mb-3">{t('features.dashboards.incomingDeliveries')}</p>
              {incoming.length === 0 ? (
                <EmptyState text={t('features.donations.empty')} className="py-6" />
              ) : (
                <DataTable
                  rows={incoming}
                  columns={incomingColumns}
                  pageSize={5}
                  emptyText={t('features.donations.empty')}
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
