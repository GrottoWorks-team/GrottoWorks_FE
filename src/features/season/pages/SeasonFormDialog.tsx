import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useCurrentParishId } from '@/features/parish/hooks'
import { useCreateSeason, useSeason, useUpdateSeason } from '../api'
import type { Season } from '@/types'
import { errorMessage } from '@/lib/errorMessage'

const schema = z
  .object({
    name: z.string().trim().min(1, 'common.required').max(150, 'common.required'),
    year: z.coerce
      .number({ invalid_type_error: 'features.season.yearRange' })
      .int()
      .min(2026, 'features.season.yearRange')
      .max(2035, 'features.season.yearRange'),
    startDate: z.string().min(1, 'common.required'),
    endDate: z.string().min(1, 'common.required'),
    // Budget bắt buộc: trống → NaN → lỗi, KHÔNG âm thầm ép thành 0.
    budget: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.coerce
        .number({ invalid_type_error: 'features.season.budgetInvalid' })
        .min(0, 'features.season.budgetInvalid'),
    ),
    description: z.string().max(500, 'common.required').optional(),
  })
  .refine((d) => !d.startDate || !d.endDate || d.startDate < d.endDate, {
    path: ['endDate'],
    message: 'features.season.endAfterStart',
  })

type FormData = z.infer<typeof schema>

export function SeasonFormDialog({
  onClose,
  season,
}: {
  onClose: () => void
  season?: Season | null // null/undefined = create
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { parishId } = useCurrentParishId()
  const create = useCreateSeason()
  const update = useUpdateSeason()
  // GET /api/v1/seasons/{id} — gọi endpoint chi tiết mùa từ backend khi mở modal
  const { data: detailSeason } = useSeason(season?.id)
  const activeSeason = detailSeason ?? season
  const editing = Boolean(season)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: activeSeason
      ? {
          name: activeSeason.name,
          year: activeSeason.year,
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
          budget: activeSeason.budget,
          description: activeSeason.description ?? '',
        }
      : {
          name: '',
          year: 2026,
          startDate: '',
          endDate: '',
          budget: 0,
          description: '',
        },
  })

  useEffect(() => {
    if (activeSeason) {
      reset({
        name: activeSeason.name,
        year: activeSeason.year,
        startDate: activeSeason.startDate,
        endDate: activeSeason.endDate,
        budget: activeSeason.budget,
        description: activeSeason.description ?? '',
      })
    }
  }, [activeSeason, reset])

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  const onSubmit = async (data: FormData) => {
    try {
      if (editing && season) {
        await update.mutateAsync({
          id: season.id,
          version: season.version,
          name: data.name,
          year: data.year,
          startDate: data.startDate,
          endDate: data.endDate,
          budget: data.budget,
          description: data.description || undefined,
        })
        toast(t('features.season.updated', { year: data.year }))
      } else {
        await create.mutateAsync({
          parishId: parishId!,
          name: data.name,
          seasonYear: data.year,
          startDate: data.startDate,
          endDate: data.endDate,
          description: data.description || null,
          estimatedBudget: data.budget,
        })
        toast(t('features.season.created', { year: data.year }))
      }
      onClose()
    } catch (e) {
      toast(
        e instanceof ApiError && e.code === 'SEASON_YEAR_CONFLICT'
          ? t('features.season.yearConflict')
          : e instanceof ApiError && e.code === 'SEASON_NAME_CONFLICT'
            ? t('features.season.nameConflict')
            : errorMessage(e),
        'alert',
      )
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={editing ? t('features.season.edit') : t('features.season.create')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="season-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="season-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="season-name">{t('features.season.name')}</Label>
          <Input id="season-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>

        <div>
          <Label htmlFor="season-year">{t('features.season.year')}</Label>
          <Input id="season-year" type="number" inputMode="numeric" {...register('year')} />
          {err(errors.year?.message)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="season-start">{t('features.season.startDate')}</Label>
            <Input id="season-start" type="date" {...register('startDate')} />
            {err(errors.startDate?.message)}
          </div>
          <div>
            <Label htmlFor="season-end">{t('features.season.endDate')}</Label>
            <Input id="season-end" type="date" {...register('endDate')} />
            {err(errors.endDate?.message)}
          </div>
        </div>

        <div>
          <Label htmlFor="season-budget">{t('features.season.budget')}</Label>
          <Input id="season-budget" type="number" inputMode="numeric" min={0} {...register('budget')} />
          {err(errors.budget?.message)}
        </div>

        <div>
          <Label htmlFor="season-description">{t('features.season.description')}</Label>
          <textarea
            id="season-description"
            rows={3}
            placeholder={t('features.season.descriptionPlaceholder')}
            className="mt-1 flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            {...register('description')}
          />
          {err(errors.description?.message)}
        </div>
      </form>
    </Dialog>
  )
}
