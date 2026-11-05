// Dialog thêm cam kết quyên góp: BE nhận donor tự động (VolunteerDonorResolver
// theo user đang đăng nhập) nên không nhập tên người quyên góp.
//   MATERIAL → workAreaId + material (phải nằm trong nhu cầu ACTIVE của khu)
//   MONEY    → seasonId + amount
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useWorkAreaRequirements } from '@/features/materials/api'
import { useSeasons } from '@/features/season/api'
import { useCreateMaterialPledge, useCreateMonetaryPledge } from '../api'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'
const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const numberField = (required: string, invalid: string) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: invalid }).min(1, invalid).refine((n) => Number.isFinite(n), required),
  )

const schema = z
  .object({
    kind: z.enum(['MATERIAL', 'MONEY']),
    areaId: z.string(),
    materialId: z.string(),
    qty: numberField('features.donations.qtyRequired', 'features.donations.qtyInvalid').optional(),
    seasonId: z.string(),
    amount: numberField('features.donations.amountRequired', 'features.donations.monetaryInvalid').optional(),
    note: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'MATERIAL') {
      if (!data.areaId)
        ctx.addIssue({ code: 'custom', path: ['areaId'], message: 'features.donations.areaRequired' })
      if (!data.materialId)
        ctx.addIssue({ code: 'custom', path: ['materialId'], message: 'features.donations.materialRequired' })
    } else {
      if (!data.seasonId)
        ctx.addIssue({ code: 'custom', path: ['seasonId'], message: 'features.donations.seasonRequired' })
    }
  })

type FormData = z.infer<typeof schema>

export function DonationFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: areas = [] } = useScopedAreas()
  const { data: seasons = [] } = useSeasons()
  const createMaterial = useCreateMaterialPledge()
  const createMoney = useCreateMonetaryPledge()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { kind: 'MATERIAL', areaId: '', materialId: '', seasonId: '', note: '' },
  })

  const kind = watch('kind')
  const areaId = watch('areaId')
  const { data: requirements = [] } = useWorkAreaRequirements(kind === 'MATERIAL' ? areaId || undefined : undefined, 'ACTIVE')

  const onSubmit = async (data: FormData) => {
    try {
      if (data.kind === 'MATERIAL') {
        await createMaterial.mutateAsync({
          workAreaId: data.areaId,
          materialId: data.materialId,
          pledgedQuantity: data.qty ?? 0,
          note: data.note || undefined,
        })
      } else {
        await createMoney.mutateAsync({
          seasonId: data.seasonId,
          amount: data.amount ?? 0,
          note: data.note || undefined,
        })
      }
      toast(t('features.donations.created', { name: t('features.donations.selfDonor') }))
      reset({ kind: data.kind, areaId: '', materialId: '', seasonId: '', note: '' })
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.donations.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="donation-create-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="donation-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {t('features.donations.selfDonorHint')}
        </p>
        <div>
          <Label htmlFor="donation-kind">{t('features.donations.kind')}</Label>
          <select id="donation-kind" className={SELECT_CLS} {...register('kind')}>
            <option value="MATERIAL">{t('features.donations.kind.MATERIAL')}</option>
            <option value="MONEY">{t('features.donations.kind.MONETARY')}</option>
          </select>
        </div>
        {kind === 'MATERIAL' ? (
          <>
            <div>
              <Label htmlFor="donation-area">{t('features.allocations.area')}</Label>
              <select id="donation-area" className={SELECT_CLS} {...register('areaId')}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {err(errors.areaId?.message)}
            </div>
            <div>
              <Label htmlFor="donation-material">{t('features.donations.material')}</Label>
              <select id="donation-material" className={SELECT_CLS} {...register('materialId')} disabled={!areaId}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {requirements.map((r) => (
                  <option key={r.materialId} value={r.materialId}>
                    {r.materialName} ({r.unit})
                  </option>
                ))}
              </select>
              {areaId && requirements.length === 0 && (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {t('features.donations.noRequirement')}
                </p>
              )}
              {err(errors.materialId?.message)}
            </div>
            <div>
              <Label htmlFor="donation-qty">{t('features.donations.qty')}</Label>
              <Input id="donation-qty" type="number" min={1} step={1} {...register('qty')} />
              {err(errors.qty?.message)}
            </div>
          </>
        ) : (
          <>
            <div>
              <Label htmlFor="donation-season">{t('features.donations.season')}</Label>
              <select id="donation-season" className={SELECT_CLS} {...register('seasonId')}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {err(errors.seasonId?.message)}
            </div>
            <div>
              <Label htmlFor="donation-amount">{t('features.donations.monetary')}</Label>
              <Input id="donation-amount" type="number" min={1} step={1000} {...register('amount')} />
              {err(errors.amount?.message)}
            </div>
          </>
        )}
        <div>
          <Label htmlFor="donation-note">{t('features.donations.note')}</Label>
          <textarea id="donation-note" rows={2} className={TEXTAREA_CLS} {...register('note')} />
        </div>
      </form>
    </Dialog>
  )
}