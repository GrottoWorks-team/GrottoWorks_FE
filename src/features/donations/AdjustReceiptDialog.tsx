// Điều chỉnh số liệu phiếu đã ghi nhận (F-RES-14: PATCH /api/v1/donations/{id}).
// BE yêu cầu đúng `receiptId` + lý do; MONEY sửa số tiền, MATERIAL sửa số lượng từng dòng.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { viDateTime } from '@/lib/format'
import type { Donation } from '@/types'
import { useAdjustDonationReceipt, useDonationReceipts } from './api'

export function AdjustReceiptDialog({
  donation,
  onClose,
}: {
  donation: Donation
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isPending } = useDonationReceipts(donation.id)
  const adjust = useAdjustDonationReceipt()

  const receipts = data?.receipts ?? []
  const [receiptId, setReceiptId] = useState('')
  const [amount, setAmount] = useState('')
  const [lines, setLines] = useState<Record<string, { qty: string; unusable: string }>>({})
  const [reason, setReason] = useState('')

  const current = receipts.find((receipt) => receipt.id === receiptId) ?? receipts[0]

  useEffect(() => {
    if (!current) return
    setReceiptId(current.id)
    setAmount(current.amount != null ? String(current.amount) : '')
    setLines(
      Object.fromEntries(
        current.items.map((item) => [
          item.id,
          { qty: String(item.receivedQuantity), unusable: String(item.unusableQuantity) },
        ]),
      ),
    )
  }, [current?.id])

  const materialName = (materialId: string) =>
    donation.items.find((item) => item.materialId === materialId)?.materialName ?? materialId
  const unitOf = (materialId: string) =>
    donation.items.find((item) => item.materialId === materialId)?.unit ?? ''

  const onSubmit = async () => {
    if (!current) return
    if (!reason.trim()) {
      toast(t('features.donations.adjustReasonRequired'), 'alert')
      return
    }
    try {
      await adjust.mutateAsync({
        donationId: donation.id,
        receiptId: current.id,
        version: data?.version,
        reason: reason.trim(),
        receivedAmount:
          donation.type === 'MONEY' ? Math.max(0, Number(amount) || 0) : undefined,
        items:
          donation.type === 'MATERIAL'
            ? current.items.map((item) => ({
                donationReceiptItemId: item.id,
                receivedQuantity: Math.max(0, Number(lines[item.id]?.qty) || 0),
                unusableQuantity: Math.max(0, Number(lines[item.id]?.unusable) || 0),
              }))
            : undefined,
      })
      toast(t('features.donations.adjustSaved'))
      onClose()
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.donations.adjustTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!current || adjust.isPending} onClick={onSubmit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !receipts.length ? (
        <p className="text-sm text-muted-foreground">{t('features.donations.noReceipts')}</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="adjust-receipt">{t('features.donations.receipt')}</Label>
            <select
              id="adjust-receipt"
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
              value={current?.id ?? ''}
              onChange={(e) => setReceiptId(e.target.value)}
            >
              {receipts.map((receipt, index) => (
                <option key={receipt.id} value={receipt.id}>
                  {`#${index + 1} · ${viDateTime(receipt.receivedAt)}`}
                </option>
              ))}
            </select>
          </div>

          {donation.type === 'MONEY' ? (
            <div className="space-y-1">
              <Label htmlFor="adjust-amount">{t('features.donations.receivedCol')} (₫)</Label>
              <Input
                id="adjust-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {current?.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_5rem_5rem] items-end gap-2">
                  <span className="truncate text-sm">
                    {materialName(item.materialId)}
                    <span className="text-muted-foreground"> ({unitOf(item.materialId)})</span>
                  </span>
                  <div className="space-y-1">
                    <Label htmlFor={`adjust-qty-${item.id}`}>{t('features.donations.receivedCol')}</Label>
                    <Input
                      id={`adjust-qty-${item.id}`}
                      type="number"
                      min={0}
                      value={lines[item.id]?.qty ?? ''}
                      onChange={(e) =>
                        setLines((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], qty: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`adjust-unusable-${item.id}`}>{t('features.donations.unusable')}</Label>
                    <Input
                      id={`adjust-unusable-${item.id}`}
                      type="number"
                      min={0}
                      value={lines[item.id]?.unusable ?? ''}
                      onChange={(e) =>
                        setLines((prev) => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], unusable: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="adjust-reason">{t('features.donations.adjustReason')} *</Label>
            <textarea
              id="adjust-reason"
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-right text-[11px] text-muted-foreground">{reason.length}/500</p>
          </div>
        </div>
      )}
    </Dialog>
  )
}
