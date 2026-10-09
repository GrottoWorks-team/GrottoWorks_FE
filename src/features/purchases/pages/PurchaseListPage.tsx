// Yêu cầu mua của khu officer phụ trách (route /material-officer/purchases):
// DataTable đề nghị mua (mã, vật tư, tổng, note, status), tạo qua
// PurchaseFormDialog (DRAFT), row action "Gửi duyệt" (DRAFT → PENDING).
// Committee duyệt/từ chối ở CommitteeApprovalPage riêng.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useAuth } from '@/lib/auth'
import { shortage } from '@/types'
import type { PurchaseRequest } from '@/types'
import { usePurchaseRequests, useSendForApproval } from '../api'
import { PurchaseFormDialog } from './PurchaseFormDialog'

export default function PurchaseListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: materials = [] } = useMaterials()
  const { data: requests = [], isPending } = usePurchaseRequests()
  const send = useSendForApproval()

  const [formOpen, setFormOpen] = useState(false)

  // Phạm vi: khu officer phụ trách (officer@ = u4 lãnh a1).
  const myAreas = areas.filter((a) => a.officerId === user?.id)
  const myMaterialIds = new Set(materials.filter((m) => myAreas.some((a) => a.id === m.areaId)).map((m) => m.id))
  const rows = requests.filter((r) => r.materialIds.some((id) => myMaterialIds.has(id)))
  const matName = (id: string) => materials.find((m) => m.id === id)

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.code'),
        render: (r: PurchaseRequest) => (
          <span className="lbl-mono font-semibold text-foreground">#{r.id}</span>
        ),
      },
      {
        key: 'materials',
        header: t('features.purchases.materials'),
        render: (r: PurchaseRequest) => (
          <span>
            {r.materialIds.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                {matName(id)?.name ?? id}
                {r.qtys?.[id] ? <span className="text-muted-foreground"> ×{r.qtys[id]}</span> : null}
              </span>
            ))}
          </span>
        ),
      },
      {
        key: 'total',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (r: PurchaseRequest) => <span className="tabular">{r.total.toLocaleString()} ₫</span>,
      },
      {
        key: 'note',
        header: t('features.purchases.note'),
        render: (r: PurchaseRequest) => (
          <span>
            {r.note ?? '—'}
            {r.rejectReason && (
              <span className="block text-xs text-destructive">
                {t('features.purchases.rejectReason')}: {r.rejectReason}
              </span>
            )}
          </span>
        ),
      },
      { key: 'status', header: t('common.status'), render: (r: PurchaseRequest) => <StatusTag status={r.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: PurchaseRequest) =>
          r.status === 'DRAFT' ? (
            <Button
              size="sm"
              aria-label={t('features.purchases.send')}
              onClick={() => {
                void send
                  .mutateAsync(r.id)
                  .then(() => toast(t('features.purchases.sent', { code: r.id })))
                  .catch(() => toast(t('common.error'), 'alert'))
              }}
            >
              <Send className="size-4" />
              {t('features.purchases.send')}
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, materials, send],
  )

  const shortageMaterials = materials
    .filter((m) => myAreas.some((a) => a.id === m.areaId))
    .filter((m) => shortage(m) > 0)

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  const stats = useMemo(() => {
    const total = rows.length
    const draft = rows.filter((r) => r.status === 'DRAFT').length
    const pending = rows.filter((r) => r.status === 'PENDING').length
    const approved = rows.filter((r) => r.status === 'APPROVED').length
    return { total, draft, pending, approved }
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.purchases.title')}
        sub={t('features.purchases.sub')}
        actions={
          <Button onClick={() => setFormOpen(true)} disabled={!shortageMaterials.length}>
            <Plus className="size-4" />
            {t('features.purchases.create')}
          </Button>
        }
      />

      {rows.length > 0 && (
        <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Tổng đơn mua" value={stats.total} tone="ok" />
          <StatCard label="Đơn nháp" value={stats.draft} tone="ok" />
          <StatCard label="Chờ duyệt" value={stats.pending} tone={stats.pending > 0 ? 'warn' : 'ok'} />
          <StatCard label="Đã duyệt" value={stats.approved} tone="ok" />
        </div>
      )}

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={['note']}
          filters={[{ key: 'status', options: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] }]}
          emptyText={t('features.purchases.empty')}
        />
      )}
      {formOpen && <PurchaseFormDialog materials={shortageMaterials} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
