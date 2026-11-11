// Ghi nhận mua hàng cho người đi mua (/volunteer/purchases).
// BE F-RES-09 `POST /purchase-requests/{id}/purchases` chỉ cho VOLUNTEER đang
// giữ assignment ACCEPTED của việc mua (BR-30) và KHÔNG nhập kho (BR-26) —
// kho chỉ tăng khi trưởng ban vật tư xác nhận giao (F-RES-10).
// Trước 11/11/2026 web không có màn hình này nên buyer phải dùng app mobile.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/api'
import i18n from '@/lib/i18n'
import { useMyPurchaseTasks, usePurchaseRequest, useRecordPurchase } from '../api'
import type { MyPurchaseTaskDto, PurchaseRequestDto } from '../api'

const fmt = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')

/** Trạng thái ĐƠN cho phép người mua ghi nhận (BE: APPROVED/BUYER_ASSIGNED → PURCHASED). */
const RECORDABLE_REQUEST = new Set(['APPROVED', 'BUYER_ASSIGNED'])

interface LineState {
  purchasedQuantity: string
  unitPrice: string
}

function RecordDialog({
  task,
  request,
  onClose,
}: {
  task: MyPurchaseTaskDto
  request: PurchaseRequestDto
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordPurchase()

  const [supplier, setSupplier] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      request.items.map((item) => [
        item.id,
        {
          purchasedQuantity: String(item.requestedQuantity),
          unitPrice: String(item.estimatedCost ? Math.round(item.estimatedCost / item.requestedQuantity) : 0),
        },
      ]),
    ),
  )

  const total = useMemo(
    () =>
      Object.values(lines).reduce(
        (sum, line) => sum + (Number(line.purchasedQuantity) || 0) * (Number(line.unitPrice) || 0),
        0,
      ),
    [lines],
  )

  const canRecord = RECORDABLE_REQUEST.has(String(request.status).toUpperCase())

  const onSubmit = async () => {
    const items = Object.entries(lines)
      .map(([purchaseRequestItemId, line]) => ({
        purchaseRequestItemId,
        purchasedQuantity: Number(line.purchasedQuantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
      }))
      .filter((line) => line.purchasedQuantity > 0)

    if (!items.length) {
      toast(t('features.volunteerPurchases.qtyRequired'), 'alert')
      return
    }

    try {
      await record.mutateAsync({
        requestId: request.id,
        supplierName: supplier.trim() || null,
        purchaseDate: date || null,
        items,
      })
      toast(t('features.volunteerPurchases.recorded'))
      onClose()
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.volunteerPurchases.dialogTitle', { name: task.name })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={record.isPending || !canRecord} onClick={() => void onSubmit()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="purchase-supplier">{t('features.volunteerPurchases.supplier')}</Label>
            <Input
              id="purchase-supplier"
              value={supplier}
              maxLength={150}
              placeholder={t('features.volunteerPurchases.supplierHint')}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="purchase-date">{t('features.volunteerPurchases.date')}</Label>
            <Input id="purchase-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {request.items.map((item) => (
          <div key={item.id} className="rounded-md border border-border/60 p-3">
            <p className="text-sm font-semibold text-foreground">
              {item.materialName}{' '}
              <span className="text-xs font-normal text-muted-foreground">({item.unit})</span>
            </p>
            <p className="mb-2 text-xs text-muted-foreground">
              {t('features.volunteerPurchases.requested', { qty: item.requestedQuantity })}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`qty-${item.id}`}>{t('features.volunteerPurchases.boughtQty')}</Label>
                <Input
                  id={`qty-${item.id}`}
                  type="number"
                  min={0}
                  value={lines[item.id]?.purchasedQuantity ?? ''}
                  onChange={(e) =>
                    setLines((prev) => ({
                      ...prev,
                      [item.id]: { ...prev[item.id], purchasedQuantity: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`price-${item.id}`}>{t('features.volunteerPurchases.unitPrice')}</Label>
                <Input
                  id={`price-${item.id}`}
                  type="number"
                  min={0}
                  step={1000}
                  value={lines[item.id]?.unitPrice ?? ''}
                  onChange={(e) =>
                    setLines((prev) => ({
                      ...prev,
                      [item.id]: { ...prev[item.id], unitPrice: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ))}

        <p className="text-sm">
          {t('features.volunteerPurchases.total')}: <span className="font-semibold tabular">{fmt(total)} ₫</span>
        </p>
        <p className="text-xs text-muted-foreground">{t('features.volunteerPurchases.stockHint')}</p>
        {!canRecord && (
          <p className="text-xs text-destructive">
            {t('features.volunteerPurchases.requestNotApproved', { status: String(request.status) })}
          </p>
        )}
      </div>
    </Dialog>
  )
}

export default function VolunteerPurchasesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { data: tasks = [], isPending } = useMyPurchaseTasks()
  const [recording, setRecording] = useState<MyPurchaseTaskDto | null>(null)
  const [requestId, setRequestId] = useState<string | undefined>(undefined)
  const { data: request, isPending: requestPending } = usePurchaseRequest(requestId)

  useEffect(() => {
    if (recording?.purchaseRequestId) setRequestId(recording.purchaseRequestId)
  }, [recording])

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="lbl-mono text-muted-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => void onLogout()}>
            <LogOut className="size-4" />
            {t('common.logout')}
          </Button>
        </div>

        <PageHeader
          title={t('features.volunteerPurchases.title')}
          sub={t('features.volunteerPurchases.sub')}
        />

        {isPending ? (
          <p className="lbl-mono">{t('common.loading')}</p>
        ) : tasks.length === 0 ? (
          <EmptyState text={t('features.volunteerPurchases.empty')} />
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Card key={task.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('features.volunteerPurchases.requestRef', {
                      id: (task.purchaseRequestId ?? '').slice(0, 8),
                    })}
                    {task.deadline ? ` · ${new Date(task.deadline).toLocaleDateString(i18n.language)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusTag status={task.status} />
                  <Button size="sm" onClick={() => setRecording(task)}>
                    <ShoppingCart className="size-4" />
                    {t('features.volunteerPurchases.record')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {recording && requestPending && <p className="lbl-mono mt-4">{t('common.loading')}</p>}

        {recording && request && (
          <RecordDialog
            task={recording}
            request={request}
            onClose={() => {
              setRecording(null)
              setRequestId(undefined)
            }}
          />
        )}
      </div>
    </div>
  )
}
