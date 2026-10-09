// Duyệt mua lớn (route /community/purchases): DataTable đề nghị mua, mặc định
// lọc PENDING. Duyệt = PATCH APPROVED; Từ chối qua dialog lý do (required)
// → PATCH REJECTED + note = lý do. Vật tư không bị đụng khi từ chối.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useMaterials } from '@/features/materials/api'
import { useUsers } from '@/features/users/api'
import { shortage } from '@/types'
import type { PurchaseRequest } from '@/types'
import { useApproveRequest, usePurchaseRequests, useRejectRequest } from '../api'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Dialog từ chối: lý do bắt buộc, ghi vào note của request.
function RejectDialog({ item, onClose }: { item: PurchaseRequest; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const reject = useRejectRequest()
  const [reason, setReason] = useState('')

  // Trả về true khi thành công — dialog chỉ đóng khi thành công, giữ nguyên
  // lý do đã gõ nếu mutation lỗi để committee bấm lại.
  const onConfirm = async (): Promise<boolean> => {
    try {
      await reject.mutateAsync({ id: item.id, reason })
      toast(t('features.purchases.rejected', { code: item.id }))
      return true
    } catch {
      toast(t('common.error'), 'alert')
      return false
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.rejectTitle', { code: item.id })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || reject.isPending}
            onClick={() => {
              void onConfirm().then((ok) => {
                if (ok) onClose()
              })
            }}
          >
            {t('features.purchases.reject')}
          </Button>
        </>
      }
    >
      <div>
        <Label htmlFor="reject-reason">{t('features.purchases.reason')}</Label>
        <textarea
          id="reject-reason"
          rows={3}
          className={TEXTAREA_CLS}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {!reason.trim() ? (
          <p className="mt-1 text-xs font-semibold text-destructive">{t('features.purchases.reasonRequired')}</p>
        ) : null}
      </div>
    </Dialog>
  )
}

export default function CommitteeApprovalPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: requests = [], isPending } = usePurchaseRequests()
  const { data: materials = [] } = useMaterials()
  const { data: users = [] } = useUsers()
  const approve = useApproveRequest()

  const [rejecting, setRejectting] = useState<PurchaseRequest | null>(null)

  const matName = (id: string) => materials.find((m) => m.id === id)
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.code'),
        render: (r: PurchaseRequest) => <span className="lbl-mono font-semibold">#{r.id}</span>,
      },
      {
        key: 'materials',
        header: t('features.purchases.materials'),
        render: (r: PurchaseRequest) => (
          <span>
            {r.materialIds.map((id, i) => {
              const m = matName(id)
              return (
                <span key={id}>
                  {i > 0 && ', '}
                  {m?.name ?? id}
                  {r.qtys?.[id] ? <span className="text-muted-foreground"> ×{r.qtys[id]}</span> : null}
                  {m && shortage(m) > 0 ? (
                    <span className="text-xs text-destructive">
                      {' '}
                      ({t('features.purchases.shortOf', { n: shortage(m), unit: m.unit })})
                    </span>
                  ) : null}
                </span>
              )
            })}
          </span>
        ),
      },
      {
        key: 'total',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (r: PurchaseRequest) => <span className="tabular">{r.total.toLocaleString()} ₫</span>,
      },
      { key: 'createdBy', header: t('features.purchases.createdBy'), render: (r: PurchaseRequest) => userName(r.createdBy) },
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
          r.status === 'PENDING' ? (
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                aria-label={t('features.purchases.approve')}
                onClick={() => {
                  void approve
                    .mutateAsync(r.id)
                    .then(() => toast(t('features.purchases.approved', { code: r.id })))
                    .catch(() => toast(t('common.error'), 'alert'))
                }}
              >
                <Check className="size-4" />
                {t('features.purchases.approve')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                aria-label={t('features.purchases.reject')}
                onClick={() => setRejectting(r)}
              >
                <X className="size-4" />
                {t('features.purchases.reject')}
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, materials, users, approve],
  )

  return (
    <div>
      <PageHeader title={t('features.purchases.committeeTitle')} sub={t('features.purchases.committeeSub')} />
      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={requests}
          columns={columns}
          searchKeys={['note']}
          filters={[{ key: 'status', options: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] }]}
          defaultFilters={{ status: 'PENDING' }}
          emptyText={t('features.purchases.empty')}
        />
      )}
      {rejecting && <RejectDialog item={rejecting} onClose={() => setRejectting(null)} />}
    </div>
  )
}
