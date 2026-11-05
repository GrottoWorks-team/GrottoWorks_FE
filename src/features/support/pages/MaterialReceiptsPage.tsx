// Nhận vật tư hỗ trợ chéo cộng đoàn (/material-officer/support-materials).
// Luồng: LEADER duyệt vật tư → Resource tạo phiếu chuyển (IN_TRANSIT) → MO xác nhận số thực nhận
// (F-RES-20 POST /support-response-materials/{itemId}/confirm-receipt, chỉ usable vào kho).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PackageCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useMaterials } from '@/features/materials/api'
import { ApiError } from '@/lib/api'
import { useConfirmSupportMaterialReceipt, useSupportRequests } from '../api'

interface PendingReceipt {
  itemId: string
  requestId: string
  requestLabel: string
  materialName: string
  unit: string
  approvedQuantity: number
  version: number
  status: string
}

const norm = (status: string) => status.toUpperCase()

export default function MaterialReceiptsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: requests = [], isPending } = useSupportRequests({ size: 100 })
  const { data: materials = [] } = useMaterials()
  const confirm = useConfirmSupportMaterialReceipt()

  const [target, setTarget] = useState<PendingReceipt | null>(null)
  const [usable, setUsable] = useState('')
  const [unusable, setUnusable] = useState('0')
  const [note, setNote] = useState('')

  const rows = useMemo<PendingReceipt[]>(() => {
    const materialOf = new Map(materials.map((m) => [m.id, m]))
    return requests.flatMap((request) =>
      (request.responses ?? []).flatMap((response) =>
        response.materials
          .filter((item) => norm(item.status) === 'APPROVED')
          .map((item) => {
            const material = materialOf.get(item.materialId)
            return {
              itemId: item.id,
              requestId: request.id,
              requestLabel: `#${request.id.slice(0, 8)}`,
              materialName: material?.name ?? item.materialId.slice(0, 8),
              unit: material?.unit ?? '',
              approvedQuantity: item.approvedQuantity ?? item.offeredQuantity,
              version: item.version,
              status: item.status,
            }
          }),
      ),
    )
  }, [requests, materials])

  const openConfirm = (row: PendingReceipt) => {
    setTarget(row)
    setUsable(String(row.approvedQuantity))
    setUnusable('0')
    setNote('')
  }

  const onSubmit = async () => {
    if (!target) return
    try {
      await confirm.mutateAsync({
        itemId: target.itemId,
        version: target.version,
        usableQuantity: Math.max(0, Number(usable) || 0),
        unusableQuantity: Math.max(0, Number(unusable) || 0),
        note: note.trim() || undefined,
      })
      toast(t('features.supportReceipts.saved'))
      setTarget(null)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <div>
      <PageHeader title={t('features.supportReceipts.title')} sub={t('features.supportReceipts.sub')} />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState text={t('features.supportReceipts.empty')} />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.itemId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {row.materialName}{' '}
                  <span className="text-xs font-normal text-muted-foreground">({row.unit})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('features.supportReceipts.fromRequest', { id: row.requestLabel })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm">
                  {t('features.supportReceipts.approved', { qty: row.approvedQuantity })}
                </span>
                <StatusTag status={row.status} />
                <Button size="sm" onClick={() => openConfirm(row)}>
                  <PackageCheck className="size-4" />
                  {t('features.supportReceipts.confirm')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {target && (
        <Dialog
          open
          onClose={() => setTarget(null)}
          title={t('features.supportReceipts.dialogTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={confirm.isPending} onClick={onSubmit}>
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {target.materialName} · {target.requestLabel} ·{' '}
              {t('features.supportReceipts.approved', { qty: target.approvedQuantity })} {target.unit}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="receipt-usable">{t('features.supportReceipts.usable')}</Label>
                <Input
                  id="receipt-usable"
                  type="number"
                  min={0}
                  value={usable}
                  onChange={(e) => setUsable(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="receipt-unusable">{t('features.supportReceipts.unusable')}</Label>
                <Input
                  id="receipt-unusable"
                  type="number"
                  min={0}
                  value={unusable}
                  onChange={(e) => setUnusable(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="receipt-note">{t('features.supportReceipts.note')}</Label>
              <textarea
                id="receipt-note"
                rows={2}
                maxLength={2000}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
