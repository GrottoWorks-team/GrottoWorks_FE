// Dialog tạo/sửa mùa — RHF + zod: year 2026–2035, start < end, budget ≥ 0,
// description tối đa 500 ký tự, chọn ít nhất 1 cộng đoàn tham gia.
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
import { useCommunities } from '@/features/communities/api'
import { useCurrentParishId } from '@/features/parish/hooks'
import { useCreateSeason, useUpdateSeason } from '../api'
import type { Season } from '@/types'

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
    communityIds: z.preprocess(
      (v) => (Array.isArray(v) ? v : v ? [v] : []),
      z.array(z.string()).min(1, 'features.season.communityRequired'),
    ),
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
  const { data: communities = [] } = useCommunities()
  const editing = Boolean(season)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount dialog có điều kiện (formOpen && …) → mỗi lần mở là một
    // form mới với giá trị đúng create/edit — không cần reset thủ công.
    defaultValues: season
      ? {
          name: season.name,
          year: season.year,
          startDate: season.startDate,
          endDate: season.endDate,
          budget: season.budget,
          description: season.description ?? '',
          communityIds: season.communityIds ?? [],
        }
      : {
          name: '',
          year: 2026,
          startDate: '',
          endDate: '',
          budget: 0,
          description: '',
          communityIds: [],
        },
  })

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
            : t('common.error'),
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

        <div>
          {/* ponytail: BE không lưu cộng đoàn trên mùa (SeasonDto không có field
              communityIds) — liên kết nằm ở WorkArea.CommunityId. Trường này chỉ
              còn tác dụng với mock; gắn khi BE bổ sung. */}
          <Label>{t('features.season.communityIds')}</Label>
          <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {communities.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-primary"
              >
                <input
                  type="checkbox"
                  value={c.id}
                  className="size-4 rounded border-border text-primary accent-primary focus:ring-primary"
                  {...register('communityIds')}
                />
                <span className="font-medium">{c.name}</span>
              </label>
            ))}
          </div>
          {err(errors.communityIds?.message)}
        </div>
      </form>
    </Dialog>
  )
}
