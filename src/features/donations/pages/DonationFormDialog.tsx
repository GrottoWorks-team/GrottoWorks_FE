// Dialog thêm cam kết quyên góp: loại (vật tư của khu officer / tiền),
// donorName required, promisedQty hoặc monetary, note optional. RHF + zod,
// message = i18n key. Create POST status PLEDGED (api tự cộng
// donatedPledged của vật tư).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateDonation } from '../api'
import type { Material } from '@/types'

export const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Trống → undefined (báo lỗi thay vì coerce 0); giá trị nếu có phải ≥ 1.
const numOpt = (key: string) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: key }).min(1, key).optional(),
  )

// Loại quyên góp quyết định field nào bắt buộc (refine gắn lỗi lên field đó).
const schema = z
  .object({
    donorName: z.string().trim().min(1, 'features.donations.donorRequired'),
    kind: z.string().min(1, 'features.donations.kindRequired'),
    materialId: z.string(),
    promisedQty: numOpt('features.donations.qtyInvalid'),
    monetary: numOpt('features.donations.monetaryInvalid'),
    note: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'MATERIAL') {
      if (!data.materialId)
        ctx.addIssue({ code: 'custom', path: ['materialId'], message: 'features.donations.materialRequired' })
      if (data.promisedQty == null)
        ctx.addIssue({ code: 'custom', path: ['promisedQty'], message: 'features.donations.qtyInvalid' })
    } else if (data.monetary == null) {
      ctx.addIssue({ code: 'custom', path: ['monetary'], message: 'features.donations.monetaryInvalid' })
    }
  })
type FormData = z.infer<typeof schema>

export function DonationFormDialog({
  materials,
  onClose,
}: {
  materials: Material[] // vật tư khu officer (page đã lọc)
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateDonation()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount có điều kiện → defaultValues theo prop là đủ.
    defaultValues: { donorName: '', kind: 'MATERIAL', materialId: '', note: '' },
  })
  const kind = watch('kind')

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        donorName: data.donorName,
        status: 'PLEDGED',
        ...(data.kind === 'MATERIAL'
          ? { materialId: data.materialId, promisedQty: data.promisedQty }
          : { monetary: data.monetary }),
        ...(data.note.trim() ? { note: data.note.trim() } : {}),
      })
      toast(t('features.donations.created', { name: data.donorName }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.donations.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="donation-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="donation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="donation-donor">{t('features.donations.donor')}</Label>
          <Input id="donation-donor" {...register('donorName')} />
          {err(errors.donorName?.message)}
        </div>
        <div>
          <Label htmlFor="donation-kind">{t('features.donations.kind')}</Label>
          <select id="donation-kind" className={SELECT_CLS} {...register('kind')}>
            <option value="MATERIAL">{t('features.donations.kind.MATERIAL')}</option>
            <option value="MONETARY">{t('features.donations.kind.MONETARY')}</option>
          </select>
          {err(errors.kind?.message)}
        </div>
        {kind === 'MATERIAL' ? (
          <>
            <div>
              <Label htmlFor="donation-material">{t('features.donations.material')}</Label>
              <select id="donation-material" className={SELECT_CLS} {...register('materialId')}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
              {err(errors.materialId?.message)}
            </div>
            <div>
              <Label htmlFor="donation-qty">{t('features.donations.qty')}</Label>
              <Input id="donation-qty" type="number" min={1} step={1} {...register('promisedQty')} />
              {err(errors.promisedQty?.message)}
            </div>
          </>
        ) : (
          <div>
            <Label htmlFor="donation-money">{t('features.donations.monetary')}</Label>
            {/* min 1 khớp zod .min(1) — tiền 0 vô nghĩa. */}
            <Input id="donation-money" type="number" min={1} step={1000} {...register('monetary')} />
            {err(errors.monetary?.message)}
          </div>
        )}
        <div>
          <Label htmlFor="donation-note">{t('features.donations.note')}</Label>
          <Input id="donation-note" {...register('note')} />
          {err(errors.note?.message)}
        </div>
      </form>
    </Dialog>
  )
}
