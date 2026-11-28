// Dialog thêm cam kết quyên góp: BE nhận donor tự động (VolunteerDonorResolver
// theo user đang đăng nhập) nên không nhập tên người quyên góp.
//   MATERIAL → workAreaId + material (phải nằm trong nhu cầu ACTIVE của khu)
//   MONEY    → seasonId + amount
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Quyên góp — Thêm cam kết".
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useScopedAreas } from '@/features/areas/api'
import { useWorkAreaRequirements } from '@/features/materials/api'
import { useSeasons } from '@/features/season/api'
import { useCreateMaterialPledge, useCreateMonetaryPledge } from '../api'

const FIELD =
  'h-[34px] w-full rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] text-[10.5px] text-[#0B2E1F] focus-visible:outline-none focus-visible:border-[#0A5C36]'
const FLD = 'text-[10px] font-semibold text-[#5C7468]'

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
  const { user } = useAuth()
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

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
    msg ? <p className="mt-1 text-[10px] font-semibold text-[#B4483F]">{t(msg)}</p> : null

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label={t('common.cancel')} className="absolute inset-0 bg-[#06281B59]" onClick={onClose} />
      <section className="relative flex max-h-[86vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[18px] border border-[#E3EAE0] bg-white shadow-[0px_24px_60px_#06281B40]">
        <header className="flex w-full items-start justify-between gap-3 px-[18px] pb-3 pt-4">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[16px] font-extrabold tracking-[-0.3px] text-[#0B2E1F]">{t('features.donations.createTitle')}</span>
            <span className="text-[10.5px] text-[#8AA298]">
              {t('features.donations.createSub', { defaultValue: 'Cam kết vật tư hoặc tiền cho khu vực trong mùa' })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[#F6F8F4] text-[#6B8175] transition-colors hover:bg-[#EAF0E6]"
          >
            <X className="size-[13px]" aria-hidden />
          </button>
        </header>
        <div className="h-px w-full bg-[#ECF1E9]" />

        <form
          id="donation-create-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[18px] py-[14px]"
          noValidate
        >
          <div className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.donor')}</span>
            <div className="flex h-[34px] w-full items-center rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] text-[10.5px] text-[#7C9287]">
              {user?.name ?? '—'}
            </div>
            <span className="text-[9.5px] leading-[13px] text-[#A3B4A9]">{t('features.donations.selfDonorHint')}</span>
          </div>

          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.kind')}</span>
            <select aria-label={t('features.donations.kind')} className={FIELD} {...register('kind')}>
              <option value="MATERIAL">{t('features.donations.kind.MATERIAL')}</option>
              <option value="MONEY">{t('features.donations.kind.MONETARY')}</option>
            </select>
          </label>

          {kind === 'MATERIAL' ? (
            <>
              <label className="flex w-full flex-col gap-1">
                <span className={FLD}>{t('features.allocations.area')}</span>
                <select aria-label={t('features.allocations.area')} className={FIELD} {...register('areaId')}>
                  <option value="">{t('features.tasks.selectPlaceholder')}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {err(errors.areaId?.message)}
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className={FLD}>{t('features.donations.material')}</span>
                <select
                  aria-label={t('features.donations.material')}
                  className={FIELD}
                  {...register('materialId')}
                  disabled={!areaId}
                >
                  <option value="">{t('features.tasks.selectPlaceholder')}</option>
                  {requirements.map((r) => (
                    <option key={r.materialId} value={r.materialId}>
                      {r.materialName} ({r.unit})
                    </option>
                  ))}
                </select>
                {areaId && requirements.length === 0 && (
                  <p className="mt-1 text-[10px] font-semibold text-[#8AA298]">{t('features.donations.noRequirement')}</p>
                )}
                {err(errors.materialId?.message)}
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className={FLD}>{t('features.donations.qty')}</span>
                <input
                  aria-label={t('features.donations.qty')}
                  type="number"
                  min={1}
                  step={1}
                  className={cn(FIELD, 'font-mono')}
                  {...register('qty')}
                />
                {err(errors.qty?.message)}
              </label>
            </>
          ) : (
            <>
              <label className="flex w-full flex-col gap-1">
                <span className={FLD}>{t('features.donations.season')}</span>
                <select aria-label={t('features.donations.season')} className={FIELD} {...register('seasonId')}>
                  <option value="">{t('features.tasks.selectPlaceholder')}</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {err(errors.seasonId?.message)}
              </label>
              <label className="flex w-full flex-col gap-1">
                <span className={FLD}>{t('features.donations.monetary')}</span>
                <input
                  aria-label={t('features.donations.monetary')}
                  type="number"
                  min={1}
                  step={1000}
                  className={cn(FIELD, 'font-mono')}
                  {...register('amount')}
                />
                {err(errors.amount?.message)}
              </label>
            </>
          )}

          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.note')}</span>
            <input
              aria-label={t('features.donations.note')}
              placeholder={t('features.donations.notePlaceholderCommit', { defaultValue: 'Ghi chú cho cam kết…' })}
              className={FIELD}
              {...register('note')}
            />
          </label>
        </form>

        <footer className="flex w-full items-center justify-end gap-2 border-t border-[#ECF1E9] px-[18px] py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center rounded-[9px] border border-[#E1E9DC] bg-white px-[15px] text-[11.5px] font-semibold text-[#5C7468] transition-colors hover:bg-[#F4F8F1]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="donation-create-form"
            disabled={isSubmitting}
            className="flex h-8 items-center rounded-[9px] bg-[#0A5C36] px-[15px] text-[11.5px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
          >
            {t('common.save')}
          </button>
        </footer>
      </section>
    </div>
  )
}
