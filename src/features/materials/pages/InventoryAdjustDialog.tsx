// Dialog điều chỉnh tồn kho (D1b: POST /api/v1/inventory-adjustments) — MO ghi
// nhận vật tư hỏng / mất / thanh lý để sổ kho khớp thực tế.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useAdjustInventory, useMaterialCatalog, type InventoryAdjustmentKind } from '../api'
import { useScopedAreas } from '@/features/areas/api'

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const KINDS: InventoryAdjustmentKind[] = ['Damaged', 'Lost', 'Disposed']

export function InventoryAdjustDialog({
  open,
  onClose,
  defaultWorkAreaId,
  defaultMaterialId,
}: {
  open: boolean
  onClose: () => void
  defaultWorkAreaId?: string
  defaultMaterialId?: string
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const adjust = useAdjustInventory()

  // Khu của mùa đang chọn — dialog luôn mount nên tránh useAreas() gọi mọi mùa (N+1).
  const { data: areas = [] } = useScopedAreas()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const materials = catalogResult?.data || []

  const [workAreaId, setWorkAreaId] = useState(defaultWorkAreaId ?? '')
  const [materialId, setMaterialId] = useState(defaultMaterialId ?? '')
  const [kind, setKind] = useState<InventoryAdjustmentKind>('Damaged')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setWorkAreaId(defaultWorkAreaId ?? '')
    setMaterialId(defaultMaterialId ?? '')
    setKind('Damaged')
    setQuantity('1')
    setReason('')
  }, [open, defaultWorkAreaId, defaultMaterialId])

  const canSubmit =
    Boolean(workAreaId && materialId && reason.trim()) && Number(quantity) > 0 && !adjust.isPending

  const submit = async () => {
    if (!canSubmit) return
    try {
      await adjust.mutateAsync({
        workAreaId,
        materialId,
        type: kind,
        quantity: Number(quantity),
        reason: reason.trim(),
      })
      toast(t('features.inventory.adjustSaved'))
      onClose()
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.inventory.adjustTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="adjust-area">{t('features.inventory.dialog.workArea')}</Label>
          <select
            id="adjust-area"
            className={SELECT_CLS}
            value={workAreaId}
            onChange={(e) => setWorkAreaId(e.target.value)}
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="adjust-material">{t('features.inventory.dialog.material')}</Label>
          <select
            id="adjust-material"
            className={SELECT_CLS}
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
          >
            <option value="">{t('common.selectPlaceholder')}</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="adjust-kind">{t('features.inventory.adjustKind')}</Label>
            <select
              id="adjust-kind"
              className={SELECT_CLS}
              value={kind}
              onChange={(e) => setKind(e.target.value as InventoryAdjustmentKind)}
            >
              {KINDS.map((item) => (
                <option key={item} value={item}>
                  {t(`features.inventory.adjustKindOption.${item}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="adjust-quantity">{t('features.inventory.adjustQuantity')}</Label>
            <Input
              id="adjust-quantity"
              type="number"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="adjust-reason">{t('features.inventory.adjustReason')}</Label>
          <textarea
            id="adjust-reason"
            rows={3}
            maxLength={500}
            className={TEXTAREA_CLS}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}
