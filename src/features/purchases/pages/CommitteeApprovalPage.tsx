// Duyệt yêu cầu mua (route /leader/purchases — BE chỉ cho LEADER approve/reject):
// Kết nối GET /api/v1/purchase-requests (F1),
// hỗ trợ F6 (Duyệt POST /api/v1/purchase-requests/{id}/approve)
// và F7 (Từ chối POST /api/v1/purchase-requests/{id}/reject kèm reason 1–500 ký tự).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Eye } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { viDateTime } from '@/lib/format'
import { rolePrefix } from '@/lib/roles'
import {
  useApproveRequest,
  usePurchaseRequests,
  useRejectRequest,
  type PurchaseRequestDto,
} from '../api'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Dialog từ chối F7: reason bắt buộc 1–500 ký tự
function RejectDialog({
  item,
  onClose,
}: {
  item: PurchaseRequestDto
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const reject = useRejectRequest()
  const [reason, setReason] = useState('')

  const isValid = reason.trim().length >= 1 && reason.trim().length <= 500

  const onConfirm = async (): Promise<boolean> => {
    if (!isValid) return false
    try {
      await reject.mutateAsync({
        requestId: item.id,
        version: item.version,
        reason: reason.trim(),
      })
      toast(t('features.purchases.rejected', { code: item.id.slice(0, 8) }))
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
      title={t('features.purchases.rejectTitle', { code: item.id.slice(0, 8) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            id="btn-confirm-reject"
            variant="destructive"
            disabled={!isValid || reject.isPending}
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
      <div className="space-y-3">
        <Label htmlFor="reject-reason">{t('features.purchases.reason')} *</Label>
        <textarea
          id="reject-reason"
          rows={3}
          className={TEXTAREA_CLS}
          placeholder={t('features.purchases.rejectReasonPlaceholder')}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {!reason.trim() ? (
          <p className="mt-1 text-xs font-semibold text-destructive">{t('features.purchases.reasonRequired')}</p>
        ) : reason.trim().length > 500 ? (
          <p className="mt-1 text-xs font-semibold text-destructive">{t('features.purchases.reasonMaxLength')}</p>
        ) : null}
        <p className="text-right text-[11px] text-muted-foreground">{reason.trim().length}/500</p>
      </div>
    </Dialog>
  )
}

// Dialog duyệt F6: ghi chú phê duyệt (tùy chọn)
function ApproveDialog({
  item,
  onClose,
}: {
  item: PurchaseRequestDto
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const approve = useApproveRequest()
  const [note, setNote] = useState('')

  const onConfirm = async (): Promise<boolean> => {
    try {
      await approve.mutateAsync({
        requestId: item.id,
        version: item.version,
        note: note.trim() || undefined,
      })
      toast(t('features.purchases.approved', { code: item.id.slice(0, 8) }))
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
      title={t('features.purchases.approveTitle', { code: item.id.slice(0, 8) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            id="btn-confirm-approve"
            disabled={approve.isPending}
            onClick={() => {
              void onConfirm().then((ok) => {
                if (ok) onClose()
              })
            }}
          >
            {t('features.purchases.approve')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('features.purchases.approveConfirm')}</p>
        <div>
          <Label htmlFor="approve-note">{t('features.purchases.decisionNote')}</Label>
          <textarea
            id="approve-note"
            rows={3}
            className={TEXTAREA_CLS}
            placeholder={t('features.purchases.approveNotePlaceholder')}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}

export default function CommitteeApprovalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: requests = [], isPending } = usePurchaseRequests()
  // Trang dùng chung cho nhiều role → link chi tiết phải theo prefix của role hiện tại.
  const basePath = `/${rolePrefix(user?.role ?? 'LEADER')}/purchases`

  const [rejecting, setRejecting] = useState<PurchaseRequestDto | null>(null)
  const [approving, setApproving] = useState<PurchaseRequestDto | null>(null)

  const columns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.code'),
        render: (r: PurchaseRequestDto) => (
          <span className="lbl-mono font-semibold">#{r.id.slice(0, 8)}</span>
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
        key: 'materials',
        header: t('features.purchases.materials'),
        render: (r: PurchaseRequestDto) => {
          if (!r.items || r.items.length === 0) return <span className="text-muted-foreground">—</span>
          return (
            <div className="space-y-0.5">
              {r.items.map((item) => (
                <div key={item.id} className="text-xs">
                  <span className="font-medium">{item.materialName}</span>
                  <span className="text-muted-foreground"> × {item.requestedQuantity} {item.unit}</span>
                </div>
              ))}
            </div>
          )
        },
      },
      {
        key: 'total',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (r: PurchaseRequestDto) => (
          <span className="tabular font-medium">
            {(r.estimatedTotal?.amount ?? 0).toLocaleString()} {r.estimatedTotal?.currency ?? 'VND'}
          </span>
        ),
      },
      {
        key: 'reason',
        header: t('features.purchases.reasonLabel'),
        render: (r: PurchaseRequestDto) => <span>{r.reason || '—'}</span>,
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
          <div className="flex items-center gap-1.5 justify-end">
            <ButtonLink
              to={`${basePath}/${r.id}`}
              variant="outline"
              size="sm"
              title={t('features.purchases.viewDetail')}
            >
              <Eye className="size-3.5" />
              <span className="hidden sm:inline">{t('features.purchases.viewDetailAction')}</span>
            </ButtonLink>
            {r.status === 'PENDING_APPROVAL' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  aria-label={t('features.purchases.reject')}
                  onClick={() => setRejecting(r)}
                >
                  <X className="size-3.5" />
                  <span className="hidden sm:inline">{t('features.purchases.reject')}</span>
                </Button>
                <Button
                  size="sm"
                  aria-label={t('features.purchases.approve')}
                  onClick={() => setApproving(r)}
                >
                  <Check className="size-3.5" />
                  <span className="hidden sm:inline">{t('features.purchases.approve')}</span>
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [t, basePath],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.purchases.committeeTitle')}
        sub={t('features.purchases.committeeSub')}
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <div id="committee-approval-table-card" className="rounded-lg border border-border bg-card p-4">
          <DataTable
            rows={requests}
            columns={columns}
            searchKeys={['workAreaName', 'reason']}
            filters={[{ key: 'status', options: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DRAFT'] }]}
            emptyText={t('features.purchases.empty')}
          />
        </div>
      )}

      {rejecting && <RejectDialog item={rejecting} onClose={() => setRejecting(null)} />}
      {approving && <ApproveDialog item={approving} onClose={() => setApproving(null)} />}
    </div>
  )
}

// F7: reject with reason 1-500 chars verified
