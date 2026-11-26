// Phân bổ vật tư (route /material-officer/allocations): tạo phiếu cấp phát từ kho
// của một khu vực (`MaterialAllocation`). Số khả dụng = `unallocated` lấy từ
// GET /api/v1/inventory; BE kiểm tra lại trong transaction và trả 409 nếu vượt.
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
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
import { useInventory, useMaterials } from '@/features/materials/api'
import { useTasks } from '@/features/tasks/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useAllocations, useCreateAllocation } from '../api'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

type FormData = {
  workAreaId: string
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
  const { data: users = [] } = useUsers()
  const { data: allocations = [], isPending } = useAllocations()
  const create = useCreateAllocation()

  // Officer: chỉ khu mình phụ trách vật tư; role khác thấy mọi khu trong scope.
  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreas = useMemo(
    () => (isOfficer ? areas.filter((a) => a.officerId === user.id) : areas),
    [areas, isOfficer, user],
  )
  // 26/11/2026: một phiếu cấp NHIỀU dòng vật tư cùng lúc (BE đã nhận `items[]`).
  const [lines, setLines] = useState<Array<{ materialId: string; qty: string }>>([
    { materialId: '', qty: '' },
  ])
  const addLine = () => setLines((prev) => [...prev, { materialId: '', qty: '' }])
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index))
  const updateLine = (index: number, patch: Partial<{ materialId: string; qty: string }>) =>
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  const schema = useMemo(
    () =>
      z.object({
        workAreaId: z.string().min(1, 'features.allocations.areaRequired'),
        // 26/11/2026: MO chỉ cấp phát cho nhiệm vụ (không còn cấp cho khu vực).
        taskId: z.string().min(1, 'features.allocations.taskRequired'),
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
    defaultValues: { workAreaId: '', taskId: '' },
  })

  const workAreaId = watch('workAreaId')

  // BE chỉ nhận `size` ≤ 100 (`INVALID_PAGE_SIZE`) → lọc tồn kho theo khu vực đang chọn.
  const { data: inventoryPage } = useInventory({
    workAreaId: workAreaId || undefined,
    size: 100,
  })
  const stock = useMemo(() => inventoryPage?.data ?? [], [inventoryPage])

  const { data: tasks = [] } = useTasks(workAreaId || undefined)
  // Danh mục vật tư của khu → dịch `task.materialRequirements` sang tên/đơn vị.
  const { data: areaMaterials = [] } = useMaterials(workAreaId || undefined)
  const selectedTaskId = watch('taskId')
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
  // Đã cấp cho việc này (mọi phiếu) → tính phần nhu cầu còn lại.
  const { data: taskAllocations = [] } = useAllocations(
    selectedTaskId ? { taskId: selectedTaskId } : undefined,
    Boolean(selectedTaskId),
  )
  const allocatedByMaterial = useMemo(() => {
    const map = new Map<string, number>()
    for (const allocation of taskAllocations) {
      for (const item of allocation.items) {
        map.set(item.materialId, (map.get(item.materialId) ?? 0) + item.allocatedQuantity)
      }
    }
    return map
  }, [taskAllocations])
  const areaStock = useMemo(
    () => stock.filter((row) => row.workAreaId === workAreaId && row.unallocated > 0),
    [stock, workAreaId],
  )
  const remainingNeedFor = (materialId: string): number | undefined => {
    const requirement = selectedTask?.materialRequirements?.find((row) => row.materialId === materialId)
    if (!requirement) return undefined
    return Math.max(0, requirement.requiredQuantity - (allocatedByMaterial.get(materialId) ?? 0))
  }

  const onSubmit = async (data: FormData) => {
    const filled = lines.filter((line) => line.materialId && Number(line.qty) > 0)
    if (!filled.length) {
      toast(t('features.allocations.lineRequired'), 'alert')
      return
    }
    if (new Set(filled.map((line) => line.materialId)).size !== filled.length) {
      toast(t('features.allocations.duplicateMaterial'), 'alert')
      return
    }
    for (const line of filled) {
      const stockRow = areaStock.find((row) => row.materialId === line.materialId)
      if (!stockRow || Number(line.qty) > stockRow.unallocated) {
        toast(t('features.allocations.qtyExceeds'), 'alert')
        return
      }
      const need = remainingNeedFor(line.materialId)
      if (need !== undefined && Number(line.qty) > need) {
        toast(t('features.allocations.qtyExceedsTaskNeed'), 'alert')
        return
      }
    }
    try {
      await create.mutateAsync({
        workAreaId: data.workAreaId,
        taskId: data.taskId,
        items: filled.map((line) => ({ materialId: line.materialId, quantity: Number(line.qty) })),
      })
      toast(t('features.allocations.createdMulti', { count: filled.length }))
      setLines([{ materialId: '', qty: '' }])
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
              {...register('workAreaId', { onChange: () => { resetField('taskId'); setLines([{ materialId: '', qty: '' }]) } })}
            >
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {myAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {isOfficer && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t('features.allocations.onlyMyAreas')}
              </p>
            )}
            {err(errors.workAreaId?.message)}
          </div>
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
            {workAreaId && tasks.length === 0 && (
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {t('features.allocations.taskEmpty')}
              </p>
            )}
            {err(errors.taskId?.message)}
          </div>
          {/* Nhiều dòng vật tư trong cùng một phiếu cấp phát */}
          <div className="md:col-span-2 xl:col-span-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Label>{t('features.allocations.materials')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!workAreaId}>
                <Plus className="size-3.5" />
                {t('features.allocations.addLine')}
              </Button>
            </div>
            {workAreaId && areaStock.length === 0 && (
              <p className="text-xs font-semibold text-muted-foreground">{t('features.allocations.materialEmpty')}</p>
            )}
            <div className="space-y-2">
              {lines.map((line, index) => {
                const stockRow = areaStock.find((row) => row.materialId === line.materialId)
                const need = line.materialId ? remainingNeedFor(line.materialId) : undefined
                const requirement = line.materialId
                  ? selectedTask?.materialRequirements?.find((row) => row.materialId === line.materialId)
                  : undefined
                return (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                    <div>
                      <select
                        aria-label={t('features.allocations.material')}
                        className="mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                        value={line.materialId}
                        disabled={!workAreaId}
                        onChange={(event) => updateLine(index, { materialId: event.target.value })}
                      >
                        <option value="">{t('features.tasks.selectPlaceholder')}</option>
                        {areaStock.map((row) => (
                          <option key={row.materialId} value={row.materialId} disabled={
                            lines.some((other, i) => i !== index && other.materialId === row.materialId)
                          }>
                            {row.materialName} ({row.unit})
                          </option>
                        ))}
                      </select>
                      {stockRow && (
                        <p className="mt-1 text-xs font-semibold text-brand-pine">
                          {t('features.allocations.available', { n: stockRow.unallocated })}
                        </p>
                      )}
                      {need !== undefined && (
                        <p
                          className={`mt-1 text-xs font-semibold ${need === 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {t('features.allocations.taskNeedRemaining', {
                            n: need,
                            required: requirement?.requiredQuantity ?? 0,
                          })}
                        </p>
                      )}
                    </div>
                    <Input
                      aria-label={t('features.allocations.qty')}
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      max={need === undefined ? stockRow?.unallocated : Math.min(stockRow?.unallocated ?? need, need)}
                      value={line.qty}
                      onChange={(event) => updateLine(index, { qty: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-end md:col-span-2 xl:col-span-5">
            <Button type="submit" disabled={isSubmitting || !workAreaId || !selectedTaskId}>
              <ArrowRight className="size-4" />
              {t('features.allocations.create')}
            </Button>
          </div>
        </form>

        {/* LEADER khai báo vật tư khi tạo/sửa việc → MO xem tại đây để biết cần cấp gì. */}
        {selectedTask && (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
            <p className="lbl-mono mb-1">{t('features.allocations.taskMaterials')}</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              {t('features.allocations.taskMaterialsHint')}
            </p>
            {selectedTask.materialRequirements?.length ? (
              <ul className="space-y-1 text-xs">
                {selectedTask.materialRequirements.map((row) => {
                  const material = areaMaterials.find((m) => m.id === row.materialId)
                  const inStock = stock.find(
                    (s) => s.workAreaId === workAreaId && s.materialId === row.materialId,
                  )
                  const allocated = allocatedByMaterial.get(row.materialId) ?? 0
                  return (
                    <li
                      key={row.materialId}
                      className="flex items-center justify-between gap-2 rounded border border-border/60 bg-card px-2 py-1"
                    >
                      <span className="font-semibold text-foreground">
                        {material?.name ?? row.materialId}
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({material?.unit ?? '—'})
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular font-bold text-brand-pine">
                          ×{row.requiredQuantity}
                        </span>
                        {allocated > 0 ? (
                          <span className="tabular text-[11px] font-semibold text-emerald-600">
                            {t('features.allocations.taskAllocated', {
                              allocated,
                              required: row.requiredQuantity,
                            })}
                          </span>
                        ) : null}
                        {inStock ? (
                          <span className="text-[11px] text-muted-foreground">
                            {t('features.allocations.available', { n: inStock.unallocated })}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t('features.allocations.taskMaterialsEmpty')}
              </p>
            )}
          </div>
        )}
      </Card>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={rows} columns={columns} emptyText={t('features.allocations.empty')} />
      )}
    </div>
  )
}