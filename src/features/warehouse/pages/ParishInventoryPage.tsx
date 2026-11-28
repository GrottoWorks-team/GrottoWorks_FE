// Kho tổng giáo xứ (/community/warehouse) — BE role PARISH quản lý, ADMIN chỉ đọc.
// Tồn kho tổng tách khỏi tồn khu; MO không thấy màn này.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Boxes, Layers, Package, Plus, Send, ShoppingCart, SlidersHorizontal, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { formatQuantity, formatVnd, viDateTime } from '@/lib/format'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useMaterialCatalog } from '@/features/materials/api'
import type { Season } from '@/types'
import {
  useAdjustParishInventory,
  useParishInventory,
  useParishDistributions,
  useParishMaterialHistory,
  useParishPurchases,
  useRecordParishOpeningStock,
  type ParishInventoryBalanceDto,
  type ParishInventoryTransactionDto,
} from '../api'
import { ParishPurchaseDialog } from './ParishPurchaseDialog'

const INPUT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface OpeningStockLine {
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  previousQuantity: number | null
  quantity: string
  reason: string
}

function OpeningStockDialog({
  open,
  seasonId,
  previousSeason,
  onClose,
}: {
  open: boolean
  seasonId: string
  previousSeason?: Season
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordParishOpeningStock()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const materials = catalogResult?.data ?? []
  const { data: previousInventory, isLoading: previousLoading, isError: previousError } = useParishInventory(
    { seasonId: previousSeason?.id ?? '', size: 100 },
    { enabled: open && Boolean(previousSeason) },
  )
  const [lines, setLines] = useState<OpeningStockLine[]>([])
  const [newMaterialId, setNewMaterialId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLines((previousInventory?.data ?? []).map((row) => ({
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      unit: row.unit,
      previousQuantity: row.confirmedAvailable,
      quantity: '',
      reason: '',
    })))
    setNewMaterialId('')
  }, [open, previousSeason?.id, previousInventory?.data])

  const addMaterial = () => {
    const material = materials.find((item) => item.id === newMaterialId)
    if (!material || lines.some((line) => line.materialId === material.id)) return
    setLines((current) => [...current, {
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      unit: material.unit,
      previousQuantity: null,
      quantity: '',
      reason: '',
    }])
    setNewMaterialId('')
  }

  const submit = async () => {
    const invalidQuantity = lines.some((line) => line.quantity === '' || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) < 0)
    if (invalidQuantity) {
      toast(t('features.warehouse.openingInvalidQuantity'), 'alert')
      return
    }

    const changedWithoutReason = lines.some((line) =>
      line.previousQuantity !== null && Number(line.quantity) !== line.previousQuantity && !line.reason.trim(),
    )
    if (changedWithoutReason) {
      toast(t('features.warehouse.openingReasonRequired'), 'alert')
      return
    }

    const toSave = lines.filter((line) => Number(line.quantity) > 0)
    if (toSave.length === 0) {
      toast(t('features.warehouse.openingNoPositiveStock'), 'alert')
      return
    }

    setIsSaving(true)
    try {
      const results = await Promise.allSettled(toSave.map((line) => record.mutateAsync({
        seasonId,
        materialId: line.materialId,
        quantity: Number(line.quantity),
        note: line.reason.trim() || null,
      })))
      const failedIds = new Set(results.flatMap((result, index) => result.status === 'rejected' ? [toSave[index].materialId] : []))
      if (failedIds.size > 0) {
        setLines((current) => current.filter((line) => failedIds.has(line.materialId)))
        toast(t('features.warehouse.openingPartialError', { saved: toSave.length - failedIds.size, failed: failedIds.size }), 'alert')
        return
      }

      toast(t('features.warehouse.openingSavedCount', { count: toSave.length, zeroCount: lines.length - toSave.length }))
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const usedMaterialIds = new Set(lines.map((line) => line.materialId))

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.warehouse.openingTitle')}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving || previousLoading || lines.length === 0}>
            {isSaving ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {previousSeason
            ? t('features.warehouse.openingCarryForward', { season: previousSeason.name })
            : t('features.warehouse.openingNoPreviousSeason')}
        </p>

        {previousLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : previousError ? (
          <p className="text-sm text-destructive">{t('features.warehouse.openingPreviousLoadError')}</p>
        ) : (
          <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t('features.warehouse.material')}</th>
                  <th className="px-3 py-2 text-right">{t('features.warehouse.previousQuantity')}</th>
                  <th className="px-3 py-2">{t('features.warehouse.remainingQuantity')}</th>
                  <th className="px-3 py-2">{t('features.warehouse.differenceReason')}</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lines.map((line) => (
                  <tr key={line.materialId}>
                    <td className="px-3 py-2">
                      <span className="block font-medium">{line.materialName}</span>
                      <span className="text-xs text-muted-foreground">{line.materialCode} · {line.unit}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.previousQuantity === null
                        ? t('features.warehouse.noPreviousBalance')
                        : `${formatQuantity(line.previousQuantity)} ${line.unit}`}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        aria-label={t('features.warehouse.remainingFor', { material: line.materialName })}
                        type="number"
                        min="0"
                        step="any"
                        value={line.quantity}
                        onChange={(event) => setLines((current) => current.map((item) => item.materialId === line.materialId
                          ? { ...item, quantity: event.target.value }
                          : item))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        aria-label={t('features.warehouse.reasonFor', { material: line.materialName })}
                        placeholder={t('features.warehouse.differenceReasonPlaceholder')}
                        maxLength={2000}
                        value={line.reason}
                        onChange={(event) => setLines((current) => current.map((item) => item.materialId === line.materialId
                          ? { ...item, reason: event.target.value }
                          : item))}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('features.warehouse.removeMaterial', { material: line.materialName })}
                        onClick={() => setLines((current) => current.filter((item) => item.materialId !== line.materialId))}
                      >
                        <X className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {t('features.warehouse.openingNoMaterials')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor="parish-opening-new-material">{t('features.warehouse.addNewMaterial')}</Label>
            <select
              id="parish-opening-new-material"
              className={INPUT_CLS}
              value={newMaterialId}
              onChange={(event) => setNewMaterialId(event.target.value)}
              disabled={previousLoading}
            >
              <option value="">{t('features.warehouse.selectMaterial')}</option>
              {materials.filter((material) => !usedMaterialIds.has(material.id)).map((material) => (
                <option key={material.id} value={material.id}>
                  {material.code} - {material.name} ({material.unit})
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" onClick={addMaterial} disabled={!newMaterialId || previousLoading}>
            <Plus className="mr-1 size-4" />
            {t('features.warehouse.addMaterial')}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function AdjustmentDialog({
  open,
  seasonId,
  rows,
  onClose,
}: {
  open: boolean
  seasonId: string
  rows: ParishInventoryBalanceDto[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const adjust = useAdjustParishInventory()
  const [materialId, setMaterialId] = useState('')
  const [type, setType] = useState<'DAMAGED' | 'LOST' | 'DISPOSED'>('DAMAGED')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('')

  const selected = rows.find((row) => row.materialId === materialId)

  const submit = async () => {
    try {
      await adjust.mutateAsync({ seasonId, materialId, type, quantity: Number(quantity), reason: reason.trim() })
      toast(t('features.warehouse.adjustSaved'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.warehouse.adjustTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={adjust.isPending || !materialId || !reason.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="parish-adjust-material">{t('features.warehouse.material')}</Label>
          <select
            id="parish-adjust-material"
            className={INPUT_CLS}
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
          >
            <option value="">{t('features.warehouse.selectMaterial')}</option>
            {rows.map((row) => (
              <option key={row.materialId} value={row.materialId}>
                {row.materialCode} - {row.materialName} ({formatQuantity(row.confirmedAvailable)} {row.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="parish-adjust-type">{t('features.warehouse.adjustType')}</Label>
          <select
            id="parish-adjust-type"
            className={INPUT_CLS}
            value={type}
            onChange={(event) => setType(event.target.value as 'DAMAGED' | 'LOST' | 'DISPOSED')}
          >
            <option value="DAMAGED">{t('features.warehouse.adjustDamaged')}</option>
            <option value="LOST">{t('features.warehouse.adjustLost')}</option>
            <option value="DISPOSED">{t('features.warehouse.adjustDisposed')}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="parish-adjust-quantity">{t('features.warehouse.quantity')}</Label>
          <Input
            id="parish-adjust-quantity"
            type="number"
            min="0.01"
            step="0.01"
            max={selected?.confirmedAvailable}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
          {selected && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('features.warehouse.available', {
                quantity: formatQuantity(selected.confirmedAvailable),
                unit: selected.unit,
              })}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="parish-adjust-reason">{t('features.warehouse.reason')}</Label>
          <Textarea id="parish-adjust-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}

function HistoryDialog({
  open,
  seasonId,
  row,
  onClose,
}: {
  open: boolean
  seasonId: string
  row: ParishInventoryBalanceDto | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { data: history = [], isPending } = useParishMaterialHistory(
    { seasonId, materialId: row?.materialId ?? '' },
    { enabled: open && Boolean(row) },
  )

  const labelOf = (transaction: ParishInventoryTransactionDto) => {
    const key = `features.warehouse.tx.${transaction.transactionType}`
    return t(key, { defaultValue: transaction.transactionType })
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('features.warehouse.historyTitle', { name: row?.materialName ?? '' })} size="lg">
      {isPending ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : history.length === 0 ? (
        <EmptyState text={t('features.warehouse.historyEmpty')} />
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-2">{t('features.warehouse.time')}</th>
                <th className="px-2 py-2">{t('features.warehouse.type')}</th>
                <th className="px-2 py-2 text-right">{t('features.warehouse.quantity')}</th>
                <th className="px-2 py-2">{t('features.warehouse.note')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{viDateTime(transaction.transactionDate)}</td>
                  <td className="px-2 py-2">{labelOf(transaction)}</td>
                  <td
                    className={`px-2 py-2 text-right font-mono tabular ${
                      transaction.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.quantity > 0 ? '+' : ''}
                    {formatQuantity(transaction.quantity)}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">{transaction.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Dialog>
  )
}

export default function ParishInventoryPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { seasonId: headerSeasonId } = useSeasonContext()
  const { data: seasons = [] } = useSeasons()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100 })
  const catalog = catalogResult?.data ?? []

  const [seasonId, setSeasonId] = useState(headerSeasonId ?? seasons[0]?.id ?? '')
  const [materialId, setMaterialId] = useState('')

  const [openingOpen, setOpeningOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [historyRow, setHistoryRow] = useState<ParishInventoryBalanceDto | null>(null)

  const selectedSeason = seasons.find((season) => season.id === seasonId)
  const previousSeason = selectedSeason
    ? seasons
        .filter((season) => season.year < selectedSeason.year && ['COMPLETED', 'ARCHIVED'].includes(season.status))
        .sort((a, b) => b.year - a.year)[0]
    : undefined

  useEffect(() => {
    if (!seasonId && headerSeasonId) setSeasonId(headerSeasonId)
  }, [headerSeasonId, seasonId])

  const { data: inventory, isPending, isError, refetch } = useParishInventory({
    seasonId,
    materialId: materialId || undefined,
    page: 1,
    size: 100,
  })

  // 26/11/2026: các biên lai "vật tư Ban phụ trách đã mua" gần nhất của mùa.
  const { data: purchases = [] } = useParishPurchases(seasonId)
  // Tổng đã phân xuống khu trong mùa — cùng nguồn với trang Phiếu phân xuống.
  const { data: distributions } = useParishDistributions({ seasonId: seasonId || undefined, page: 1, size: 100 })

  const rows = inventory?.data ?? []
  const pageInfo = inventory?.page ?? { page: 1, size: 100, totalItems: 0, totalPages: 1 }
  const canWrite = user?.role === 'COMMUNITY'
  const totalAvailable = useMemo(() => rows.reduce((sum, row) => sum + row.confirmedAvailable, 0), [rows])
  const issuedTotal = useMemo(
    () =>
      (distributions?.data ?? []).reduce(
        (sum, distribution) =>
          sum + distribution.items.reduce((lineSum, item) => lineSum + item.issuedQuantity, 0),
        0,
      ),
    [distributions],
  )

  const stats = [
    {
      key: 'total',
      icon: Boxes,
      label: t('features.warehouse.statTotal', { defaultValue: 'Tổng tồn' }),
      value: formatQuantity(totalAvailable),
      hint: t('features.warehouse.statTotalHint', { defaultValue: 'Tổng số lượng trong kho' }),
      warn: false,
    },
    {
      key: 'lines',
      icon: Layers,
      label: t('features.warehouse.statLines', { defaultValue: 'Mặt hàng' }),
      value: String(pageInfo.totalItems),
      hint: pageInfo.totalItems
        ? t('features.warehouse.statLinesHint', { defaultValue: 'Mặt hàng đang có trong kho' })
        : t('features.warehouse.statLinesEmpty', { defaultValue: 'Chưa có mặt hàng' }),
      warn: false,
    },
    {
      key: 'issued',
      icon: Send,
      label: t('features.warehouse.statIssued', { defaultValue: 'Đã phân xuống' }),
      value: formatQuantity(issuedTotal),
      hint: issuedTotal
        ? t('features.warehouse.statIssuedHint', { defaultValue: 'Xuất xuống khu trong mùa' })
        : t('features.warehouse.statIssuedNone', { defaultValue: 'Chưa phân xuống khu' }),
      warn: issuedTotal > 0,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.warehouse.title')}
        sub={`${t('features.warehouse.sub')}.`}
        actions={
          canWrite && seasonId ? (
            <>
              <button
                type="button"
                onClick={() => setAdjustOpen(true)}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
              >
                <SlidersHorizontal className="size-[13px] text-[#3F7F5B]" aria-hidden />
                <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.warehouse.adjustBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setOpeningOpen(true)}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
              >
                <Plus className="size-[13px] text-[#3F7F5B]" aria-hidden />
                <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.warehouse.openingBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setPurchaseOpen(true)}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
              >
                <ShoppingCart className="size-[13px] text-[#F2D07A]" aria-hidden />
                <span className="text-[12px] font-bold text-white">{t('features.warehouse.purchaseBtn')}</span>
              </button>
            </>
          ) : undefined
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="grid w-full gap-[14px] md:grid-cols-3">
          {stats.map(({ key, icon: Icon, label, value, hint, warn }) => (
            <section
              key={key}
              className="flex w-full flex-col gap-[9px] rounded-[16px] border border-[#E3EAE0] bg-white p-[15px] shadow-[0px_1px_2px_#06281B0A]"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={cn(
                    'grid size-[26px] shrink-0 place-items-center rounded-[8px]',
                    warn ? 'bg-[#F7F4E7]' : 'bg-[#EDF4EA]',
                  )}
                >
                  <Icon className={cn('size-[13px]', warn ? 'text-[#A8830F]' : 'text-[#3F7F5B]')} aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                  {label}
                </span>
              </div>
              <span className="font-mono text-[28px] font-extrabold leading-none tracking-[-1px] text-[#0B2E1F]">
                {value}
              </span>
              <span className="w-full truncate text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</span>
            </section>
          ))}
        </div>

        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className="w-full min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-[14px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.warehouse.stockHead', { defaultValue: 'Tồn kho giáo xứ' })}
              </span>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.warehouse.stockChip', {
                  defaultValue: 'Tổng tồn: {{quantity}}',
                  quantity: formatQuantity(totalAvailable),
                })}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
              <span className="min-w-0 flex-1 font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {t('features.warehouse.material')}
              </span>
              <span className="w-[90px] shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {t('features.warehouse.unit')}
              </span>
              <span className="w-[90px] shrink-0 text-right font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {t('features.warehouse.stockCol', { defaultValue: 'Tồn' })}
              </span>
              <span className="w-[100px] shrink-0 text-right font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {t('common.actions')}
              </span>
            </div>

            {!seasonId ? (
              <EmptyState text={t('features.warehouse.selectSeason')} />
            ) : isPending ? (
              <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
            ) : isError ? (
              <div className="py-8 text-center">
                <EmptyState text={t('features.warehouse.loadError')} />
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="text-[11px] font-semibold text-[#0A5C36] hover:underline"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState text={t('features.warehouse.empty')} />
            ) : (
              <ul className="flex w-full flex-col">
                {rows.map((row) => (
                  <li
                    key={row.materialId}
                    className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                      <span className="grid size-7 shrink-0 place-items-center rounded-[9px] border border-[#DDE8D6] bg-[#EDF4EA]">
                        <Package className="size-[13px] text-[#3F7F5B]" aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="w-full truncate text-[12px] font-bold text-[#0B2E1F]">{row.materialName}</span>
                        <span className="w-full truncate font-mono text-[9px] text-[#9AAE9F]">{row.materialCode}</span>
                      </div>
                    </div>
                    <span className="w-[90px] shrink-0 truncate font-mono text-[10px] text-[#5C7468]">{row.unit}</span>
                    <span className="w-[90px] shrink-0 text-right font-mono text-[12px] font-bold text-[#0B2E1F]">
                      {formatQuantity(row.confirmedAvailable)}
                    </span>
                    <div className="flex w-[100px] shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => setHistoryRow(row)}
                        className="text-[10.5px] font-bold text-[#0A5C36] transition-colors hover:text-[#0D7344]"
                      >
                        {t('features.warehouse.history')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {rows.length > 0 && (
              <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
                <span className="text-[10.5px] text-[#96AAA0]">
                  {t('features.warehouse.paginationInfo', {
                    from: 1,
                    to: rows.length,
                    total: pageInfo.totalItems,
                  })}
                </span>
                {catalog.length > 0 && (
                  <select
                    aria-label={t('features.warehouse.allMaterials')}
                    className="h-[26px] rounded-[8px] border border-[#E7EEE3] bg-[#F7F9F5] px-2 text-[10px] text-[#6B8175]"
                    value={materialId}
                    onChange={(event) => setMaterialId(event.target.value)}
                  >
                    <option value="">{t('features.warehouse.allMaterials')}</option>
                    {catalog.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.code} - {material.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
            <section className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex w-full items-center px-4 py-[14px]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.warehouse.purchaseBtn')}
                </span>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" />
              <div className="flex w-full flex-col gap-[9px] px-4 pb-[14px] pt-3">
                <p className="w-full text-[10.5px] leading-[16px] text-[#7C9287]">
                  {t('features.warehouse.purchaseHint', { defaultValue: 'Vật tư vào thẳng kho tổng, sau đó phân bổ xuống khu vực.' })}
                </p>
                <span className="flex w-fit items-center gap-[6px] rounded-[8px] bg-[#FBEDEA] px-[9px] py-[7px]">
                  <AlertCircle className="size-[11px] text-[#A33F37]" aria-hidden />
                  <span className="text-[9.5px] font-semibold text-[#A33F37]">
                    {t('features.warehouse.purchaseInvoiceHint', { defaultValue: 'Bắt buộc đính kèm ảnh hoá đơn' })}
                  </span>
                </span>
                {canWrite && seasonId && (
                  <button
                    type="button"
                    onClick={() => setPurchaseOpen(true)}
                    className="flex h-8 w-full items-center justify-center gap-[6px] rounded-[9px] bg-[#0A5C36] transition-colors hover:bg-[#0D7344]"
                  >
                    <ShoppingCart className="size-3 text-[#F2D07A]" aria-hidden />
                    <span className="text-[11px] font-bold text-white">{t('features.warehouse.purchaseBtn')}</span>
                  </button>
                )}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-[8px] overflow-hidden rounded-[14px] bg-[#0A5C36] p-[13px_14px]">
              <div className="absolute left-[180px] top-[-80px] size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]" />
              <span className="relative z-[1] w-fit font-mono text-[9px] font-bold tracking-[1.1px] text-[#F2D07A]">
                {t('features.warehouse.principleHead', { defaultValue: 'Nguyên tắc kho' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
                {t('features.warehouse.principleBody', { defaultValue: 'Mọi vật tư phải vào kho tổng trước khi phân xuống khu, để tồn kho và chứng từ luôn khớp nhau.' })}
              </p>
            </section>
          </div>
        </div>

        {/* 26/11/2026: vật tư Ban phụ trách đã mua (bắt buộc kèm hoá đơn). */}
        {seasonId && purchases.length > 0 ? (
          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="border-b border-[#ECF1E9] px-4 py-[14px]">
              <p className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.warehouse.purchaseRecent')}
              </p>
              <p className="mt-1 text-[10.5px] text-[#8AA298]">{t('features.warehouse.purchaseRecentHint')}</p>
            </div>
            <table className="w-full text-left">
              <thead className="bg-[#F7F9F5]">
                <tr>
                  {[
                    t('features.warehouse.purchaseDate'),
                    t('features.warehouse.purchaseBuyer'),
                    t('features.warehouse.material'),
                    t('features.warehouse.purchaseTotal'),
                    t('features.warehouse.purchaseInvoice'),
                  ].map((label) => (
                    <th key={label} className="px-4 py-[10px] font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.map((receipt) => (
                  <tr key={receipt.id} className="border-t border-[#F0F4EC]">
                    <td className="px-4 py-[11px] font-mono text-[10px] text-[#6B8175]">{receipt.purchaseDate}</td>
                    <td className="px-4 py-[11px]">
                      <span className="text-[11px] font-bold text-[#0B2E1F]">{receipt.buyerName}</span>
                      {receipt.supplierName ? (
                        <span className="block text-[10px] text-[#9AAE9F]">{receipt.supplierName}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-[11px] text-[10.5px] text-[#5C7468]">
                      {receipt.items.map((item) => (
                        <div key={item.materialId}>
                          {item.materialName} × {formatQuantity(item.quantity)} {item.unit}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-[11px] text-right font-mono text-[11px] font-bold text-[#0B2E1F]">
                      {formatVnd(receipt.totalCost)}
                    </td>
                    <td className="px-4 py-[11px] text-center font-mono text-[10px] text-[#8AA298]">
                      {receipt.invoiceFileIds.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {openingOpen && seasonId && (
        <OpeningStockDialog open seasonId={seasonId} previousSeason={previousSeason} onClose={() => setOpeningOpen(false)} />
      )}
      {adjustOpen && seasonId && (
        <AdjustmentDialog open seasonId={seasonId} rows={rows} onClose={() => setAdjustOpen(false)} />
      )}
      {purchaseOpen && seasonId && (
        <ParishPurchaseDialog seasonId={seasonId} onClose={() => setPurchaseOpen(false)} />
      )}
      <HistoryDialog open={Boolean(historyRow)} seasonId={seasonId} row={historyRow} onClose={() => setHistoryRow(null)} />
    </div>
  )
}
