// Kho tổng giáo xứ (/community/warehouse) — BE role PARISH quản lý, ADMIN chỉ đọc.
// Tồn kho tổng tách khỏi tồn khu; MO không thấy màn này.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, History, Package, Plus, ShoppingCart, SlidersHorizontal, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { formatQuantity, formatVnd, viDateTime } from '@/lib/format'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useMaterialCatalog } from '@/features/materials/api'
import type { Season } from '@/types'
import {
  useAdjustParishInventory,
  useParishInventory,
  useParishMaterialHistory,
  useParishPurchases,
  useRecordParishOpeningStock,
  type ParishInventoryBalanceDto,
  type ParishInventoryTransactionDto,
} from '../api'
import { ParishPurchaseDialog } from './ParishPurchaseDialog'

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

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
  const [page, setPage] = useState(1)
  const pageSize = 15

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
    page,
    size: pageSize,
  })

  // 26/11/2026: các biên lai "vật tư Ban phụ trách đã mua" gần nhất của mùa.
  const { data: purchases = [] } = useParishPurchases(seasonId)

  const rows = inventory?.data ?? []
  const pageInfo = inventory?.page ?? { page: 1, size: pageSize, totalItems: 0, totalPages: 1 }
  const canWrite = user?.role === 'COMMUNITY'
  const totalAvailable = useMemo(() => rows.reduce((sum, row) => sum + row.confirmedAvailable, 0), [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.warehouse.title')}
        sub={t('features.warehouse.sub')}
        actions={
          canWrite && seasonId ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setAdjustOpen(true)} className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                {t('features.warehouse.adjustBtn')}
              </Button>
              <Button variant="outline" onClick={() => setOpeningOpen(true)} className="flex items-center gap-2">
                <Plus className="size-4" />
                {t('features.warehouse.openingBtn')}
              </Button>
              <Button onClick={() => setPurchaseOpen(true)} className="flex items-center gap-2">
                <ShoppingCart className="size-4" />
                {t('features.warehouse.purchaseBtn')}
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-3">
        <select
          className={SELECT_CLS}
          value={seasonId}
          onChange={(event) => {
            setSeasonId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{t('features.warehouse.selectSeason')}</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name} ({season.year})
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLS}
          value={materialId}
          onChange={(event) => {
            setMaterialId(event.target.value)
            setPage(1)
          }}
        >
          <option value="">{t('features.warehouse.allMaterials')}</option>
          {catalog.map((material) => (
            <option key={material.id} value={material.id}>
              {material.code} - {material.name}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {t('features.warehouse.totalAvailable', { quantity: formatQuantity(totalAvailable) })}
        </span>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-card">
        {!seasonId ? (
          <EmptyState text={t('features.warehouse.selectSeason')} />
        ) : isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            <AlertCircle className="mx-auto mb-2 size-8 text-destructive/80" />
            <p>{t('features.warehouse.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              {t('common.retry')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text={t('features.warehouse.empty')} />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t('features.warehouse.material')}</th>
                  <th className="px-4 py-3 text-center">{t('features.warehouse.unit')}</th>
                  <th className="px-4 py-3 text-right">{t('features.warehouse.available')}</th>
                  <th className="px-4 py-3 text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.materialId} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="size-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{row.materialName}</span>
                          <span className="font-mono text-xs text-muted-foreground">{row.materialCode}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.unit}</td>
                    <td className="px-4 py-3 text-right font-mono tabular font-medium text-foreground">
                      {formatQuantity(row.confirmedAvailable)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setHistoryRow(row)} className="h-8 gap-1.5 px-2 text-xs">
                        <History className="size-3.5" />
                        {t('features.warehouse.history')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {t('features.warehouse.paginationInfo', {
                  from: (pageInfo.page - 1) * pageInfo.size + 1,
                  to: Math.min(pageInfo.page * pageInfo.size, pageInfo.totalItems),
                  total: pageInfo.totalItems,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pageInfo.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                  ‹
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {pageInfo.page}/{pageInfo.totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={pageInfo.page >= pageInfo.totalPages} onClick={() => setPage((value) => value + 1)}>
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 26/11/2026: vật tư Ban phụ trách đã mua (bắt buộc kèm hoá đơn). */}
      {seasonId && purchases.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{t('features.warehouse.purchaseRecent')}</p>
            <p className="text-xs text-muted-foreground">{t('features.warehouse.purchaseRecentHint')}</p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">{t('features.warehouse.purchaseDate')}</th>
                <th className="px-4 py-2.5">{t('features.warehouse.purchaseBuyer')}</th>
                <th className="px-4 py-2.5">{t('features.warehouse.material')}</th>
                <th className="px-4 py-2.5 text-right">{t('features.warehouse.purchaseTotal')}</th>
                <th className="px-4 py-2.5 text-center">{t('features.warehouse.purchaseInvoice')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchases.map((receipt) => (
                <tr key={receipt.id}>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{receipt.purchaseDate}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-foreground">{receipt.buyerName}</span>
                    {receipt.supplierName ? (
                      <span className="block text-xs text-muted-foreground">{receipt.supplierName}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {receipt.items.map((item) => (
                      <div key={item.materialId}>
                        {item.materialName} × {formatQuantity(item.quantity)} {item.unit}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular font-medium">
                    {formatVnd(receipt.totalCost)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                    {receipt.invoiceFileIds.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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
