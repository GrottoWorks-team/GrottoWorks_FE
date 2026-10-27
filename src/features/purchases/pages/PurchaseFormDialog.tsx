// Dialog tạo (F2) và chỉnh sửa (F4) yêu cầu mua ở trạng thái DRAFT:
// Chọn khu vực công tác, nhập lý do chung, thêm các dòng vật tư từ catalog.
// Tự động kiểm tra số lượng thiếu hụt (Shortages API).
// Nếu quantity > shortage, bắt buộc nhập shortageOverrideReason (BA 8.6).
import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterialCatalog, useWorkAreaShortages, type MaterialCatalogItemDto } from '@/features/materials/api'
import { errorMessage } from '@/lib/errorMessage'
import {
  useCreatePurchaseRequest,
  useUpdatePurchaseRequest,
  type PurchaseRequestDto,
  type PurchaseRequestItemInput,
} from '../api'

interface ItemRow {
  materialId: string
  requestedQuantity: number
  estimatedCost: number
  note: string
  shortageOverrideReason: string
}

interface PurchaseFormDialogProps {
  onClose: () => void
  initialData?: PurchaseRequestDto
}

export function PurchaseFormDialog({ onClose, initialData }: PurchaseFormDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()

  const { data: areas = [] } = useAreas()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const catalog: MaterialCatalogItemDto[] = catalogResult?.data ?? []

  const [workAreaId, setWorkAreaId] = useState<string>(initialData?.workAreaId ?? '')
  const [reason, setReason] = useState<string>(initialData?.reason ?? '')

  // Lấy danh sách shortages của khu vực được chọn để validate BA 8.6
  const { data: shortages = [] } = useWorkAreaShortages(workAreaId || undefined)
  const shortageMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of shortages) {
      map.set(s.materialId, s.shortage)
    }
    return map
  }, [shortages])

  const [items, setItems] = useState<ItemRow[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((i) => ({
        materialId: i.materialId,
        requestedQuantity: i.requestedQuantity,
        estimatedCost: i.estimatedCost ?? 0,
        note: i.note ?? '',
        shortageOverrideReason: i.shortageOverrideReason ?? '',
      }))
    }
    return [
      {
        materialId: '',
        requestedQuantity: 1,
        estimatedCost: 0,
        note: '',
        shortageOverrideReason: '',
      },
    ]
  })

  const create = useCreatePurchaseRequest()
  const update = useUpdatePurchaseRequest()

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        materialId: '',
        requestedQuantity: 1,
        estimatedCost: 0,
        note: '',
        shortageOverrideReason: '',
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], ...patch }

      // update item values

      next[index] = current
      return next
    })
  }

  const totalEstimatedCost = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0)
  }, [items])

  const isValid = useMemo(() => {
    if (!initialData && !workAreaId) return false
    if (items.length === 0) return false

    for (const item of items) {
      if (!item.materialId) return false
      if (item.requestedQuantity <= 0) return false

      // BA 8.6: Nếu requestedQuantity > shortage, bắt buộc có shortageOverrideReason (1-500 ký tự)
      const maxShortage = shortageMap.get(item.materialId) ?? 0
      if (item.requestedQuantity > maxShortage) {
        if (!item.shortageOverrideReason.trim() || item.shortageOverrideReason.length > 500) {
          return false
        }
      }
    }
    return true
  }, [initialData, workAreaId, items, shortageMap])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    const payloadItems: PurchaseRequestItemInput[] = items.map((i) => ({
      materialId: i.materialId,
      requestedQuantity: Number(i.requestedQuantity),
      estimatedCost: Number(i.estimatedCost) || null,
      note: i.note.trim() || null,
      shortageOverrideReason: i.shortageOverrideReason.trim() || null,
    }))

    try {
      if (initialData) {
        // F4: Update
        await update.mutateAsync({
          requestId: initialData.id,
          payload: {
            version: initialData.version,
            reason: reason.trim() || null,
            items: payloadItems,
          },
        })
        toast(t('features.purchases.updated'))
      } else {
        // F2: Create
        await create.mutateAsync({
          workAreaId,
          reason: reason.trim() || null,
          items: payloadItems,
        })
        toast(t('features.purchases.created'))
      }
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  const isSubmitting = create.isPending || update.isPending

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={initialData ? t('features.purchases.editTitle') : t('features.purchases.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="purchase-request-form"
            disabled={!isValid || isSubmitting}
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="purchase-request-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Chọn khu vực (chỉ khi tạo mới) */}
        {!initialData && (
          <div>
            <Label htmlFor="purchase-area">{t('features.purchases.selectArea')} *</Label>
            <select
              id="purchase-area"
              className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              value={workAreaId}
              onChange={(e) => setWorkAreaId(e.target.value)}
              required
            >
              <option value="">{t('features.purchases.selectArea')}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lý do đề nghị mua */}
        <div>
          <Label htmlFor="purchase-reason">{t('features.purchases.reasonLabel')}</Label>
          <textarea
            id="purchase-reason"
            rows={2}
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            placeholder={t('features.purchases.reasonLabel')}
            maxLength={2000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Danh sách vật tư */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <Label className="font-semibold">{t('features.purchases.itemsCard')}</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="size-3.5" />
              <span>{t('features.purchases.addItem')}</span>
            </Button>
          </div>

          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {items.map((row, index) => {
              const maxShortage = shortageMap.get(row.materialId) ?? 0
              const isOverShortage = row.requestedQuantity > maxShortage

              return (
                <div
                  key={index}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3 relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-destructive hover:bg-destructive/10"
                        title={t('features.purchases.removeItem')}
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Chọn vật tư từ catalog */}
                    <div className="sm:col-span-2">
                      <Label className="text-xs">{t('features.purchases.material')} *</Label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={row.materialId}
                        onChange={(e) => handleItemChange(index, { materialId: e.target.value })}
                        required
                      >
                        <option value="">{t('features.purchases.selectMaterial')}</option>
                        {catalog.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.code}] {m.name} ({m.unit})
                          </option>
                        ))}
                      </select>
                      {row.materialId && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t('features.purchases.shortOf', {
                            n: maxShortage,
                            unit: catalog.find((c) => c.id === row.materialId)?.unit ?? '',
                          })}
                        </p>
                      )}
                    </div>

                    {/* Số lượng xin */}
                    <div>
                      <Label className="text-xs">{t('features.purchases.requestedQty')} *</Label>
                      <Input
                        type="number"
                        min={1}
                        step="any"
                        className="mt-1 h-9 text-xs"
                        value={row.requestedQuantity}
                        onChange={(e) =>
                          handleItemChange(index, { requestedQuantity: Number(e.target.value) || 0 })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Chi phí ước tính */}
                    <div>
                      <Label className="text-xs">{t('features.purchases.estimatedCost')} (₫)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="mt-1 h-9 text-xs"
                        value={row.estimatedCost}
                        onChange={(e) =>
                          handleItemChange(index, { estimatedCost: Number(e.target.value) || 0 })
                        }
                      />
                    </div>

                    {/* Ghi chú */}
                    <div>
                      <Label className="text-xs">{t('features.purchases.note')}</Label>
                      <Input
                        type="text"
                        maxLength={2000}
                        className="mt-1 h-9 text-xs"
                        value={row.note}
                        onChange={(e) => handleItemChange(index, { note: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* BA 8.6: Lý do vượt định mức */}
                  {isOverShortage && (
                    <div className="rounded-md border border-amber-300/60 bg-amber-50/50 p-2.5 dark:border-amber-700/60 dark:bg-amber-950/20">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        <span>{t('features.purchases.shortageOverrideRequired')} *</span>
                      </div>
                      <Input
                        type="text"
                        maxLength={500}
                        className="mt-1.5 h-8 text-xs border-amber-300 bg-card dark:border-amber-700"
                        placeholder={t('features.purchases.shortageOverrideReason')}
                        value={row.shortageOverrideReason}
                        onChange={(e) =>
                          handleItemChange(index, { shortageOverrideReason: e.target.value })
                        }
                        required
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>{t('features.purchases.total')}:</span>
            <span className="tabular text-primary">
              {totalEstimatedCost.toLocaleString()} VND
            </span>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
