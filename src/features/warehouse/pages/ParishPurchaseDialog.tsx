// 26/11/2026: "Vật tư Ban phụ trách đã mua" — Ban phụ trách tự đi mua (không qua đơn mua / việc đi mua),
// nhập biên lai kèm ảnh hoá đơn để nhập thẳng vào kho tổng, sau đó phân bổ xuống khu vực đang thiếu.
// BE: POST /api/v1/parish-inventory/purchases (role PARISH, ảnh hoá đơn bắt buộc, tổng tiền server tính).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileImage, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { uploadFileViaGateway } from '@/features/files/api'
import { useMaterialCatalog } from '@/features/materials/api'
import { formatVnd } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { useParishInventory, useRecordParishPurchase } from '../api'

const SELECT_CLS =
  'mt-1 flex h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface LineDraft {
  materialId: string
  quantity: string
  unitPrice: string
}

export function ParishPurchaseDialog({
  seasonId,
  onClose,
}: {
  seasonId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const record = useRecordParishPurchase()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 200, status: 'ACTIVE' })
  const catalog = catalogResult?.data ?? []
  const { data: inventory } = useParishInventory({ seasonId, size: 200 })

  const [buyerName, setBuyerName] = useState(user?.name ?? '')
  const [supplierName, setSupplierName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [invoices, setInvoices] = useState<{ fileId: string; fileName: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [lines, setLines] = useState<LineDraft[]>([{ materialId: '', quantity: '1', unitPrice: '' }])
  const [error, setError] = useState<string | null>(null)

  const quantityOf = (materialId: string) =>
    inventory?.data.find((row) => row.materialId === materialId)?.confirmedAvailable ?? 0

  const total = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
    0,
  )

  const patchLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  const onInvoicePicked = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadFileViaGateway(file, 'PurchaseReceipt')
      setInvoices((prev) => [...prev, { fileId: uploaded.fileId, fileName: uploaded.fileName }])
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    } finally {
      setUploading(false)
    }
  }

  const submit = async () => {
    setError(null)
    if (!buyerName.trim()) return setError(t('features.warehouse.purchaseBuyerRequired'))
    const items = lines
      .filter((line) => line.materialId)
      .map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }))
    if (items.length === 0) return setError(t('features.warehouse.purchaseItemsRequired'))
    if (items.some((item) => !(item.quantity > 0))) return setError(t('features.warehouse.purchaseQuantityInvalid'))
    if (items.some((item) => !(item.unitPrice >= 0))) return setError(t('features.warehouse.purchasePriceInvalid'))
    if (invoices.length === 0) return setError(t('features.warehouse.purchaseInvoiceRequired'))

    try {
      await record.mutateAsync({
        seasonId,
        buyerName: buyerName.trim(),
        supplierName: supplierName.trim() || null,
        purchaseDate: purchaseDate || null,
        items,
        invoiceFileIds: invoices.map((invoice) => invoice.fileId),
        note: note.trim() || null,
      })
      toast(t('features.warehouse.purchaseSuccess'))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t('features.warehouse.purchaseTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={record.isPending || uploading}>
            {record.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('features.warehouse.purchaseSubmit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-md border border-border/70 bg-muted/30 p-2.5 text-xs text-muted-foreground">
          {t('features.warehouse.purchaseHint')}
        </p>
        {error ? <p className="text-xs font-semibold text-destructive">{error}</p> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>{t('features.warehouse.purchaseBuyer')} *</Label>
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} maxLength={150} />
          </div>
          <div>
            <Label>{t('features.warehouse.purchaseSupplier')}</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} maxLength={150} />
          </div>
          <div>
            <Label>{t('features.warehouse.purchaseDate')}</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>
          <div>
            <Label>{t('features.warehouse.purchaseNote')}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <Label className="font-semibold">{t('features.warehouse.purchaseItems')}</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { materialId: '', quantity: '1', unitPrice: '' }])}
            >
              <Plus className="size-3.5" />
              <span>{t('features.warehouse.purchaseAddItem')}</span>
            </Button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_90px_120px_40px]">
              <div>
                <Label className="text-xs">{t('features.warehouse.material')}</Label>
                <select
                  className={SELECT_CLS}
                  value={line.materialId}
                  onChange={(e) => patchLine(index, { materialId: e.target.value })}
                >
                  <option value="">{t('features.warehouse.purchaseSelectMaterial')}</option>
                  {catalog.map((material) => (
                    <option key={material.id} value={material.id}>
                      [{material.code}] {material.name} ({material.unit})
                    </option>
                  ))}
                </select>
                {line.materialId ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t('features.warehouse.purchaseInStock', { n: quantityOf(line.materialId) })}
                  </p>
                ) : null}
              </div>
              <div>
                <Label className="text-xs">{t('features.warehouse.purchaseQuantity')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity}
                  onChange={(e) => patchLine(index, { quantity: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">{t('features.warehouse.purchaseUnitPrice')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitPrice}
                  onChange={(e) => patchLine(index, { unitPrice: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                disabled={lines.length === 1}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-2 text-sm font-semibold">
            <span>{t('features.warehouse.purchaseTotal')}:</span>
            <span className="tabular text-primary">{formatVnd(total)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">{t('features.warehouse.purchaseInvoice')} *</Label>
          <p className="text-[11px] text-muted-foreground">{t('features.warehouse.purchaseInvoiceHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileImage className="size-4" />}
              {t('features.warehouse.purchaseAddInvoice')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onInvoicePicked(file)
                  e.target.value = ''
                }}
              />
            </label>
            {invoices.map((invoice) => (
              <span
                key={invoice.fileId}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
              >
                {invoice.fileName}
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() => setInvoices((prev) => prev.filter((row) => row.fileId !== invoice.fileId))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
