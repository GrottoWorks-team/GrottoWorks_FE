// Xác nhận mua (route /material-officer/purchases-confirm): request APPROVED chờ xử
// lý → gán người mua (TNV, không ADMIN/COMMITTEE) + tạo hồ sơ giao hàng
// (qty, cost thực tế, supplier, date, hoá đơn objectURL preview). Tạo record
// cộng purchased → received tăng (useCreatePurchaseRecord). Bảng dưới: hồ sơ
// đã/chưa xác nhận; xác nhận = PATCH confirmed=true.
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Check, FilePlus2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { shortage } from '@/types'
import type { Material, PurchaseRecord, PurchaseRequest } from '@/types'
import { useConfirmPurchase, useCreatePurchaseRecord, usePurchaseRecords, usePurchaseRequests } from '../api'

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const num = (key: string, min = 0) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.number({ invalid_type_error: key }).min(min, key).int(min ? key : undefined),
  )

// Dialog tạo hồ sơ giao hàng cho 1 request APPROVED.
function RecordDialog({ request, materials, onClose }: {
  request: PurchaseRequest
  materials: Material[] // vật tư của request
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [] } = useUsers()
  const create = useCreatePurchaseRecord()
  const [photo, setPhoto] = useState('')

  const schema = z.object({
    materialId: z.string().min(1, 'features.purchases.pickRequired'),
    qty: num('features.purchases.numberInvalid', 1),
    cost: num('features.purchases.numberInvalid'),
    supplier: z.string().trim().min(1, 'features.purchases.supplierRequired'),
    date: z.string().min(1, 'features.purchases.dateRequired'),
    buyerId: z.string().min(1, 'features.purchases.buyerRequired'),
  })
  type FormData = z.infer<typeof schema>

  const first = materials.find((m) => m.id === request.materialIds[0]) ?? materials[0]
  const defaultQty = (request.qtys?.[first?.id ?? ''] ?? (first ? shortage(first) : 0)) || 1

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      materialId: first?.id ?? '',
      qty: defaultQty,
      cost: (first?.estUnitPrice ?? 0) * defaultQty,
      supplier: '',
      date: new Date().toISOString().slice(0, 10),
      buyerId: '',
    },
  })

  // ADMIN/COMMITTEE không mua hộ — loại khỏi select (pattern Task 6).
  const volunteers = users.filter((u) => u.role !== 'PARISH' && u.role !== 'COMMUNITY')

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({ requestId: request.id, ...data, receiptPhoto: photo || undefined, confirmed: false })
      toast(t('features.purchases.recordCreated'))
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
      title={t('features.purchases.recordTitle', { code: request.id })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="record-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="record-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="record-material">{t('features.purchases.material')}</Label>
          <select id="record-material" className={SELECT_CLS} {...register('materialId')}>
            <option value="">{t('features.tasks.selectPlaceholder')}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.unit})
              </option>
            ))}
          </select>
          {err(errors.materialId?.message)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="record-qty">{t('features.purchases.qty')}</Label>
            <Input id="record-qty" type="number" min={1} step={1} {...register('qty')} />
            {err(errors.qty?.message)}
          </div>
          <div>
            <Label htmlFor="record-cost">{t('features.purchases.cost')}</Label>
            <Input id="record-cost" type="number" min={0} step={1000} {...register('cost')} />
            {err(errors.cost?.message)}
          </div>
        </div>
        <div>
          <Label htmlFor="record-supplier">{t('features.purchases.supplier')}</Label>
          <Input id="record-supplier" {...register('supplier')} />
          {err(errors.supplier?.message)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="record-date">{t('features.purchases.date')}</Label>
            <Input id="record-date" type="date" {...register('date')} />
            {err(errors.date?.message)}
          </div>
          <div>
            <Label htmlFor="record-buyer">{t('features.purchases.buyer')}</Label>
            <select id="record-buyer" className={SELECT_CLS} {...register('buyerId')}>
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {volunteers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {err(errors.buyerId?.message)}
          </div>
        </div>
        <div>
          <Label htmlFor="record-photo">{t('features.purchases.receipt')}</Label>
          <input
            id="record-photo"
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground"
            onChange={(e) => {
              const f = e.target.files?.[0]
              setPhoto(f ? URL.createObjectURL(f) : '')
            }}
          />
          {/* objectURL preview — demo không upload thật (chỉ tồn tại trong phiên). */}
          {photo && <img src={photo} alt={t('features.purchases.receipt')} className="mt-2 max-h-32 rounded-card border border-border" />}
        </div>
      </form>
    </Dialog>
  )
}

export default function PurchaseConfirmPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: materials = [] } = useMaterials()
  const { data: users = [] } = useUsers()
  const { data: requests = [], isPending } = usePurchaseRequests()
  const { data: records = [] } = usePurchaseRecords()
  const confirmPurchase = useConfirmPurchase()

  const [recording, setRecording] = useState<PurchaseRequest | null>(null)

  const myAreas = areas.filter((a) => a.officerId === user?.id)
  const inMyAreas = (m: Material) => myAreas.some((a) => a.id === m.areaId)
  const myMaterials = materials.filter(inMyAreas)
  const matName = (id: string) => materials.find((m) => m.id === id)?.name ?? id
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  // Chờ xử lý = APPROVED + chưa có hồ sơ nào (đã có record thì tạo tiếp sẽ
  // double-count purchased — record tồn tại nghĩa là đã ghi giao hàng).
  const pending = requests.filter(
    (r) =>
      r.status === 'APPROVED' &&
      !records.some((rec) => rec.requestId === r.id) &&
      r.materialIds.some((id) => myMaterials.some((m) => m.id === id)),
  )
  const myRecords = records
    .filter((r) => myMaterials.some((m) => m.id === r.materialId))
    .sort((a, b) => Number(a.confirmed) - Number(b.confirmed)) // chưa xác nhận đứng trước

  const pendingColumns = useMemo(
    () => [
      {
        key: 'id',
        header: t('features.purchases.code'),
        render: (r: PurchaseRequest) => <span className="lbl-mono font-semibold">#{r.id}</span>,
      },
      {
        key: 'materials',
        header: t('features.purchases.materials'),
        render: (r: PurchaseRequest) => (
          <span>
            {r.materialIds.map((id, i) => (
              <span key={id}>
                {i > 0 && ', '}
                {matName(id)}
              </span>
            ))}
          </span>
        ),
      },
      {
        key: 'total',
        header: t('features.purchases.total'),
        align: 'right' as const,
        render: (r: PurchaseRequest) => <span className="tabular">{r.total.toLocaleString()} ₫</span>,
      },
      { key: 'note', header: t('features.purchases.note'), render: (r: PurchaseRequest) => r.note ?? '—' },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: PurchaseRequest) => (
          <Button size="sm" onClick={() => setRecording(r)}>
            <FilePlus2 className="size-4" />
            {t('features.purchases.createRecord')}
          </Button>
        ),
      },
    ],
    [t, materials],
  )

  const recordColumns = useMemo(
    () => [
      { key: 'material', header: t('features.purchases.material'), render: (r: PurchaseRecord) => matName(r.materialId) },
      { key: 'qty', header: t('features.purchases.qty'), align: 'right' as const, render: (r: PurchaseRecord) => <span className="tabular">{r.qty}</span> },
      { key: 'cost', header: t('features.purchases.cost'), align: 'right' as const, render: (r: PurchaseRecord) => <span className="tabular">{r.cost.toLocaleString()} ₫</span> },
      { key: 'supplier', header: t('features.purchases.supplier'), render: (r: PurchaseRecord) => r.supplier },
      { key: 'date', header: t('features.purchases.date'), render: (r: PurchaseRecord) => <span className="tabular">{viDate(r.date)}</span> },
      { key: 'buyerId', header: t('features.purchases.buyer'), render: (r: PurchaseRecord) => userName(r.buyerId) },
      {
        key: 'receiptPhoto',
        header: t('features.purchases.receipt'),
        align: 'center' as const,
        render: (r: PurchaseRecord) => (r.receiptPhoto ? <span className="text-brand-pine">✓</span> : <span className="text-muted-foreground">—</span>),
      },
      {
        key: 'confirmed',
        header: t('features.purchases.confirmed'),
        render: (r: PurchaseRecord) =>
          r.confirmed ? (
            <span className="font-semibold text-brand-pine">✓</span>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                void confirmPurchase
                  .mutateAsync(r.id)
                  .then(() => toast(t('features.purchases.confirmedDone', { code: r.id })))
                  .catch(() => toast(t('common.error'), 'alert'))
              }}
            >
              <Check className="size-4" />
              {t('common.confirm')}
            </Button>
          ),
      },
    ],
    [t, materials, users, confirmPurchase],
  )

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (!myAreas.length) return <EmptyState text={t('features.materials.noArea')} />

  const confirmedRecordsCount = myRecords.filter((r) => r.confirmed).length
  const unconfirmedRecordsCount = myRecords.filter((r) => !r.confirmed).length

  return (
    <div>
      <PageHeader title={t('features.purchases.confirmTitle')} sub={t('features.purchases.confirmSub')} />

      {/* 4 StatCards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Đơn chờ tạo hồ sơ"
          value={pending.length}
          unit="đơn duyệt"
          tone={pending.length > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label="Tổng hồ sơ giao nhận"
          value={myRecords.length}
          unit="hồ sơ"
        />
        <StatCard
          label="Đã xác nhận kho"
          value={confirmedRecordsCount}
          unit="hồ sơ"
          tone="ok"
        />
        <StatCard
          label="Chờ thủ kho xác nhận"
          value={unconfirmedRecordsCount}
          unit="hồ sơ"
          tone={unconfirmedRecordsCount > 0 ? 'alert' : 'ok'}
        />
      </div>

      <div className="mb-6 rounded-card border border-border bg-card p-5">
        <h2 className="lbl-mono mb-3 text-foreground">{t('features.purchases.pendingRecords')}</h2>
        {isPending ? (
          <p className="lbl-mono">{t('common.loading')}</p>
        ) : (
          <DataTable rows={pending} columns={pendingColumns} emptyText={t('features.purchases.noApproved')} />
        )}
      </div>

      <div className="rounded-card border border-border bg-card p-5">
        <h2 className="lbl-mono mb-3 text-foreground">{t('features.purchases.recordsTitle')}</h2>
        <DataTable rows={myRecords} columns={recordColumns} pageSize={8} emptyText={t('features.purchases.noRecords')} />
      </div>

      {recording && (
        <RecordDialog
          request={recording}
          // Chỉ material thuộc request VÀ khu officer phụ trách (inMyAreas).
          materials={materials.filter((m) => recording.materialIds.includes(m.id) && inMyAreas(m))}
          onClose={() => setRecording(null)}
        />
      )}
    </div>
  )
}
