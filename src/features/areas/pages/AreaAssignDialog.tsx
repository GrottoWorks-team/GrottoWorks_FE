// Dialog gán nhanh trưởng khu + trưởng nhóm vật tư cho 1 khu (mở từ row
// bảng): hiển thị deadline/thông tin khu, 2 select lọc theo role, PATCH areas/:id, toast.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { viDate } from '@/lib/format'
import { useUpdateArea } from '../api'
import { useUsers } from '@/features/users/api'
import { SELECT_CLS } from './AreaFormDialog'
import type { WorkArea } from '@/types'

const schema = z.object({
  leaderId: z.string().min(1, 'features.areas.leaderRequired'),
  officerId: z.string().min(1, 'features.areas.officerRequired'),
})
type FormData = z.infer<typeof schema>

export function AreaAssignDialog({
  onClose,
  area,
}: {
  onClose: () => void
  area: WorkArea
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [] } = useUsers()
  const update = useUpdateArea()

  const leaders = users.filter((u) => u.role === 'LEADER')
  const officers = users.filter((u) => u.role === 'MATERIAL_OFFICER')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { leaderId: area.leaderId, officerId: area.officerId },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await update.mutateAsync({ id: area.id, ...data })
      toast(t('features.areas.assigned', { name: area.name }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  const select = (
    id: 'leaderId' | 'officerId',
    label: string,
    options: { id: string; name: string }[],
  ) => (
    <div>
      <Label htmlFor={`assign-${id}`}>{label}</Label>
      <select id={`assign-${id}`} className={SELECT_CLS} {...register(id)}>
        <option value="">{t('features.areas.selectPlaceholder')}</option>
        {options.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      {err(errors[id]?.message)}
    </div>
  )

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.areas.assignTitle', { name: area.name })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="assign-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-2 rounded-md border border-border bg-background/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('features.areas.type')}:</span>
          <span className="font-semibold text-foreground">
            {t(`features.areas.areaType.${area.type}`)} · {t(`features.areas.level.${area.level}`)}
          </span>
        </div>
        {area.deadline ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              {t('features.areas.deadline')}:
            </span>
            <span className="tabular font-semibold text-foreground">{viDate(area.deadline)}</span>
          </div>
        ) : null}
        {area.description ? (
          <p className="border-t border-border/60 pt-1.5 text-muted-foreground">
            {area.description}
          </p>
        ) : null}
      </div>

      <form id="assign-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {select('leaderId', t('features.areas.leader'), leaders)}
        {select('officerId', t('features.areas.officer'), officers)}
      </form>
    </Dialog>
  )
}
