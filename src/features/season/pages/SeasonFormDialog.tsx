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
import { useParishes } from '@/features/parish/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useCreateSeason, useSeason, useUpdateSeason } from '../api'
import type { Season } from '@/types'

// BE `CreateSeasonRequest`/`SeasonDto` KHÔNG có cộng đoàn của mùa (quan hệ nằm ở
// WorkArea.CommunityId) → form không hỏi trường này nữa.
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
    // ADMIN không thuộc giáo xứ nào → bắt buộc chọn giáo xứ khi tạo mùa
    // (nếu để trống FE rơi về giáo xứ đầu tiên trong hệ thống).
    parishId: z.string().optional(),
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
  const { user } = useAuth()
  const { parishId } = useCurrentParishId()
  // Chỉ ADMIN cấp hệ thống (không có parishId) mới cần chọn giáo xứ.
  const parishPicker = !user?.parishId
  const { data: parishes = [] } = useParishes({ enabled: parishPicker })
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
    setValue,
    watch,
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
          parishId: activeSeason.parishId ?? '',
        }
      : {
          name: '',
          year: 2026,
          startDate: '',
          endDate: '',
          budget: 0,
          description: '',
          parishId: user?.parishId ?? '',
        },
  })

  const selectedParishId = watch('parishId')

  useEffect(() => {
    if (activeSeason) {
      reset({
        name: activeSeason.name,
        year: activeSeason.year,
        startDate: activeSeason.startDate,
        endDate: activeSeason.endDate,
        budget: activeSeason.budget,
        description: activeSeason.description ?? '',
        parishId: activeSeason.parishId ?? '',
      })
    }
  }, [activeSeason, reset])

  // ADMIN chưa chọn giáo xứ → mặc định giáo xứ đang thao tác (nếu có).
  useEffect(() => {
    if (parishPicker && !selectedParishId && parishId) {
      setValue('parishId', parishId)
    }
  }, [parishPicker, selectedParishId, parishId, setValue])

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
        const targetParishId = user?.parishId ?? data.parishId
        if (!targetParishId) {
          toast(t('features.season.parishRequired'), 'alert')
          return
        }
        await create.mutateAsync({
          parishId: targetParishId,
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
            : t('common.error'),
        'alert',
      )
    }
  }

  // Chỉ mùa PLANNING mới sửa được (BE: 409 SEASON_INVALID_STATE); mùa đã kích hoạt,
  // chờ nghiệm thu, hoàn thành hay lưu trữ → dialog chỉ để xem.
  const status = activeSeason?.status
  const editable = !editing || status === 'PLANNING'

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={
        editing
          ? editable
            ? t('features.season.edit')
            : t('features.season.viewTitle')
          : t('features.season.create')
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t(editable ? 'common.cancel' : 'common.close')}
          </Button>
          {editable && (
            <Button type="submit" form="season-form" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          )}
        </>
      }
    >
      {!editable && activeSeason ? (
        <div className="space-y-4">
          <p className="rounded-card border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
            {t('features.season.editLocked', {
              status: t(`status.${activeSeason.status}`),
            })}
          </p>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('features.season.name')}</dt>
              <dd className="font-semibold text-foreground">{activeSeason.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('features.season.year')}</dt>
              <dd className="tabular text-foreground">{activeSeason.year}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('features.season.startDate')}</dt>
              <dd className="tabular text-foreground">{viDate(activeSeason.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('features.season.endDate')}</dt>
              <dd className="tabular text-foreground">{viDate(activeSeason.endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('features.season.budget')}</dt>
              <dd className="tabular text-foreground">
                {activeSeason.budget.toLocaleString('vi-VN')} ₫
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('common.status')}</dt>
              <dd className="text-foreground">{t(`status.${activeSeason.status}`)}</dd>
            </div>
            {activeSeason.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  {t('features.season.description')}
                </dt>
                <dd className="text-foreground">{activeSeason.description}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <form id="season-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {parishPicker && (
          <div>
            <Label htmlFor="season-parish">{t('features.season.parish')}</Label>
            <select
              id="season-parish"
              className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              {...register('parishId')}
            >
              <option value="">{t('features.season.parishPlaceholder')}</option>
              {parishes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
      )}
    </Dialog>
  )
}
