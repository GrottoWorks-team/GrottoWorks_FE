// Dialog tạo yêu cầu hỗ trợ: khu đang thiếu + loại (STAFFING/MATERIAL/MIXED),
// danh sách vị trí (headcount) và/hoặc dòng vật tư. BE chưa có publish nên
// yêu cầu được tạo ở PLANNING.
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useWorkAreaRequirements } from '@/features/materials/api'
import { useAuth } from '@/lib/auth'
import { useTasks } from '@/features/tasks/api'
import { useCreateSupportRequest } from '../api'
import type { SupportType } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const schema = z.object({
  areaId: z.string().min(1, 'features.support.areaRequired'),
  supportType: z.enum(['STAFFING', 'MATERIAL', 'MIXED']),
  description: z.string(),
  deadline: z.string(),
  positions: z.array(
    z.object({
      name: z.string().trim().min(1, 'features.support.positionRequired'),
      requiredVolunteerCount: z.coerce.number().min(1, 'features.support.headcountInvalid'),
      note: z.string(),
      taskId: z.string(),
    }),
  ),
  materials: z.array(
    z.object({
      materialId: z.string().min(1, 'features.support.materialRequired'),
      requiredQuantity: z.coerce.number().min(1, 'features.support.qtyInvalid'),
      note: z.string(),
    }),
  ),
})

type FormData = z.infer<typeof schema>

