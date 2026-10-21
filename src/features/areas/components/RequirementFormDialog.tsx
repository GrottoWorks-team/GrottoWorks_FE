// Dialog thêm nhu cầu vật tư cho khu vực (E2: POST /api/v1/work-areas/{workAreaId}/material-requirements)
// Role: MATERIAL_OFFICER
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Hash, Package } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  useCreateMaterialRequirement,
  useMaterialCatalog,
} from '@/features/materials/api'

const requirementSchema = z.object({
  materialId: z.string().min(1, 'features.requirements.materialRequired'),
  requiredQuantity: z
    .number({ invalid_type_error: 'features.requirements.requiredQtyRequired' })
    .positive('features.requirements.requiredQtyPositive'),
  existingQuantity: z.number().optional().nullable(),
  note: z.string().max(2000, 'features.materials.catalog.descMax').optional().nullable(),
})

type FormData = z.infer<typeof requirementSchema>

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface RequirementFormDialogProps {
  open: boolean
  onClose: () => void
  workAreaId: string
}

export function RequirementFormDialog({
  open,
  onClose,
  workAreaId,
}: RequirementFormDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const createMutation = useCreateMaterialRequirement()

  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const materials = catalogResult?.data || []

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(requirementSchema),
    defaultValues: {
      materialId: '',
      requiredQuantity: 1,
      existingQuantity: 0,
      note: '',
    },
  })

  const selectedMaterialId = watch('materialId')
  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId)

  useEffect(() => {
    if (open) {
      reset({
        materialId: '',
        requiredQuantity: 1,
        existingQuantity: 0,
        note: '',
      })
    }
  }, [open, reset])

  const onSubmit = async (values: FormData) => {
    try {
      await createMutation.mutateAsync({
        workAreaId,
        materialId: values.materialId,
        requiredQuantity: values.requiredQuantity,
        existingQuantity: values.existingQuantity ?? 0,
        note: values.note?.trim() || null,
      })

      toast(
        t('features.requirements.createdSuccess', {
          name: selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.code})` : '',
        }),
      )
      onClose()
    } catch {
      toast(t('features.requirements.saveError'), 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.requirements.dialogCreate')}
      size="md"
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="requirement-form"
            disabled={isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isSubmitting ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      }
    >
      <form id="requirement-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <p className="text-xs text-muted-foreground">{t('features.requirements.dialogSub')}</p>

        {/* Chọn vật tư */}
        <div className="space-y-1.5">
          <Label htmlFor="req-materialId" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Package className="size-3.5 text-muted-foreground" />
            {t('features.requirements.material')} <span className="text-destructive">*</span>
          </Label>
          <select id="req-materialId" className={SELECT_CLS} {...register('materialId')}>
            <option value="">{t('features.requirements.materialPlaceholder')}</option>
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

        {/* Số lượng yêu cầu */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="req-quantity" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Hash className="size-3.5 text-muted-foreground" />
              {t('features.requirements.requiredQty')} <span className="text-destructive">*</span>
            </Label>
            {selectedMaterial && (
              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                {t('features.requirements.colUnit')}: <strong className="text-primary">{selectedMaterial.unit}</strong>
              </span>
            )}
          </div>
          <Input
            id="req-quantity"
            type="number"
            step="any"
            placeholder={t('features.requirements.requiredQtyPlaceholder')}
            {...register('requiredQuantity', { valueAsNumber: true })}
          />
          {errors.requiredQuantity && (
            <p className="text-xs text-destructive">{t(errors.requiredQuantity.message || '')}</p>
          )}
        </div>

        {/* Số lượng có sẵn tại khu vực */}
        <div className="space-y-1.5">
          <Label htmlFor="req-existing" className="text-xs font-semibold text-foreground">
            {t('features.requirements.existingQty')}
          </Label>
          <Input
            id="req-existing"
            type="number"
            step="any"
            placeholder={t('features.requirements.existingQtyPlaceholder')}
            {...register('existingQuantity', { valueAsNumber: true })}
          />
        </div>

        {/* Ghi chú */}
        <div className="space-y-1.5">
          <Label htmlFor="req-note" className="text-xs font-semibold text-foreground">
            {t('features.requirements.note')}
          </Label>
          <Textarea
            id="req-note"
            rows={3}
            placeholder={t('features.requirements.notePlaceholder')}
            {...register('note')}
          />
          {errors.note && <p className="text-xs text-destructive">{t(errors.note.message || '')}</p>}
        </div>
      </form>
    </Dialog>
  )
}
