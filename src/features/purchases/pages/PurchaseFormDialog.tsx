// Dialog tạo đề nghị mua (DRAFT): chọn vật tư đang thiếu của khu (checkbox,
// hiện số lượng thiếu), nhập số lượng từng món, note. Total tự tính từ
// qty × estUnitPrice. Gửi duyệt là action riêng ở row (DRAFT → PENDING).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { shortage } from '@/types'
import type { Material } from '@/types'
import { useCreatePurchaseRequest } from '../api'

const CHECK_CLS = 'mt-1 size-4 rounded border border-border bg-card accent-primary'

// qtys là record string→string (input uncontrolled), ép số lúc submit.
const schema = z
  .object({
    materialIds: z.array(z.string()).min(1, 'features.purchases.pickRequired'),
    note: z.string(),
    qtys: z.record(z.string(), z.string()),
  })
  .refine((d) => d.materialIds.every((id) => Number(d.qtys[id] ?? '') > 0), {
    path: ['materialIds'],
    message: 'features.purchases.qtyRequired',
  })
type FormData = z.infer<typeof schema>

export function PurchaseFormDialog({
  onClose,
  materials,
}: {
  onClose: () => void
  materials: Material[] // vật tư đang thiếu của khu (page lọc sẵn)
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const create = useCreatePurchaseRequest()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { materialIds: [], note: '', qtys: {} },
  })

  const values = watch()
  const total = values.materialIds.reduce(
    (s, id) => s + Number(values.qtys[id] ?? 0) * (materials.find((m) => m.id === id)?.estUnitPrice ?? 0),
    0,
  )

  const onSubmit = async (data: FormData) => {
    const qtys: Record<string, number> = {}
    for (const id of data.materialIds) qtys[id] = Number(data.qtys[id])
    try {
      await create.mutateAsync({
        materialIds: data.materialIds,
        qtys,
        total,
        status: 'DRAFT',
        ...(user ? { createdBy: user.id } : {}),
        note: data.note.trim() || undefined,
      })
      toast(t('features.purchases.created'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="purchase-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label>{t('features.purchases.pickMaterials')}</Label>
          {materials.length ? (
            <div className="mt-1 space-y-2">
              {materials.map((m) => {
                const checked = values.materialIds.includes(m.id)
                return (
                  <div key={m.id} className="rounded-card border border-border/60 p-2.5">
                    <label className="flex items-start gap-2 text-sm text-foreground">
                      <input type="checkbox" value={m.id} className={CHECK_CLS} {...register('materialIds')} />
                      <span className="flex-1">
                        <span className="font-semibold">{m.name}</span>{' '}
                        <span className="text-muted-foreground">
                          {t('features.purchases.shortOf', { n: shortage(m), unit: m.unit })}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t('features.purchases.estUnitPrice')}:{' '}
                          <span className="tabular">{m.estUnitPrice.toLocaleString()}</span> ₫/{m.unit}
                        </span>
                      </span>
                    </label>
                    {checked && (
                      <div className="mt-2 pl-6">
                        <Label htmlFor={`qty-${m.id}`}>{t('features.purchases.qty')}</Label>
                        <Input
                          id={`qty-${m.id}`}
                          type="number"
                          min={1}
                          step={1}
                          className="max-w-32"
                          defaultValue={shortage(m)}
                          {...register(`qtys.${m.id}`)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="pt-1 text-sm text-muted-foreground">{t('features.purchases.noShortage')}</p>
          )}
          {errors.materialIds?.message ? (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.materialIds.message)}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="purchase-note">{t('features.purchases.note')}</Label>
          <Input id="purchase-note" {...register('note')} />
        </div>
        <p className="text-right text-sm text-foreground">
          {t('features.purchases.total')}:{' '}
          <span className="tabular font-bold">{total.toLocaleString()} ₫</span>
        </p>
      </form>
    </Dialog>
  )
}
