// Phân bổ vật tư (route /material-officer/allocations): tạo phiếu cấp phát từ kho
// của một khu vực (`MaterialAllocation`). Số khả dụng = `unallocated` lấy từ
// GET /api/v1/inventory; BE kiểm tra lại trong transaction và trả 409 nếu vượt.
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
import { useScopedAreas } from '@/features/areas/api'
import { useInventory } from '@/features/materials/api'
import { useTasks } from '@/features/tasks/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useAllocations, useCreateAllocation } from '../api'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const qtyField = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number({ invalid_type_error: 'features.allocations.qtyInvalid' }).min(1, 'features.allocations.qtyInvalid'),
)

type FormData = {
  workAreaId: string
  materialId: string
  qty: number
  targetType: 'AREA' | 'TASK'
  taskId: string
}

interface AllocationRow {
  key: string
  materialName: string
  unit: string
  qty: number
  areaName: string
  taskName?: string
  date: string
  allocatedBy: string
}

export default function AllocationPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useScopedAreas()
  const { data: inventoryPage } = useInventory({ size: 200 })
  const { data: users = [] } = useUsers()
  const { data: allocations = [], isPending } = useAllocations()
  const create = useCreateAllocation()

  // Officer: chỉ khu mình phụ trách vật tư; role khác thấy mọi khu trong scope.
  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreas = useMemo(
    () => (isOfficer ? areas.filter((a) => a.officerId === user.id) : areas),
    [areas, isOfficer, user],
  )
  const myAreaIds = useMemo(() => new Set(myAreas.map((a) => a.id)), [myAreas])
  const stock = useMemo(
    () => (inventoryPage?.data ?? []).filter((row) => myAreaIds.has(row.workAreaId)),
    [inventoryPage, myAreaIds],
  )

  // available đổi theo query data → validate lúc submit đọc ref (schema tạo 1 lần).
  const availRef = useRef(0)

  const schema = useMemo(
    () =>
      z
        .object({
          workAreaId: z.string().min(1, 'features.allocations.areaRequired'),
          materialId: z.string().min(1, 'features.allocations.materialRequired'),
          qty: qtyField,
          targetType: z.enum(['AREA', 'TASK']),
          taskId: z.string(),
        })
        .superRefine((data, ctx) => {
          const max = availRef.current
          if ((data.qty ?? 0) > max)
            ctx.addIssue({ code: 'custom', path: ['qty'], message: 'features.allocations.qtyExceeds' })
          if (data.targetType === 'TASK' && !data.taskId)
            ctx.addIssue({ code: 'custom', path: ['taskId'], message: 'features.allocations.targetRequired' })
        }),
    [],
  )

  const {
    register,
    handleSubmit,
    watch,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { workAreaId: '', materialId: '', targetType: 'AREA', taskId: '' },
  })

  const workAreaId = watch('workAreaId')
  const materialId = watch('materialId')
  const targetType = watch('targetType')

  const { data: tasks = [] } = useTasks(workAreaId || undefined)
  const areaStock = useMemo(
    () => stock.filter((row) => row.workAreaId === workAreaId && row.unallocated > 0),
    [stock, workAreaId],
  )
  const selected = areaStock.find((row) => row.materialId === materialId)

  // available đổi theo query data → validate lúc submit đọc ref (schema tạo 1 lần).
  availRef.current = selected?.unallocated ?? 0

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        workAreaId: data.workAreaId,
        ...(data.targetType === 'TASK' && data.taskId ? { taskId: data.taskId } : {}),
        items: [{ materialId: data.materialId, quantity: data.qty }],
      })
      toast(
        t('features.allocations.created', { n: data.qty, unit: selected?.unit ?? '' }),
      )
      resetField('materialId')
      resetField('qty')
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  const rows = useMemo<AllocationRow[]>(
    () =>
      allocations.flatMap((allocation) =>
        allocation.items.map((item) => ({
          key: `${allocation.id}:${item.materialId}`,
          materialName: item.materialName,
          unit: item.unit,
          qty: item.allocatedQuantity,
          areaName: allocation.workAreaName,
          taskName: allocation.taskName,
          date: allocation.allocationDate,
          allocatedBy: allocation.allocatedBy,
        })),
      ),
    [allocations],
  )

  const columns = useMemo(
    () => [
      {
        key: 'material',
        header: t('features.allocations.material'),
        render: (r: AllocationRow) => (
          <span className="font-semibold text-foreground">
            {r.materialName}
            <span className="text-xs font-normal text-muted-foreground"> ({r.unit})</span>
          </span>
        ),
      },
      {
        key: 'qty',
        header: t('features.allocations.qty'),
        align: 'right' as const,
        render: (r: AllocationRow) => <span className="tabular">{r.qty}</span>,
      },
      {
        key: 'target',
        header: t('features.allocations.target'),
        render: (r: AllocationRow) => (
          <span className="flex items-center gap-1.5">
            {r.taskName ?? r.areaName}
            {r.taskName && <span className="text-xs text-muted-foreground">({r.areaName})</span>}
          </span>
        ),
      },
      {
        key: 'date',
        header: t('features.allocations.date'),
        render: (r: AllocationRow) => <span className="tabular">{viDate(r.date.slice(0, 10))}</span>,
      },
      {
        key: 'by',
        header: t('features.allocations.by'),
        render: (r: AllocationRow) => users.find((u) => u.id === r.allocatedBy)?.name ?? '—',
      },
    ],
    [t, users],
  )

  const totalAllocatedQty = useMemo(() => rows.reduce((s, r) => s + r.qty, 0), [rows])
  const activeStockCount = useMemo(
    () => stock.filter((row) => row.unallocated > 0).length,
    [stock],
  )

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreas.length) return <EmptyState text={t('features.allocations.noArea')} />

  return (
    <div>
      <PageHeader title={t('features.allocations.title')} sub={t('features.allocations.sub')} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('features.allocations.statCount')} value={rows.length} unit={t('features.allocations.statCountUnit')} />
        <StatCard label={t('features.allocations.statQty')} value={totalAllocatedQty} unit={t('features.allocations.statQtyUnit')} tone="ok" />
        <StatCard label={t('features.allocations.statStock')} value={activeStockCount} unit={t('features.allocations.statStockUnit')} tone="ok" />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="lbl-mono mb-3 text-foreground">{t('features.allocations.formTitle')}</h2>
        <form
          id="allocation-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          noValidate
        >
          <div>
            <Label htmlFor="allocation-area">{t('features.allocations.area')}</Label>
            <select
              id="allocation-area"
              className={SELECT_CLS}
              {...register('workAreaId', { onChange: () => { resetField('materialId'); resetField('taskId') } })}
            >
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {myAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {err(errors.workAreaId?.message)}
          </div>
          <div>
            <Label htmlFor="allocation-material">{t('features.allocations.material')}</Label>
            <select id="allocation-material" className={SELECT_CLS} {...register('materialId')} disabled={!workAreaId}>
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {areaStock.map((row) => (
                <option key={row.materialId} value={row.materialId}>
                  {row.materialName} ({row.unit})
                </option>
              ))}
            </select>
            {workAreaId && areaStock.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {t('features.allocations.materialEmpty')}
              </p>
            )}
            {selected && (
              <p className="mt-1 text-xs font-semibold text-brand-pine">
                {t('features.allocations.available', { n: selected.unallocated })}
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
              <option value="AREA">{t('features.allocations.target.AREA')}</option>
              <option value="TASK">{t('features.allocations.target.TASK')}</option>
            </select>
          </div>
          {targetType === 'TASK' ? (
            <div>
              <Label htmlFor="allocation-task">{t('features.allocations.task')}</Label>
              <select id="allocation-task" className={SELECT_CLS} {...register('taskId')} disabled={!workAreaId}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {tasks.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
              {err(errors.taskId?.message)}
            </div>
          ) : (
            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting || !workAreaId}>
                <ArrowRight className="size-4" />
                {t('features.allocations.create')}
              </Button>
            </div>
          )}
          {targetType === 'TASK' && (
            <div className="flex items-end">
              <Button type="submit" disabled={isSubmitting || !workAreaId}>
                <ArrowRight className="size-4" />
                {t('features.allocations.create')}
              </Button>
            </div>
          )}
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