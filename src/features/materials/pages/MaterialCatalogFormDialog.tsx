// Dialog tạo/sửa danh mục vật tư dùng chung (/api/v1/materials)
// C5: POST /api/v1/materials
// C6: PATCH /api/v1/materials/{materialId}
// Lưu ý C6: Sau khi vật tư đã phát sinh giao dịch/nhu cầu, trường 'unit' sẽ bị khóa
// bởi BE (MATERIAL_UNIT_LOCKED). UI disable ô nhập và hiển thị tooltip/cảnh báo rõ ràng.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  useCreateMaterialCatalogItem,
  useMaterialCategories,
  useUpdateMaterialCatalogItem,
} from '../api'
import type { MaterialCatalogItemDto } from '../api'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/errorMessage'

const schema = z.object({
  categoryId: z.string().min(1, 'features.materials.catalog.categoryRequired'),
  code: z
    .string()
    .trim()
    .min(1, 'features.materials.catalog.codeRequired')
    .max(50, 'features.materials.catalog.codeMax')
    .regex(/^[A-Za-z0-9_-]+$/, 'features.materials.catalog.codeRegex'),
  name: z.string().trim().min(1, 'features.materials.catalog.nameRequired').max(150, 'features.materials.catalog.nameMax'),
  unit: z.string().trim().min(1, 'features.materials.catalog.unitRequired').max(30, 'features.materials.catalog.unitMax'),
  description: z.string().max(2000, 'features.materials.catalog.descMax').optional(),
})

type FormData = z.infer<typeof schema>

export function MaterialCatalogFormDialog({
  onClose,
  material,
}: {
  onClose: () => void
  material?: MaterialCatalogItemDto | null
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: categories = [] } = useMaterialCategories('ACTIVE')
  const create = useCreateMaterialCatalogItem()
  const update = useUpdateMaterialCatalogItem()

  const [isUnitLocked, setIsUnitLocked] = useState(false)
  const editing = Boolean(material)

  // Kiểm tra lịch sử giao dịch để biết unit có bị khóa hay không (C6)
  useEffect(() => {
    if (!material?.id) {
      setIsUnitLocked(false)
      return
    }

    let isMounted = true
    api<unknown[]>(`/api/v1/materials/${material.id}/allocation-history`)
      .then((data) => {
        const items = Array.isArray(data) ? data : (data as any)?.data
        if (isMounted && items && items.length > 0) {
          setIsUnitLocked(true)
        }
      })
      .catch(() => {
        // Fallback: Nếu không đọc được lịch sử, không khóa trước
      })

    return () => {
      isMounted = false
    }
  }, [material?.id])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: material
      ? {
          categoryId: material.categoryId,
          code: material.code,
          name: material.name,
          unit: material.unit,
          description: material.description || '',
        }
      : {
          categoryId: categories[0]?.id || '',
          code: '',
          name: '',
          unit: '',
          description: '',
        },
  })

  const onSubmit = async (values: FormData) => {
    try {
      if (editing && material) {
        // C6: PATCH /api/v1/materials/{materialId}
        await update.mutateAsync({
          materialId: material.id,
          categoryId: values.categoryId,
          name: values.name,
          unit: isUnitLocked ? undefined : values.unit,
          description: values.description || null,
        })
        toast(t('features.materials.catalog.updated'))
      } else {
        // C5: POST /api/v1/materials
        await create.mutateAsync({
          categoryId: values.categoryId,
          code: values.code.toUpperCase(),
          name: values.name,
          unit: values.unit,
          description: values.description || null,
        })
        toast(t('features.materials.catalog.created'))
      }
      onClose()
    } catch (err: unknown) {
      toast(errorMessage(err))
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? t('features.materials.catalog.dialogEdit') : t('features.materials.catalog.dialogCreate')}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="cat-id">{t('features.materials.catalog.category')} *</Label>
          <select
            id="cat-id"
            {...register('categoryId')}
            className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 mt-1"
          >
            <option value="">{t('features.materials.catalog.categoryPlaceholder')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-xs text-destructive mt-1">{t(errors.categoryId.message || '')}</p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-code">{t('features.materials.catalog.code')} *</Label>
          <Input
            id="mat-code"
            {...register('code')}
            disabled={editing}
            placeholder={t('features.materials.catalog.codePlaceholder')}
            className="mt-1 font-mono uppercase"
          />
          {errors.code && <p className="text-xs text-destructive mt-1">{t(errors.code.message || '')}</p>}
          {editing && (
            <p className="text-xs text-muted-foreground mt-1">{t('features.materials.catalog.codeImmutable')}</p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-name">{t('features.materials.catalog.name')} *</Label>
          <Input
            id="mat-name"
            {...register('name')}
            placeholder={t('features.materials.catalog.namePlaceholder')}
            className="mt-1"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{t(errors.name.message || '')}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="mat-unit">{t('features.materials.catalog.unitFullName')} *</Label>
            {isUnitLocked && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                <Lock className="size-3" /> {t('features.materials.catalog.unitLockedBadge')}
              </span>
            )}
          </div>
          <Input
            id="mat-unit"
            {...register('unit')}
            disabled={isUnitLocked}
            placeholder={t('features.materials.catalog.unitPlaceholder')}
            className="mt-1"
          />
          {errors.unit && <p className="text-xs text-destructive mt-1">{t(errors.unit.message || '')}</p>}
          {isUnitLocked ? (
            <div className="flex items-start gap-1.5 mt-1.5 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                {t('features.materials.catalog.unitLockedWarning')}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              {t('features.materials.catalog.unitHelper')}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-desc">{t('features.materials.catalog.descFull')}</Label>
          <Textarea
            id="mat-desc"
            {...register('description')}
            rows={2}
            placeholder={t('features.materials.catalog.descPlaceholder')}
            className="mt-1"
          />
          {errors.description && (
            <p className="text-xs text-destructive mt-1">{t(errors.description.message || '')}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : editing ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
