// Dialog thêm bản ghi chấm công tay (trường hợp quên bấm giờ ra):
// chọn TNV của khu, ngày, giờ vào/ra, giờ nhập tay (không tự tính diff).
// RHF + zod — zod message là i18n key, render qua t() (pattern Login).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateTimesheet } from '../api'
import type { User } from '@/types'

export const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const num = (inner: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), inner)

const schema = z.object({
  volunteerId: z.string().min(1, 'features.timesheets.volunteerRequired'),
  date: z.string().min(1, 'features.timesheets.dateRequired'),
  checkIn: z.string().min(1, 'features.timesheets.checkInRequired'),
  checkOut: z.string().optional(),
  hours: num(
    z.coerce
      .number({ invalid_type_error: 'features.timesheets.hoursInvalid' })
      .min(0, 'features.timesheets.hoursInvalid'),
  ),
})

type FormData = z.infer<typeof schema>

export function TimesheetFormDialog({
  volunteers,
  onClose,
}: {
  volunteers: User[] // TNV thuộc khu (assignees của tasks khu)
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateTimesheet()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount dialog có điều kiện → mỗi lần mở là form mới.
    defaultValues: { volunteerId: '', date: '', checkIn: '', checkOut: '', hours: 0 },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        volunteerId: data.volunteerId,
        date: data.date,
        checkIn: data.checkIn,
        checkOut: data.checkOut || undefined,
        hours: data.hours,
        status: 'CLOSED',
      })
      toast(
        t('features.timesheets.created', {
          name: volunteers.find((v) => v.id === data.volunteerId)?.name ?? '',
          n: data.hours,
        }),
      )
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
      title={t('features.timesheets.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="timesheet-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="timesheet-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="ts-volunteer">{t('features.timesheets.volunteer')}</Label>
          <select id="ts-volunteer" className={SELECT_CLS} {...register('volunteerId')}>
            <option value="">{t('features.timesheets.selectPlaceholder')}</option>
            {volunteers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          {err(errors.volunteerId?.message)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ts-date">{t('features.timesheets.date')}</Label>
            <Input id="ts-date" type="date" {...register('date')} />
            {err(errors.date?.message)}
          </div>
          <div>
            <Label htmlFor="ts-hours">{t('features.timesheets.hours')}</Label>
            <Input id="ts-hours" type="number" min={0} step="0.5" {...register('hours')} />
            {err(errors.hours?.message)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ts-in">{t('features.timesheets.checkIn')}</Label>
            <Input id="ts-in" type="time" {...register('checkIn')} />
            {err(errors.checkIn?.message)}
          </div>
          <div>
            <Label htmlFor="ts-out">{t('features.timesheets.checkOut')}</Label>
            <Input id="ts-out" type="time" {...register('checkOut')} />
          </div>
        </div>
      </form>
    </Dialog>
  )
}
