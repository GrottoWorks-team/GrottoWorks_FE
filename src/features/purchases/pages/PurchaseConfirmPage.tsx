// Nhận hàng (/material-officer/purchases-confirm) — MO xác nhận số usable/unusable
// của từng lần mua; kho chỉ tăng sau bước này (BR-26). Dữ liệu mua nằm trong
// chi tiết đề nghị mua (`purchases`), không có endpoint list riêng.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, MessageSquareWarning, Paperclip } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  openPurchaseReceipt,
  useConfirmPurchaseDelivery,
  usePurchaseRequest,
  usePurchaseRequests,
  useRequestPurchaseInfo,
  type PurchaseDto,
} from '../api'
import { viDate } from '@/lib/format'

const CONFIRMABLE = new Set(['SUBMITTED', 'NEEDS_INFO'])

function ConfirmDialog({ purchase, onClose }: { purchase: PurchaseDto; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirmPurchaseDelivery()
  const [lines, setLines] = useState<Record<string, { usable: string; unusable: string }>>(() =>
    Object.fromEntries(
      purchase.items.map((item) => [
        item.id,
        { usable: String(item.purchasedQuantity), unusable: '0' },
      ]),
    ),
  )

  const submit = async () => {
    try {
      await confirm.mutateAsync({
        purchaseId: purchase.id,
        version: purchase.version,
        items: purchase.items.map((item) => ({
          purchaseItemId: item.id,
          receivedUsableQuantity: Number(lines[item.id]?.usable ?? 0),
          receivedUnusableQuantity: Number(lines[item.id]?.unusable ?? 0),
        })),
      })
      toast(t('features.purchases.deliveryConfirmed'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.deliveryTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={confirm.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {purchase.costOverrun && !purchase.costOverrunApprovedBy && (
          <p className="rounded-md bg-status-dangerBg p-2 text-xs font-semibold text-status-dangerText">
            {t('features.purchases.overrunPending')}
          </p>
        )}
        {purchase.items.map((item) => (
          <div key={item.id} className="rounded-md border border-border/60 p-3">
            <p className="text-sm font-semibold text-foreground">
              {item.materialName} <span className="text-xs font-normal text-muted-foreground">({item.unit})</span>
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t('features.purchases.boughtQty', { n: item.purchasedQuantity })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`usable-${item.id}`}>{t('features.purchases.usable')}</Label>
                <Input
                  id={`usable-${item.id}`}
                  type="number"
                  min={0}
                  value={lines[item.id]?.usable ?? ''}
                  onChange={(e) =>
                    setLines((prev) => ({ ...prev, [item.id]: { ...prev[item.id], usable: e.target.value } }))
                  }
                />
              </div>
              <div>
                <Label htmlFor={`unusable-${item.id}`}>{t('features.purchases.unusable')}</Label>
                <Input
                  id={`unusable-${item.id}`}
                  type="number"
                  min={0}
                  value={lines[item.id]?.unusable ?? '0'}
                  onChange={(e) =>
                    setLines((prev) => ({ ...prev, [item.id]: { ...prev[item.id], unusable: e.target.value } }))
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function RequestInfoDialog({ purchase, onClose }: { purchase: PurchaseDto; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const request = useRequestPurchaseInfo()
  const [reason, setReason] = useState('')

  const submit = async () => {
    if (!reason.trim()) {
      toast(t('features.purchases.reasonRequired'), 'alert')
      return
    }
    try {
      await request.mutateAsync({ purchaseId: purchase.id, version: purchase.version, reason: reason.trim() })
      toast(t('features.purchases.infoRequested'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.requestInfoTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={request.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <Label htmlFor="info-reason">{t('features.purchases.reason')}</Label>
      <Input id="info-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Dialog>
  )
}

function PurchaseRow({ purchase }: { purchase: PurchaseDto }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const canAct = CONFIRMABLE.has(purchase.status)

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold text-foreground">#{purchase.id.slice(0, 8)}</span>{' '}
          <span className="text-muted-foreground">
            {purchase.supplierName || '—'} · {viDate(purchase.purchaseDate)} ·{' '}
            {purchase.totalCost.amount.toLocaleString()} ₫
          </span>
        </div>
        <div className="flex items-center gap-2">
          {purchase.costOverrun && !purchase.costOverrunApprovedBy && (
            <span className="text-xs font-semibold text-status-dangerText">{t('features.purchases.overrun')}</span>
          )}
          <StatusTag status={purchase.status} />
        </div>
      </div>
      <ul className="mb-3 space-y-1 text-sm">
        {purchase.items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              {item.materialName}{' '}
              <span className="text-xs text-muted-foreground">({item.unit})</span>
            </span>
            <span className="tabular">{item.purchasedQuantity}</span>
          </li>
        ))}
      </ul>
      {purchase.receiptFileIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="lbl-mono">{t('features.purchases.receipts')}</span>
          {purchase.receiptFileIds.map((fileId, index) => (
            <Button
              key={fileId}
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await openPurchaseReceipt(purchase.id, fileId)
                } catch {
                  toast(t('common.error'), 'alert')
                }
              }}
            >
              <Paperclip className="size-3.5" />
              {`#${index + 1}`}
            </Button>
          ))}
        </div>
      )}
      {canAct && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setRequesting(true)}>
            <MessageSquareWarning className="size-4" />
            {t('features.purchases.requestInfo')}
          </Button>
          <Button size="sm" onClick={() => setConfirming(true)}>
            <CheckCircle2 className="size-4" />
            {t('features.purchases.confirmDelivery')}
          </Button>
        </div>
      )}
      {confirming && <ConfirmDialog purchase={purchase} onClose={() => setConfirming(false)} />}
      {requesting && <RequestInfoDialog purchase={purchase} onClose={() => setRequesting(false)} />}
    </Card>
  )
}

function RequestPurchases({ requestId }: { requestId: string }) {
  const { t } = useTranslation()
  const { data: detail, isPending } = usePurchaseRequest(requestId)
  const purchases = useMemo(() => detail?.purchases ?? [], [detail])

  if (isPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (purchases.length === 0)
    return <EmptyState text={t('features.purchases.noPurchases')} />

  return (
    <div className="space-y-3">
      {purchases.map((purchase) => (
        <PurchaseRow key={purchase.id} purchase={purchase} />
      ))}
    </div>
  )
}

export default function PurchaseConfirmPage() {
  const { t } = useTranslation()
  const { data: requests = [], isPending } = usePurchaseRequests({ size: 100 })
  const relevant = requests.filter((r) =>
    ['APPROVED', 'BUYER_ASSIGNED', 'PURCHASED', 'PARTIALLY_RECEIVED'].includes(r.status),
  )

  return (
    <div>
      <PageHeader title={t('features.purchases.confirmTitle')} sub={t('features.purchases.confirmSub')} />
      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : relevant.length === 0 ? (
        <EmptyState text={t('features.purchases.noApproved')} />
      ) : (
        <div className="space-y-6">
          {relevant.map((request) => (
            <Card key={request.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">#{request.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{request.workAreaName}</p>
                </div>
                <StatusTag status={request.status} />
              </div>
              <RequestPurchases requestId={request.id} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}