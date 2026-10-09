// Dialog tạo/sửa việc — RHF + zod: title, area (leader khóa về khu của mình
// qua fixedAreaId; committee/parish tự chọn), skills (checkbox group
// /api/skills), estimateHours, volunteersNeeded, materialIds (checkbox group
// vật tư của khu đang chọn), dueDate. Select native + style trùng Input.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useCreateTask, useSkills, useUpdateTask } from '../api'
import type { Task } from '@/types'

export const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Trống → undefined để báo lỗi thay vì coerce 0 (pattern SeasonFormDialog);
// ràng buộc min/int nằm trong schema con vì preprocess trả ZodEffects.
const num = (inner: z.ZodNumber) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), inner)

const schema = z.object({
  title: z.string().trim().min(1, 'features.tasks.nameRequired'),
  description: z.string(),
  areaId: z.string().min(1, 'features.tasks.areaRequired'),
  skills: z.array(z.string()),
  estimateHours: num(
    z.coerce
      .number({ invalid_type_error: 'features.tasks.hoursInvalid' })
      .min(0, 'features.tasks.hoursInvalid'),
  ),
  volunteersNeeded: num(
    z.coerce
      .number({ invalid_type_error: 'features.tasks.neededInvalid' })
      .min(1, 'features.tasks.neededInvalid')
      .int('features.tasks.neededInvalid'),
  ),
  materialIds: z.array(z.string()),
  dueDate: z.string().min(1, 'features.tasks.dueDateRequired'),
})

type FormData = z.infer<typeof schema>

export function TaskFormDialog({
  onClose,
  task,
  fixedAreaId,
}: {
  onClose: () => void
  task?: Task | null // null/undefined = create
  fixedAreaId?: string // leader: khóa khu (không hiện select khu)
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: areas = [] } = useAreas()
  const { data: skills = [] } = useSkills()
  const create = useCreateTask()
  const update = useUpdateTask()
  const editing = Boolean(task)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount dialog có điều kiện → mỗi lần mở là form mới create/edit.
    defaultValues: task
      ? {
          title: task.title,
          description: task.description,
          areaId: task.areaId,
          skills: task.skills,
          estimateHours: task.estimateHours,
          volunteersNeeded: task.volunteersNeeded,
          materialIds: task.materialIds,
          dueDate: task.dueDate,
        }
      : {
          title: '',
          description: '',
          areaId: fixedAreaId ?? '',
          skills: [],
          estimateHours: 0,
          volunteersNeeded: 1,
          materialIds: [],
          dueDate: '',
        },
  })

  const areaId = watch('areaId')
  const { data: materials = [] } = useMaterials(areaId || undefined)

  const onSubmit = async (data: FormData) => {
    try {
      if (editing && task) {
        await update.mutateAsync({ id: task.id, ...data })
        toast(t('features.tasks.updated', { name: data.title }))
      } else {
        await create.mutateAsync({
          ...data,
          assignees: [],
          status: 'TODO',
          submittedPhotos: 0,
        })
        toast(t('features.tasks.created', { name: data.title }))
      }
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
      title={editing ? t('features.tasks.edit') : t('features.tasks.create')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="task-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="task-title">{t('features.tasks.name')}</Label>
          <Input id="task-title" {...register('title')} />
          {err(errors.title?.message)}
        </div>
        <div>
          <Label htmlFor="task-description">{t('features.tasks.description')}</Label>
          <Input id="task-description" {...register('description')} />
        </div>
        {fixedAreaId ? null : (
          <div>
            <Label htmlFor="task-area">{t('features.tasks.area')}</Label>
            <select id="task-area" className={SELECT_CLS} {...register('areaId')}>
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {err(errors.areaId?.message)}
          </div>
        )}
        <div>
          <Label className="mb-1.5 block">{t('features.tasks.skills')}</Label>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => {
              const checked = (watch('skills') ?? []).includes(s)
              return (
                <label
                  key={s}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    checked
                      ? 'border-brand-pine bg-brand-pine text-white shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-brand-pine/50 hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={s}
                    className="sr-only"
                    {...register('skills')}
                  />
                  <span>{checked ? '✓ ' : '+ '}{s}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-hours">{t('features.tasks.estimateHours')}</Label>
            <Input id="task-hours" type="number" min={0} step="0.5" className="tabular" {...register('estimateHours')} />
            {err(errors.estimateHours?.message)}
          </div>
          <div>
            <Label htmlFor="task-needed">{t('features.tasks.volunteersNeeded')}</Label>
            <Input id="task-needed" type="number" min={1} step="1" className="tabular" {...register('volunteersNeeded')} />
            {err(errors.volunteersNeeded?.message)}
          </div>
        </div>
        <div>
          <Label htmlFor="task-due">{t('features.tasks.dueDate')}</Label>
          <Input id="task-due" type="date" className="tabular" {...register('dueDate')} />
          {err(errors.dueDate?.message)}
        </div>
        <div>
          <Label className="mb-1.5 block">{t('features.tasks.materials')}</Label>
          {materials.length ? (
            <div className="flex flex-wrap gap-2">
              {materials.map((m) => {
                const checked = (watch('materialIds') ?? []).includes(m.id)
                return (
                  <label
                    key={m.id}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                      checked
                        ? 'border-brand-gold bg-brand-gold/15 font-semibold text-amber-900 dark:text-amber-200'
                        : 'border-border bg-card text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={m.id}
                      className="sr-only"
                      {...register('materialIds')}
                    />
                    <span>{checked ? '✓ ' : ''}{m.name} <span className="text-[11px] opacity-75">({m.unit})</span></span>
                  </label>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t('features.tasks.materialNone')}</p>
          )}
        </div>
      </form>
    </Dialog>
  )
}
