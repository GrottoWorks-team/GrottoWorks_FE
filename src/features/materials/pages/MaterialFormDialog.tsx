// Dialog tạo/sửa vật tư — RHF + zod: name, unit, required, existing,
// estUnitPrice. purchased/donated/received là field suy diễn của flow
// (mua sắm / quyên góp) → chỉ hiển thị read-only, không nhập tay.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateMaterial, useUpdateMaterial } from '../api'
import type { Material } from '@/types'

// Trống → undefined để báo lỗi thay vì coerce 0 (pattern Task 5).
const num = (key: string) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: key }).min(0, key),
  )
// Optional: trống hợp lệ (chưa biết giá), sai định dạng/âm mới báo lỗi.
const numOpt = (key: string) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: key }).min(0, key).optional(),
  )

const schema = z.object({
  name: z.string().trim().min(1, 'features.materials.nameRequired'),
  unit: z.string().trim().min(1, 'features.materials.unitRequired'),
  required: num('features.materials.numberInvalid'),
  existing: num('features.materials.numberInvalid'),
  estUnitPrice: numOpt('features.materials.priceInvalid'),
})
type FormData = z.infer<typeof schema>

export function MaterialFormDialog({
  onClose,
  material,
  areaId,
}: {
  onClose: () => void
  material?: Material | null // null/undefined = create
  areaId: string // khu của trang — vật tư luôn gắn khu
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateMaterial()
  const update = useUpdateMaterial()
  const editing = Boolean(material)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount dialog có điều kiện → defaultValues theo prop là đủ.
    defaultValues: material
      ? {
          name: material.name,
          unit: material.unit,
          required: material.required,
          existing: material.existing,
          estUnitPrice: material.estUnitPrice,
        }
      : { name: '', unit: '', required: undefined, existing: undefined, estUnitPrice: undefined },
  })

  const onSubmit = async (data: FormData) => {
    // Trống đơn giá → 0 (chưa biết giá) — type yêu cầu number.
    const payload = { ...data, estUnitPrice: data.estUnitPrice ?? 0 }
    try {
      if (editing && material) {
        await update.mutateAsync({ id: material.id, ...payload })
        toast(t('features.materials.updated', { name: data.name }))
      } else {
        await create.mutateAsync({ areaId, ...payload, purchased: 0, donatedPledged: 0, donatedReceived: 0 })
        toast(t('features.materials.created', { name: data.name }))
      }
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  const RO = 'flex h-10 w-full rounded-md border border-border/60 bg-card/50 px-3 py-2 text-sm text-muted-foreground'

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? t('features.materials.edit') : t('features.materials.create')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="material-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="material-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="material-name">{t('features.materials.name')}</Label>
          <Input id="material-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="material-unit">{t('features.materials.unit')}</Label>
            <Input id="material-unit" {...register('unit')} />
            {err(errors.unit?.message)}
          </div>
          <div>
            <Label htmlFor="material-price">{t('features.materials.estUnitPrice')}</Label>
            <Input id="material-price" type="number" min={0} step={1000} {...register('estUnitPrice')} />
            {err(errors.estUnitPrice?.message)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="material-required">{t('features.materials.required')}</Label>
            <Input id="material-required" type="number" min={0} step={1} {...register('required')} />
            {err(errors.required?.message)}
          </div>
          <div>
            <Label htmlFor="material-existing">{t('features.materials.existing')}</Label>
            <Input id="material-existing" type="number" min={0} step={1} {...register('existing')} />
            {err(errors.existing?.message)}
          </div>
        </div>
        {editing && material && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t('features.materials.purchased')}</Label>
              <p className={`${RO} tabular items-center`}>{material.purchased}</p>
            </div>
            <div>
              <Label>{t('features.materials.donated')}</Label>
              <p className={`${RO} tabular items-center`}>{material.donatedReceived}</p>
            </div>
            <div>
              <Label>{t('features.materials.received')}</Label>
              <p className={`${RO} tabular items-center`}>{material.received}</p>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  )
}
