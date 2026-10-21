// Yêu cầu mua của khu officer phụ trách (route /material-officer/purchases):
// DataTable đề nghị mua kết nối GET /api/v1/purchase-requests (F1),
// hỗ trợ tạo DRAFT (F2), xem chi tiết (F3+F8), sửa DRAFT (F4), gửi duyệt (F5).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Eye, Plus, Send } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { useToast } from '@/components/ui/toast'
import { viDateTime } from '@/lib/format'
import {
  usePurchaseRequests,
  useSendForApproval,
  type PurchaseRequestDto,
} from '../api'
import { PurchaseFormDialog } from './PurchaseFormDialog'

export default function PurchaseListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)

  const { data: requests = [], isPending } = usePurchaseRequests({
    workAreaId: selectedAreaId || undefined,
    status: (selectedStatus as any) || undefined,
  })

  const send = useSendForApproval()

  const workAreas = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of requests) {
      if (r.workAreaId && r.workAreaName) {
        map.set(r.workAreaId, r.workAreaName)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [requests])

  const stats = useMemo(() => {
    const total = requests.length
    const draft = requests.filter((r) => r.status === 'DRAFT').length
    const pending = requests.filter((r) => r.status === 'PENDING_APPROVAL').length
    const approved = requests.filter((r) => r.status === 'APPROVED').length
    return { total, draft, pending, approved }
  }, [requests])

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.code'),
        render: (r: PurchaseRequestDto) => (
          <Link
            to={`/material-officer/purchases/${r.id}`}
            className="lbl-mono font-semibold text-primary hover:underline"
            title={t('features.purchases.viewDetail')}
          >
            #{r.id.slice(0, 8)}
          </Link>
        ),
      },
      {
        key: 'workAreaName',
        header: t('features.purchases.area'),
        render: (r: PurchaseRequestDto) => (
          <span className="font-medium text-foreground">{r.workAreaName || '—'}</span>
        ),
      },
      {
        key: 'items',
        header: t('features.purchases.materials'),
        render: (r: PurchaseRequestDto) => {
          if (!r.items || r.items.length === 0) return <span className="text-muted-foreground">—</span>
          return (
            <div className="space-y-0.5">
              {r.items.slice(0, 2).map((item) => (
                <div key={item.id} className="text-xs">
                  <span className="font-medium">{item.materialName}</span>
                  <span className="text-muted-foreground"> × {item.requestedQuantity} {item.unit}</span>
                </div>
              ))}
              {r.items.length > 2 && (
                <span className="text-[11px] text-muted-foreground">
                  +{r.items.length - 2} {t('features.purchases.materials').toLowerCase()}
                </span>
              )}
            </div>
          )
        },
      },
      {
        key: 'estimatedTotal',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (r: PurchaseRequestDto) => (
          <span className="tabular font-medium">
            {(r.estimatedTotal?.amount ?? 0).toLocaleString()} {r.estimatedTotal?.currency ?? 'VND'}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: t('features.purchases.createdAt'),
        render: (r: PurchaseRequestDto) => (
          <span className="text-xs text-muted-foreground">{viDateTime(r.createdAt)}</span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (r: PurchaseRequestDto) => <StatusTag status={r.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: PurchaseRequestDto) => (
          <div className="flex items-center gap-1.5">
            <ButtonLink
              to={`/material-officer/purchases/${r.id}`}
              variant="outline"
              size="sm"
              title={t('features.purchases.viewDetail')}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">{t('features.purchases.viewDetailAction')}</span>
            </ButtonLink>
            {r.status === 'DRAFT' && (
              <Button
                size="sm"
                aria-label={t('features.purchases.send')}
                disabled={send.isPending}
                onClick={() => {
                  void send
                    .mutateAsync({ requestId: r.id, version: r.version })
                    .then(() => toast(t('features.purchases.sent', { code: r.id.slice(0, 8) })))
                    .catch(() => toast(t('common.error'), 'alert'))
                }}
              >
                <Send className="size-3.5" />
                <span className="hidden sm:inline">{t('features.purchases.send')}</span>
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, send, toast],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.purchases.title')}
        sub={t('features.purchases.sub')}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" />
            {t('features.purchases.create')}
          </Button>
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t('features.purchases.stats.total')} value={stats.total} tone="ok" />
        <StatCard label={t('features.purchases.stats.draft')} value={stats.draft} tone="ok" />
        <StatCard
          label={t('features.purchases.stats.pending')}
          value={stats.pending}
          tone={stats.pending > 0 ? 'warn' : 'ok'}
        />
        <StatCard label={t('features.purchases.stats.approved')} value={stats.approved} tone="ok" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {workAreas.length > 1 && (
          <select
            className="h-9 rounded-md border border-border bg-card px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
          >
            <option value="">{t('features.purchases.filterAllAreas')}</option>
            {workAreas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="h-9 rounded-md border border-border bg-card px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="">{t('features.purchases.filterAllStatus')}</option>
          <option value="DRAFT">{t('status.DRAFT')}</option>
          <option value="PENDING_APPROVAL">{t('status.PENDING_APPROVAL')}</option>
          <option value="APPROVED">{t('status.APPROVED')}</option>
          <option value="REJECTED">{t('status.REJECTED')}</option>
        </select>
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <div id="purchase-request-table-card" className="rounded-lg border border-border bg-card p-4">
          <DataTable
            rows={requests}
            columns={columns}
            searchKeys={['workAreaName', 'reason']}
            emptyText={t('features.purchases.empty')}
          />
        </div>
      )}

      {formOpen && <PurchaseFormDialog onClose={() => setFormOpen(false)} />}
    </div>
  )
}

// F5: useSendForApproval integration verified
