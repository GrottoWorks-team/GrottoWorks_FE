// Dialog ghi nhận số dư tồn đầu kỳ (D1: POST /api/v1/inventory/opening-stock)
// Role: MATERIAL_OFFICER của work area
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Calendar, Hash, Layers, Package } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useRecordOpeningStock, useMaterialCatalog } from '../api'
import { useAreas } from '@/features/areas/api'

const openingStockSchema = z.object({
  workAreaId: z.string().min(1, 'features.inventory.dialog.workAreaRequired'),
  materialId: z.string().min(1, 'features.inventory.dialog.materialRequired'),
  quantity: z
    .number({ invalid_type_error: 'features.inventory.dialog.quantityRequired' })
    .positive('features.inventory.dialog.quantityPositive'),
  transactionDate: z.string().optional(),
  note: z.string().max(2000, 'features.inventory.dialog.noteMax').optional(),
})

type FormData = z.infer<typeof openingStockSchema>

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface OpeningStockDialogProps {
  open: boolean
  onClose: () => void
  defaultWorkAreaId?: string
  defaultMaterialId?: string
}

export function OpeningStockDialog({
  open,
  onClose,
  defaultWorkAreaId,
  defaultMaterialId,
}: OpeningStockDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const recordMutation = useRecordOpeningStock()

  const { data: areas = [] } = useAreas()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const materials = catalogResult?.data || []

  const [conflictError, setConflictError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(openingStockSchema),
    defaultValues: {
      workAreaId: defaultWorkAreaId || '',
      materialId: defaultMaterialId || '',
      quantity: 1,
      transactionDate: new Date().toISOString().slice(0, 10),
      note: '',
    },
  })

  const selectedMaterialId = watch('materialId')
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId)

  useEffect(() => {
    if (open) {
      setConflictError(null)
    }
  }, [open])

  const onSubmit = async (values: FormData) => {
    setConflictError(null)
    try {
      const payload = {
        workAreaId: values.workAreaId,
        materialId: values.materialId,
        quantity: values.quantity,
        transactionDate: values.transactionDate ? new Date(values.transactionDate).toISOString() : null,
        note: values.note?.trim() || null,
      }

      await recordMutation.mutateAsync(payload)

      toast(
        t('features.inventory.dialog.success', {
          name: selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.code})` : '',
        }),
      )
      onClose()
    } catch (err: unknown) {
      const errorObj = err as { code?: string; status?: number; message?: string }
      if (
        errorObj?.code === 'OPENING_STOCK_ALREADY_RECORDED' ||
        errorObj?.status === 409 ||
        errorObj?.message?.includes('OPENING_STOCK_ALREADY_RECORDED')
      ) {
        setConflictError(t('features.inventory.dialog.errorConflict'))
      } else {
        toast(t('features.inventory.dialog.errorGeneric'), 'alert')
      }
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.inventory.dialog.title')}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="opening-stock-form"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? t('features.inventory.dialog.submitting') : t('features.inventory.dialog.submit')}
          </Button>
        </div>
      }
    >
      <form id="opening-stock-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <p className="text-xs text-muted-foreground">{t('features.inventory.dialog.sub')}</p>

        {conflictError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <span>{conflictError}</span>
          </div>
        )}

        {/* Khu vực công tác */}
        <div className="space-y-1.5">
          <Label htmlFor="stock-workAreaId" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Layers className="size-3.5 text-muted-foreground" />
            {t('features.inventory.dialog.workArea')} <span className="text-destructive">*</span>
          </Label>
          <select id="stock-workAreaId" className={SELECT_CLS} {...register('workAreaId')}>
            <option value="">{t('features.inventory.dialog.workAreaPlaceholder')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name?.trim() || t('features.areas.areaFallback', { id: a.id.slice(0, 8) })}
              </option>
            ))}
          </select>
          {errors.workAreaId && (
            <p className="text-xs text-destructive">{t(errors.workAreaId.message || '')}</p>
          )}
        </div>

        {/* Vật tư */}
        <div className="space-y-1.5">
          <Label htmlFor="stock-materialId" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Package className="size-3.5 text-muted-foreground" />
            {t('features.inventory.dialog.material')} <span className="text-destructive">*</span>
          </Label>
          <select id="stock-materialId" className={SELECT_CLS} {...register('materialId')}>
            <option value="">{t('features.inventory.dialog.materialPlaceholder')}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name} ({m.unit})
              </option>
            ))}
          </select>
          {errors.materialId && (
            <p className="text-xs text-destructive">{t(errors.materialId.message || '')}</p>
          )}
        </div>

        {/* Số lượng */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="stock-quantity" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Hash className="size-3.5 text-muted-foreground" />
              {t('features.inventory.dialog.quantity')} <span className="text-destructive">*</span>
            </Label>
            {selectedMaterial && (
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {t('features.inventory.colUnit')}: <strong className="text-primary">{selectedMaterial.unit}</strong>
              </span>
            )}
          </div>
          <Input
            id="stock-quantity"
            type="number"
            step="any"
            placeholder={t('features.inventory.dialog.quantityPlaceholder')}
            {...register('quantity', { valueAsNumber: true })}
          />
          {errors.quantity && (
            <p className="text-xs text-destructive">{t(errors.quantity.message || '')}</p>
          )}
        </div>

        {/* Ngày kiểm đếm */}
        <div className="space-y-1.5">
          <Label htmlFor="stock-date" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Calendar className="size-3.5 text-muted-foreground" />
            {t('features.inventory.dialog.date')}
          </Label>
          <Input id="stock-date" type="date" {...register('transactionDate')} />
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="stock-note" className="text-xs font-semibold text-foreground">
            {t('features.inventory.dialog.note')}
          </Label>
          <Textarea
            id="stock-note"
            rows={3}
            placeholder={t('features.inventory.dialog.notePlaceholder')}
            {...register('note')}
          />
          {errors.note && <p className="text-xs text-destructive">{t(errors.note.message || '')}</p>}
        </div>
      </form>
    </Dialog>
  )
}
