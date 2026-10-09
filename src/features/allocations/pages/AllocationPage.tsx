// Phân bổ vật tư (route /material-officer/allocations): form tạo phân bổ vật tư đã
// nhận của khu officer cho nhiệm vụ (theo khu) hoặc khu khác. Validate
// qty ≤ available (received − đã phân bổ) — hiện available cạnh vật tư khi
// chọn. Bảng phân bổ đã tạo: vật tư, số lượng, đích, ngày, người phân bổ.
import { useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useTasks } from '@/features/tasks/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { availableMap, useAllocations, useCreateAllocation } from '../api'
import type { Allocation } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const qtyField = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number({ invalid_type_error: 'features.allocations.qtyInvalid' }).min(1, 'features.allocations.qtyInvalid'),
)

type FormData = {
  materialId: string
  qty: number
  targetType: string
  targetTaskId: string
  targetAreaId: string
}

export default function AllocationPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: users = [] } = useUsers()
  const { data: allTasks = [] } = useTasks()
  const { data: allMaterials = [] } = useMaterials()
  const { data: allocations = [], isPending } = useAllocations()
  const create = useCreateAllocation()

  // Officer: vật tư + nhiệm vụ khu mình phụ trách (pattern Task 7 RecordDialog);
  // khác: mọi khu.
  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreas = isOfficer ? areas.filter((a) => a.officerId === user.id) : areas
  const myAreaIds = new Set(myAreas.map((a) => a.id))
  const materials = isOfficer ? allMaterials.filter((m) => myAreaIds.has(m.areaId)) : allMaterials
  const tasks = isOfficer ? allTasks.filter((x) => myAreaIds.has(x.areaId)) : allTasks

  const available = availableMap(materials, allocations)
  // available đổi theo query data → validate lúc submit đọc ref (schema tạo
  // 1 lần, không cần RHF nhận resolver mới).
  const availRef = useRef(available)
  availRef.current = available

  const schema = useMemo(
    () =>
      z
        .object({
          materialId: z.string().min(1, 'features.allocations.materialRequired'),
          qty: qtyField,
          targetType: z.string().min(1, 'features.allocations.targetRequired'),
          targetTaskId: z.string(),
          targetAreaId: z.string(),
        })
        .superRefine((data, ctx) => {
          const max = availRef.current[data.materialId] ?? 0
          if ((data.qty ?? 0) > max)
            ctx.addIssue({ code: 'custom', path: ['qty'], message: 'features.allocations.qtyExceeds' })
          if (data.targetType === 'TASK' && !data.targetTaskId)
            ctx.addIssue({ code: 'custom', path: ['targetTaskId'], message: 'features.allocations.targetRequired' })
          if (data.targetType === 'AREA' && !data.targetAreaId)
            ctx.addIssue({ code: 'custom', path: ['targetAreaId'], message: 'features.allocations.targetRequired' })
        }),
    [],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      materialId: '',
      targetType: 'TASK',
      targetTaskId: '',
      targetAreaId: '',
    },
  })
  const materialId = watch('materialId')
  const targetType = watch('targetType')

  const onSubmit = async (data: FormData) => {
    try {
      const material = materials.find((m) => m.id === data.materialId)
      await create.mutateAsync({
        materialId: data.materialId,
        ...(data.targetType === 'TASK'
          ? { targetTaskId: data.targetTaskId }
          : { targetAreaId: data.targetAreaId }),
        qty: data.qty,
        date: new Date().toISOString().slice(0, 10),
        // byUserId chỉ gửi khi có user — mock POST persist nguyên body.
        ...(user ? { byUserId: user.id } : {}),
      })
      toast(t('features.allocations.created', { n: data.qty, unit: material?.unit ?? '' }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  // Bảng: phân bổ của vật tư khu officer phụ trách.
  const rows = isOfficer
    ? allocations.filter((a) => materials.some((m) => m.id === a.materialId))
    : allocations
  const taskById = useMemo(() => new Map(allTasks.map((x) => [x.id, x])), [allTasks])
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas])
  const targetLabel = (a: Allocation) =>
    a.targetTaskId
      ? (taskById.get(a.targetTaskId)?.title ?? '—')
      : (areaById.get(a.targetAreaId ?? '')?.name ?? '—')

  const columns = useMemo(
    () => [
      {
        key: 'material',
        header: t('features.allocations.material'),
        render: (a: Allocation) => {
          const m = allMaterials.find((x) => x.id === a.materialId)
          return (
            <span className="font-semibold text-foreground">
              {m?.name ?? a.materialId}
              {m && <span className="text-xs font-normal text-muted-foreground"> ({m.unit})</span>}
            </span>
          )
        },
      },
      {
        key: 'qty',
        header: t('features.allocations.qty'),
        align: 'right' as const,
        render: (a: Allocation) => <span className="tabular">{a.qty}</span>,
      },
      {
        key: 'target',
        header: t('features.allocations.target'),
        render: (a: Allocation) => (
          <span className="flex items-center gap-1.5">
            {targetLabel(a)}
            {a.targetTaskId && (
              <span className="text-xs text-muted-foreground">
                ({areaById.get(taskById.get(a.targetTaskId)?.areaId ?? '')?.name ?? ''})
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'date',
        header: t('features.allocations.date'),
        render: (a: Allocation) => <span className="tabular">{viDate(a.date)}</span>,
      },
      {
        key: 'by',
        header: t('features.allocations.by'),
        render: (a: Allocation) => users.find((u) => u.id === a.byUserId)?.name ?? '—',
      },
    ],
    [t, allMaterials, allTasks, areas, users],
  )

  const totalAllocatedQty = useMemo(() => rows.reduce((s, a) => s + a.qty, 0), [rows])
  const activeStockCount = useMemo(
    () => materials.filter((m) => (available[m.id] ?? 0) > 0).length,
    [materials, available],
  )

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreas.length) return <EmptyState text={t('features.allocations.noArea')} />

  return (
    <div>
      <PageHeader title={t('features.allocations.title')} sub={t('features.allocations.sub')} />

      {/* 3 StatCards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng lượt cấp phát"
          value={rows.length}
          unit="lượt"
        />
        <StatCard
          label="Tổng số lượng đã cấp"
          value={totalAllocatedQty}
          unit="đơn vị"
          tone="ok"
        />
        <StatCard
          label="Mặt hàng khả dụng trong kho"
          value={activeStockCount}
          unit="mặt hàng"
          tone="ok"
        />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="lbl-mono mb-3 text-foreground">Tạo phiếu phân bổ vật tư</h2>
        <form
          id="allocation-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          noValidate
        >
          <div>
            <Label htmlFor="allocation-material">{t('features.allocations.material')}</Label>
            <select id="allocation-material" className={SELECT_CLS} {...register('materialId')}>
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
            {materialId && (
              <p className="mt-1 text-xs font-semibold text-brand-pine">
                {t('features.allocations.available', { n: available[materialId] ?? 0 })}
              </p>
            )}
            {err(errors.materialId?.message)}
          </div>
          <div>
            <Label htmlFor="allocation-qty">{t('features.allocations.qty')}</Label>
            <Input id="allocation-qty" type="number" min={1} step={1} {...register('qty')} />
            {err(errors.qty?.message)}
          </div>
          <div>
            <Label htmlFor="allocation-target-type">{t('features.allocations.target')}</Label>
            <select id="allocation-target-type" className={SELECT_CLS} {...register('targetType')}>
              <option value="TASK">{t('features.allocations.target.TASK')}</option>
              <option value="AREA">{t('features.allocations.target.AREA')}</option>
            </select>
          </div>
          {targetType === 'AREA' ? (
            <div>
              <Label htmlFor="allocation-area">{t('features.allocations.area')}</Label>
              <select id="allocation-area" className={SELECT_CLS} {...register('targetAreaId')}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {err(errors.targetAreaId?.message)}
            </div>
          ) : (
            <div>
              <Label htmlFor="allocation-task">{t('features.allocations.task')}</Label>
              <select id="allocation-task" className={SELECT_CLS} {...register('targetTaskId')}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {tasks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              {err(errors.targetTaskId?.message)}
            </div>
          )}
          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting}>
              <ArrowRight className="size-4" />
              {t('features.allocations.create')}
            </Button>
          </div>
        </form>
      </Card>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={rows} columns={columns} emptyText={t('features.allocations.empty')} />
      )}
    </div>
  )
}
