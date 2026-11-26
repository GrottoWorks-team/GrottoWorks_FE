// Ghi nhận "vật tư người khác tự mua" (không qua purchase task/request).
// MO nhập người đã trả tiền, nhà cung cấp, ngày, từng dòng vật tư + đơn giá và
// BẮT BUỘC đính ảnh hoá đơn. Ảnh được đọc thử bằng OCR (lib/invoiceOcr) để gợi ý
// nhà cung cấp / ngày / tổng tiền — người dùng vẫn kiểm tra lại trước khi lưu.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileImage, Loader2, Plus, ScanLine, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { formatVnd } from '@/lib/format'
import { uploadFileViaGateway } from '@/features/files/api'
import { OcrUnavailableError, readInvoice } from '@/lib/invoiceOcr'
import { useMaterialCatalog } from '../api'
import { useRecordSelfPurchase } from '../selfPurchaseApi'

interface LineState {
  materialId: string
  quantity: string
  unitPrice: string
}

interface InvoiceFile {
  fileId: string
  fileName: string
}

const today = () => new Date().toISOString().slice(0, 10)

export function SelfPurchaseDialog({
  workAreaId,
  workAreaName,
  open,
  onClose,
}: {
  workAreaId: string
  workAreaName?: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordSelfPurchase()
  const { data: catalog } = useMaterialCatalog({ page: 1, size: 200, status: 'ACTIVE' })
  const materials = catalog?.data ?? []

  const [buyerName, setBuyerName] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineState[]>([{ materialId: '', quantity: '1', unitPrice: '' }])
  const [invoices, setInvoices] = useState<InvoiceFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanHint, setScanHint] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const total = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)

  const addLine = () => setLines((prev) => [...prev, { materialId: '', quantity: '1', unitPrice: '' }])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))
  const updateLine = (index: number, patch: Partial<LineState>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  const onInvoicePicked = async (file: File) => {
    setUploading(true)
    setScanHint(null)
    try {
      const uploaded = await uploadFileViaGateway(file, 'PurchaseReceipt')
      setInvoices((prev) => [...prev, { fileId: uploaded.fileId, fileName: uploaded.fileName }])
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
      return
    } finally {
      setUploading(false)
    }

    // OCR chỉ để gợi ý — lỗi/không có mạng thì bỏ qua, người dùng nhập tay.
    setScanning(true)
    try {
      const draft = await readInvoice(file)
      if (draft.supplier && !supplierName.trim()) setSupplierName(draft.supplier)
      if (draft.purchaseDate) setPurchaseDate(draft.purchaseDate)
      if (draft.totalAmount) {
        setScanHint(
          t('features.selfPurchase.ocrAmount', {
            amount: formatVnd(draft.totalAmount),
            defaultValue: 'Hoá đơn ghi {{amount}} — so lại với tổng bên dưới.',
          }),
        )
      } else {
        setScanHint(t('features.selfPurchase.ocrNoAmount'))
      }
    } catch (error) {
      setScanHint(error instanceof OcrUnavailableError ? error.message : t('features.selfPurchase.ocrFailed'))
    } finally {
      setScanning(false)
    }
  }

  const submit = async () => {
    const items = lines
      .filter((line) => line.materialId && Number(line.quantity) > 0)
      .map((line) => ({ materialId: line.materialId, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice || 0) }))
    if (!buyerName.trim()) {
      toast(t('features.selfPurchase.errBuyer'), 'alert')
      return
    }
    if (items.length === 0) {
      toast(t('features.selfPurchase.errItems'), 'alert')
      return
    }
    if (invoices.length === 0) {
      toast(t('features.selfPurchase.errInvoice'), 'alert')
      return
    }
    try {
      await record.mutateAsync({
        workAreaId,
        buyerName: buyerName.trim(),
        supplierName: supplierName.trim() || null,
        purchaseDate,
        items,
        invoiceFileIds: invoices.map((invoice) => invoice.fileId),
        note: note.trim() || null,
      })
      toast(t('features.selfPurchase.saved'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('features.selfPurchase.title')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={record.isPending || uploading || scanning}>
            {record.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t('features.selfPurchase.hint', { area: workAreaName ?? '' })}
        </p>

        {/* Hoá đơn: bắt buộc — dùng cho cả bằng chứng lẫn OCR gợi ý */}
        <div className="space-y-2">
          <Label>{t('features.selfPurchase.invoices')}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void onInvoicePicked(file)
              }}
            />
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileImage className="size-4" />}
              {t('features.selfPurchase.uploadInvoice')}
            </Button>
            {scanning ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ScanLine className="size-3.5" /> {t('features.selfPurchase.scanning')}
              </span>
            ) : null}
          </div>
          {invoices.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {invoices.map((invoice) => (
                <li key={invoice.fileId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{invoice.fileName}</span>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => setInvoices((prev) => prev.filter((item) => item.fileId !== invoice.fileId))}
                  >
                    {t('common.delete')}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-destructive">{t('features.selfPurchase.invoiceRequired')}</p>
          )}
          {scanHint ? <p className="text-xs text-muted-foreground">{scanHint}</p> : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="sp-buyer">{t('features.selfPurchase.buyer')}</Label>
            <Input id="sp-buyer" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="sp-supplier">{t('features.selfPurchase.supplier')}</Label>
            <Input id="sp-supplier" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="sp-date">{t('features.selfPurchase.purchaseDate')}</Label>
            <Input
              id="sp-date"
              type="date"
              value={purchaseDate}
              max={today()}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('features.selfPurchase.materials')}</Label>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-3.5" /> {t('features.selfPurchase.addLine')}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t('features.selfPurchase.material')}</th>
                  <th className="px-3 py-2 text-right">{t('features.selfPurchase.quantity')}</th>
                  <th className="px-3 py-2 text-right">{t('features.selfPurchase.unitPrice')}</th>
                  <th className="px-3 py-2 text-right">{t('features.selfPurchase.lineTotal')}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const selected = materials.find((material) => material.id === line.materialId)
                  return (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <select
                          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
                          value={line.materialId}
                          onChange={(event) => {
                            const material = materials.find((item) => item.id === event.target.value)
                            updateLine(index, {
                              materialId: event.target.value,
                              unitPrice:
                                line.unitPrice || (material?.referenceUnitPrice ? String(material.referenceUnitPrice) : ''),
                            })
                          }}
                        >
                          <option value="">{t('features.selfPurchase.chooseMaterial')}</option>
                          {materials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name} ({material.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="h-8 w-24 text-right"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(event) => updateLine(index, { quantity: event.target.value })}
                        />
                        {selected ? <span className="text-[11px] text-muted-foreground">{selected.unit}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          className="h-8 w-28 text-right"
                          type="number"
                          min="0"
                          step="1"
                          value={line.unitPrice}
                          onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                        />
                      </td>
                      <td className="tabular px-3 py-2 text-right text-sm">
                        {formatVnd(Number(line.quantity || 0) * Number(line.unitPrice || 0))}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(index)}
                          disabled={lines.length === 1}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                    {t('features.selfPurchase.total')}
                  </td>
                  <td className="tabular px-3 py-2 text-right font-semibold">{formatVnd(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <Label htmlFor="sp-note">{t('features.selfPurchase.note')}</Label>
          <Textarea id="sp-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}