export function SupportFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: scopedAreas = [] } = useScopedAreas()
  // LEADER chỉ tạo được yêu cầu cho khu mình phụ trách (BE: WORK_AREA_ACCESS_DENIED).
  const areas = useMemo(
    () => (user?.role === 'LEADER' ? scopedAreas.filter((a) => a.leaderId === user.id) : scopedAreas),
    [scopedAreas, user],
  )
  const create = useCreateSupportRequest()
  // Lỗi hiển thị ngay trong dialog (toast có thể bị lớp modal che).
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      areaId: '',
      supportType: 'STAFFING',
      description: '',
      deadline: '',
      // 13/11/2026: KHÔNG tạo sẵn dòng vị trí. Trước đây dòng mặc định `name: ''` vẫn bị zod
      // validate kể cả khi loại hỗ trợ = Vật tư (khối Vị trí bị ẩn) → bấm Lưu không gửi gì
      // mà cũng không hiện lỗi. Dòng chỉ được thêm khi loại hỗ trợ cần vị trí.
      positions: [],
      materials: [],
    },
  })

  const positions = useFieldArray({ control, name: 'positions' })
  const materials = useFieldArray({ control, name: 'materials' })
  const areaId = watch('areaId')
  const supportType = watch('supportType') as SupportType
  const needsPositions = supportType === 'STAFFING' || supportType === 'MIXED'
  const needsMaterials = supportType === 'MATERIAL' || supportType === 'MIXED'
  const area = areas.find((a) => a.id === areaId)
  const { data: requirements = [] } = useWorkAreaRequirements(areaId || undefined, 'ACTIVE')
  // BE bắt buộc mỗi vị trí phải gắn task trước khi công bố (SUPPORT_POSITION_TASK_REQUIRED).
  const { data: tasks = [] } = useTasks(areaId || undefined)
  // Giữ danh sách vị trí khớp với loại hỗ trợ đang chọn: cần vị trí → luôn có sẵn 1 dòng để nhập,
  // không cần → xoá hết (nếu để lại dòng rỗng thì zod chặn submit mà không hiển thị lỗi).
  useEffect(() => {
    if (needsPositions && positions.fields.length === 0) {
      positions.replace([{ name: '', requiredVolunteerCount: 1, note: '', taskId: '' }])
    } else if (!needsPositions && positions.fields.length > 0) {
      positions.replace([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ đồng bộ khi loại hỗ trợ đổi
  }, [needsPositions])

  const onSubmit = async (data: FormData) => {
    setFormError(null)
    if (!area || !area.seasonId) {
      setFormError(t('features.support.areaRequired'))
      toast(t('features.support.areaRequired'), 'alert')
      return
    }
    if (needsPositions && data.positions.length === 0) {
      setFormError(t('features.support.positionRequired'))
      toast(t('features.support.positionRequired'), 'alert')
      return
    }
    if (needsMaterials && data.materials.length === 0) {
      setFormError(t('features.support.materialRequired'))
      toast(t('features.support.materialRequired'), 'alert')
      return
    }
    try {
      await create.mutateAsync({
        seasonId: area.seasonId,
        workAreaId: data.areaId,
        supportType: data.supportType,
        description: data.description || undefined,
        deadline: data.deadline || undefined,
        positions: needsPositions
          ? data.positions.map((p) => ({
              name: p.name,
              requiredVolunteerCount: p.requiredVolunteerCount,
              note: p.note || undefined,
              taskId: p.taskId || undefined,
            }))
          : [],
        materials: needsMaterials
          ? data.materials.map((m) => ({
              materialId: m.materialId,
              requiredQuantity: m.requiredQuantity,
              note: m.note || undefined,
            }))
          : [],
      })
      toast(t('features.support.created'))
      onClose()
    } catch {
      // Hiện lỗi ngay trong dialog: toast có thể bị lớp modal che.
      setFormError(t('common.error'))
      toast(t('common.error'), 'alert')
    }
  }

  /**
   * Zod chặn submit mà không gọi `onSubmit` → phải báo cho người dùng biết thay vì im lặng
   * (lỗi của field nằm trong khối đã ẩn sẽ không render được).
   */
  const onInvalid = (formErrors: FieldErrors<FormData>) => {
    setFormError(t('features.support.invalidForm'))
    toast(t('features.support.invalidForm'), 'alert')
    const first = Object.keys(formErrors)[0]
    if (first) {
      const element = document.querySelector<HTMLElement>(`[name^="${first}"]`)
      element?.focus()
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t('features.support.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="support-create-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="support-create-form" onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
        <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
          {t('features.support.planningHint')}
        </p>
        {formError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
            {formError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="support-area">{t('features.support.area')}</Label>
            <select id="support-area" className={SELECT_CLS} {...register('areaId')}>
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
            <Label htmlFor="support-type">{t('features.support.kind')}</Label>
            <select id="support-type" className={SELECT_CLS} {...register('supportType')}>
              <option value="STAFFING">{t('features.support.type.STAFFING')}</option>
              <option value="MATERIAL">{t('features.support.type.MATERIAL')}</option>
              <option value="MIXED">{t('features.support.type.MIXED')}</option>
            </select>
          </div>
          <div>
            <Label htmlFor="support-deadline">{t('features.support.deadline')}</Label>
            <Input id="support-deadline" type="date" {...register('deadline')} />
          </div>
          <div>
            <Label htmlFor="support-desc">{t('features.support.detail')}</Label>
            <Input id="support-desc" {...register('description')} />
          </div>
        </div>

        {needsPositions && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>{t('features.support.positions')}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => positions.append({ name: '', requiredVolunteerCount: 1, note: '', taskId: '' })}
              >
                <Plus className="size-4" />
                {t('features.support.addPosition')}
              </Button>
            </div>
            <div className="space-y-2">
              {positions.fields.map((field, index) => (
                <div key={field.id} className="rounded-md border border-border/60 p-3">
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor={`pos-name-${index}`}>{t('features.support.positionName')}</Label>
                      <Input id={`pos-name-${index}`} {...register(`positions.${index}.name`)} />
                      {err(errors.positions?.[index]?.name?.message)}
                    </div>
                    <div>
                      <Label htmlFor={`pos-count-${index}`}>{t('features.support.headcount')}</Label>
                      <Input
                        id={`pos-count-${index}`}
                        type="number"
                        min={1}
                        {...register(`positions.${index}.requiredVolunteerCount`)}
                      />
                      {err(errors.positions?.[index]?.requiredVolunteerCount?.message)}
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => positions.remove(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label htmlFor={`pos-task-${index}`}>{t('features.support.positionTask')}</Label>
                    <select
                      id={`pos-task-${index}`}
                      className={SELECT_CLS}
                      {...register(`positions.${index}.taskId`)}
                    >
                      <option value="">{t('features.support.positionTaskNone')}</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {needsMaterials && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>{t('features.support.materials')}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => materials.append({ materialId: '', requiredQuantity: 1, note: '' })}
              >
                <Plus className="size-4" />
                {t('features.support.addMaterial')}
              </Button>
            </div>
            {areaId && requirements.length === 0 && (
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                {t('features.support.noRequirement')}
              </p>
            )}
            <div className="space-y-2">
              {materials.fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-md border border-border/60 p-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor={`mat-id-${index}`}>{t('features.support.material')}</Label>
                    <select id={`mat-id-${index}`} className={SELECT_CLS} {...register(`materials.${index}.materialId`)}>
                      <option value="">{t('features.tasks.selectPlaceholder')}</option>
                      {requirements.map((r) => (
                        <option key={r.materialId} value={r.materialId}>
                          {r.materialName} ({r.unit})
                        </option>
                      ))}
                    </select>
                    {err(errors.materials?.[index]?.materialId?.message)}
                  </div>
                  <div>
                    <Label htmlFor={`mat-qty-${index}`}>{t('features.support.qty')}</Label>
                    <Input
                      id={`mat-qty-${index}`}
                      type="number"
                      min={1}
                      {...register(`materials.${index}.requiredQuantity`)}
                    />
                    {err(errors.materials?.[index]?.requiredQuantity?.message)}
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => materials.remove(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Dialog>
  )
}