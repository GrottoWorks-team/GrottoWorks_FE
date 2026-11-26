// Ghi nhận lần mua thật (F-RES-09, BR-26/BR-30):
// MO của khu nhập số lượng/đơn giá; người mua là user PARISH được gán vào task PURCHASE.
// Kho chỉ tăng sau khi MO xác nhận giao hàng.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatVnd } from '@/lib/format'
import { useRecordPurchase, type PurchaseRequestDto } from '../api'

interface LineState {
  quantity: string
  unitPrice: string
}

export function RecordPurchaseDialog({ request, onClose }: { request: PurchaseRequestDto; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordPurchase()

  const defaultLines = useMemo(() => {
    return Object.fromEntries(
      request.items.map((item) => {
        const quantity = item.requestedQuantity
        const unitPrice = quantity > 0 && item.estimatedCost ? item.estimatedCost / quantity : 0
        return [item.id, { quantity: String(quantity), unitPrice: String(Math.round(unitPrice)) }]
      }),
    ) as Record<string, LineState>
  }, [request.items])

  const [lines, setLines] = useState<Record<string, LineState>>(defaultLines)
  const [supplier, setSupplier] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const total = request.items.reduce((sum, item) => {
    const line = lines[item.id]
    return sum + Number(line?.quantity ?? 0) * Number(line?.unitPrice ?? 0)
  }, 0)

  const submit = async () => {
    try {
      await record.mutateAsync({
        requestId: request.id,
        supplierName: supplier.trim() || null,
        purchaseDate,
        items: request.items.map((item) => {
          const line = lines[item.id]
          const quantity = Number(line?.quantity ?? 0)
          const unitPrice = Number(line?.unitPrice ?? 0)
          return {
            purchaseRequestItemId: item.id,
            purchasedQuantity: quantity,
            unitPrice,
            totalPrice: Math.round(quantity * unitPrice * 100) / 100,
          }
        }),
      })
      toast(t('features.purchases.recordSaved'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t('features.purchases.recordTitle', { code: request.id.slice(0, 8) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={record.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t('features.purchases.recordBuyerHint')}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="record-supplier">{t('features.purchases.supplier')}</Label>
            <Input id="record-supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="record-date">{t('features.purchases.purchaseDate')}</Label>
            <Input
              id="record-date"
              type="date"
              value={purchaseDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('features.purchases.materials')}</Label>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t('features.purchases.material')}</th>
                  <th className="px-3 py-2 text-right">{t('features.purchases.quantity')}</th>
                  <th className="px-3 py-2 text-right">{t('features.purchases.unitPrice')}</th>
                  <th className="px-3 py-2 text-right">{t('features.purchases.lineTotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {request.items.map((item) => {
                  const line = lines[item.id]
                  const lineTotal = Number(line?.quantity ?? 0) * Number(line?.unitPrice ?? 0)
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <p className="font-medium text-foreground">{item.materialName}</p>
                        <p className="text-xs text-muted-foreground">
                          {t('features.purchases.requested', { quantity: item.requestedQuantity, unit: item.unit })}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line?.quantity ?? ''}
                          onChange={(event) =>
                            setLines((current) => ({
                              ...current,
                              [item.id]: { ...current[item.id], quantity: event.target.value },
                            }))
                          }
                          className="w-24 text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={line?.unitPrice ?? ''}
                          onChange={(event) =>
                            setLines((current) => ({
                              ...current,
                              [item.id]: { ...current[item.id], unitPrice: event.target.value },
                            }))
                          }
                          className="w-28 text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular">{formatVnd(lineTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground" colSpan={3}>
                    {t('features.purchases.total')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular">{formatVnd(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <Label htmlFor="record-note">{t('features.purchases.note')}</Label>
          <Textarea id="record-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}
