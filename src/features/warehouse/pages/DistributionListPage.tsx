// Phiếu phân xuống kho tổng → khu (/community/distributions, /material-officer/distributions).
// PARISH (web COMMUNITY) tạo/huỷ; MO của khu đích xác nhận số nhận được.
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Mùa — Phiếu Phân Xuống (Tạo phiếu)".
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Boxes, PackageCheck, Plus, Trash2, X, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { formatQuantity, viDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useAreas } from '@/features/areas/api'
import {
  useCancelParishDistribution,
  useConfirmParishDistribution,
  useCreateParishDistribution,
  useParishDistributions,
  useParishInventory,
  type ParishDistributionDto,
  type ParishDistributionStatus,
} from '../api'

const FIELD =
  'flex h-[38px] w-full items-center rounded-[10px] border border-[#DBE5D6] bg-white px-3 text-[12px] font-semibold text-[#0B2E1F] focus-visible:outline-none focus-visible:border-[#0A5C36]'
const LBL = 'font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'
const SEG = 'h-[28px] rounded-[8px] px-[10px] text-[11px]'
const CELL = 'font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

interface LineState {
  materialId: string
  quantity: string
}

function CreateDrawer({ seasonId, onClose }: { seasonId: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateParishDistribution()
  const { data: areas = [] } = useAreas([seasonId])
  const { data: inventory } = useParishInventory({ seasonId, size: 100 })
  const stock = inventory?.data ?? []

  const [targetWorkAreaId, setTargetWorkAreaId] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineState[]>([{ materialId: '', quantity: '1' }])

  const available = useMemo(() => new Map(stock.map((row) => [row.materialId, row])), [stock])

  const updateLine = (index: number, patch: Partial<LineState>) =>
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)))

  const submit = async () => {
    try {
      await create.mutateAsync({
        seasonId,
        targetWorkAreaId,
        note: note.trim() || null,
        items: lines
          .filter((line) => line.materialId)
          .map((line) => ({ materialId: line.materialId, quantity: Number(line.quantity) })),
      })
      toast(t('features.warehouse.distributionCreated'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label={t('common.cancel')} className="absolute inset-0 bg-[#06281B66]" onClick={onClose} />
      <section className="relative flex h-full w-full max-w-[520px] flex-col overflow-hidden border-l border-[#E3EAE0] bg-white shadow-[-12px_0px_36px_#06281B33]">
        <header className="flex w-full items-center justify-between px-[22px] py-[18px]">
          <div className="flex flex-col gap-[3px]">
            <span className={LBL}>{t('features.warehouse.createDistribution')}</span>
            <span className="text-[16px] font-extrabold tracking-[-0.4px] text-[#0B2E1F]">
              {t('features.warehouse.createDistributionTitle', { defaultValue: 'Phiếu phân xuống mới' })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="grid size-[30px] place-items-center rounded-[9px] bg-[#F4F6F1] text-[#6B8175] transition-colors hover:bg-[#EAF0E6]"
          >
            <X className="size-[14px]" aria-hidden />
          </button>
        </header>
        <div className="h-px w-full bg-[#E3EAE0]" />

        <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto p-[18px_22px]">
          <div className="flex flex-col gap-[5px]">
            <span className={LBL}>{t('features.warehouse.targetArea')}</span>
            <select
              aria-label={t('features.warehouse.targetArea')}
              className={FIELD}
              value={targetWorkAreaId}
              onChange={(event) => setTargetWorkAreaId(event.target.value)}
            >
              <option value="">{t('features.warehouse.selectArea')}</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center justify-between">
              <span className={LBL}>{t('features.warehouse.lines')}</span>
              <span className="font-mono text-[8.5px] text-[#A3B4A9]">
                {t('features.warehouse.lineCount', { defaultValue: '{{count}} dòng', count: lines.length })}
              </span>
            </div>
            {lines.map((line, index) => {
              const selected = available.get(line.materialId)
              return (
                <div key={index} className="flex w-full items-end gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {index === 0 && <span className="font-mono text-[8px] font-semibold tracking-[0.9px] text-[#A3B4A9]">{t('features.warehouse.material').toUpperCase()}</span>}
                    <select
                      aria-label={t('features.warehouse.material')}
                      className={cn(FIELD, 'h-[34px] rounded-[9px] text-[11px]')}
                      value={line.materialId}
                      onChange={(event) => updateLine(index, { materialId: event.target.value })}
                    >
                      <option value="">{t('features.warehouse.selectMaterial')}</option>
                      {stock.map((row) => (
                        <option key={row.materialId} value={row.materialId}>
                          {row.materialCode} - {row.materialName} ({formatQuantity(row.confirmedAvailable)} {row.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex w-[110px] shrink-0 flex-col gap-1">
                    {index === 0 && <span className="font-mono text-[8px] font-semibold tracking-[0.9px] text-[#A3B4A9]">{t('features.warehouse.quantity').toUpperCase()}</span>}
                    <Input
                      aria-label={`quantity-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={selected?.confirmedAvailable}
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      className="h-[34px] rounded-[9px] border-[#DBE5D6] bg-white px-[11px] font-mono text-[11px] font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={t('common.remove')}
                    disabled={lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
                    className="grid size-[30px] h-8 shrink-0 place-items-center rounded-[8px] bg-[#FBEDEA] text-[#A33F37] transition-colors hover:bg-[#F7DFD9] disabled:opacity-45"
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => setLines((current) => [...current, { materialId: '', quantity: '1' }])}
              className="flex h-8 w-full items-center justify-center gap-[6px] rounded-[9px] border border-[#C9DCC9] bg-white text-[10.5px] font-bold text-[#0A5C36] transition-colors hover:bg-[#F4F8F1]"
            >
              <Plus className="size-3" aria-hidden />
              {t('features.warehouse.addLine')}
            </button>
          </div>

          <div className="flex flex-col gap-[5px]">
            <span className={LBL}>{t('features.warehouse.note')}</span>
            <textarea
              aria-label={t('features.warehouse.note')}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[76px] w-full rounded-[10px] border border-[#DBE5D6] bg-white p-[10px_12px] text-[11px] leading-[17px] text-[#0B2E1F] focus-visible:outline-none focus-visible:border-[#0A5C36]"
            />
          </div>

          <div className="flex w-full items-start gap-[9px] rounded-[12px] border border-[#EDD9A6] bg-[#F7F4E7] p-[11px_13px]">
            <Boxes className="mt-0.5 size-[14px] shrink-0 text-[#9A6A0C]" aria-hidden />
            <p className="min-w-0 flex-1 text-[10px] leading-[16px] text-[#9A6A0C]">
              {t('features.warehouse.createHint', { defaultValue: 'Tồn kho tổng sẽ trừ ngay khi lưu; khu nhận xác nhận số thực nhận sau đó.' })}
            </p>
          </div>
        </div>

        <footer className="flex w-full items-center justify-end gap-[9px] border-t border-[#E3EAE0] px-[22px] py-[14px]">
          <button
            type="button"
            onClick={onClose}
            className="flex h-[38px] items-center rounded-[10px] border border-[#DBE5D6] bg-white px-4 text-[12px] font-semibold text-[#5C7468] transition-colors hover:bg-[#F4F8F1]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={create.isPending || !targetWorkAreaId}
            className="flex h-[38px] items-center gap-[7px] rounded-[10px] bg-[#0A5C36] px-[18px] text-[12px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
          >
            {t('features.warehouse.saveDistribution', { defaultValue: 'Lưu phiếu' })}
          </button>
        </footer>
      </section>
    </div>
  )
}

function ConfirmDialog({ distribution, onClose }: { distribution: ParishDistributionDto; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const confirm = useConfirmParishDistribution()
  const [lines, setLines] = useState<Record<string, { usable: string; unusable: string }>>(() =>
    Object.fromEntries(
      distribution.items.map((item) => [item.id, { usable: String(item.issuedQuantity), unusable: '0' }]),
    ),
  )

  const submit = async () => {
    try {
      await confirm.mutateAsync({
        distributionId: distribution.id,
        version: distribution.version,
        items: distribution.items.map((item) => ({
          itemId: item.id,
          usableQuantity: Number(lines[item.id]?.usable ?? 0),
          unusableQuantity: Number(lines[item.id]?.unusable ?? 0),
        })),
      })
      toast(t('features.warehouse.distributionConfirmed'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t('features.warehouse.confirmDistribution')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={confirm.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {t('features.warehouse.confirmHint', { area: distribution.targetWorkAreaName })}
        </p>
        {distribution.items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_100px_100px] items-end gap-2">
            <div className="text-sm">
              <p className="font-medium text-foreground">{item.materialName}</p>
              <p className="text-xs text-muted-foreground">
                {formatQuantity(item.issuedQuantity)} {item.unit}
              </p>
            </div>
            <div>
              <Label htmlFor={`usable-${item.id}`}>{t('features.warehouse.usable')}</Label>
              <Input
                id={`usable-${item.id}`}
                type="number"
                min="0"
                step="0.01"
                value={lines[item.id]?.usable ?? ''}
                onChange={(event) =>
                  setLines((current) => ({ ...current, [item.id]: { ...current[item.id], usable: event.target.value } }))
                }
              />
            </div>
            <div>
              <Label htmlFor={`unusable-${item.id}`}>{t('features.warehouse.unusable')}</Label>
              <Input
                id={`unusable-${item.id}`}
                type="number"
                min="0"
                step="0.01"
                value={lines[item.id]?.unusable ?? ''}
                onChange={(event) =>
                  setLines((current) => ({ ...current, [item.id]: { ...current[item.id], unusable: event.target.value } }))
                }
              />
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function CancelDialog({ distribution, onClose }: { distribution: ParishDistributionDto; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const cancel = useCancelParishDistribution()
  const [reason, setReason] = useState('')

  const submit = async () => {
    try {
      await cancel.mutateAsync({ distributionId: distribution.id, version: distribution.version, reason: reason.trim() })
      toast(t('features.warehouse.distributionCancelled'))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.warehouse.cancelDistribution')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={cancel.isPending || !reason.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div>
        <Label htmlFor="cancel-reason">{t('features.warehouse.reason')}</Label>
        <Textarea id="cancel-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
    </Dialog>
  )
}

export default function DistributionListPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { seasonId: headerSeasonId } = useSeasonContext()
  const { data: seasons = [] } = useSeasons()
  const [seasonId, setSeasonId] = useState(headerSeasonId ?? seasons[0]?.id ?? '')
  const [status, setStatus] = useState<ParishDistributionStatus | ''>('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [createOpen, setCreateOpen] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ParishDistributionDto | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ParishDistributionDto | null>(null)

  const { data, isPending, isError, refetch } = useParishDistributions({
    seasonId: seasonId || undefined,
    status: status || undefined,
    page,
    size: pageSize,
  })

  const rows = data?.data ?? []
  const pageInfo = data?.page ?? { page: 1, size: pageSize, totalItems: 0, totalPages: 1 }
  const isParish = user?.role === 'COMMUNITY'
  const isOfficer = user?.role === 'MATERIAL_OFFICER'

  const receivedCount = rows.filter((row) => row.status === 'RECEIVED').length
  const waitingCount = rows.filter((row) => row.status === 'IN_TRANSIT').length
  const issuedQty = rows.reduce(
    (sum, row) => sum + row.items.reduce((lineSum, item) => lineSum + item.issuedQuantity, 0),
    0,
  )

  const overview = [
    {
      key: 'total',
      label: t('features.warehouse.ovTotal', { defaultValue: 'Phiếu trong mùa' }),
      value: pageInfo.totalItems,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'received',
      label: t('features.warehouse.ovReceived', { defaultValue: 'Đã tiếp nhận' }),
      value: receivedCount,
      tone: 'text-[#1B6B45]',
    },
    {
      key: 'waiting',
      label: t('features.warehouse.ovWaiting', { defaultValue: 'Chờ xác nhận' }),
      value: waitingCount,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'quantity',
      label: t('features.warehouse.ovQuantity', { defaultValue: 'Vật tư đã xuất' }),
      value: formatQuantity(issuedQty),
      tone: 'text-[#0B2E1F]',
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.warehouse.distributionTitle')}
        sub={`${t('features.warehouse.distributionSub')}.`}
        actions={
          isParish && seasonId ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-3 transition-colors hover:bg-[#0D7344]"
            >
              <Plus className="size-[13px] text-[#F2D07A]" aria-hidden />
              <span className="text-[12px] font-bold text-white">{t('features.warehouse.createDistribution')}</span>
            </button>
          ) : undefined
        }
      />

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        <div className="w-full min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-[14px]">
            <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.warehouse.distributionHead', { defaultValue: 'Danh sách phiếu phân xuống' })}
            </span>
            <div className="flex items-center gap-2">
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.warehouse.distributionChip', { defaultValue: '{{count}} phiếu', count: pageInfo.totalItems })}
              </span>
              <select
                aria-label={t('features.warehouse.allSeasons')}
                className="h-[26px] rounded-[8px] border border-[#E7EEE3] bg-[#F7F9F5] px-2 text-[10px] text-[#6B8175]"
                value={seasonId}
                onChange={(event) => {
                  setSeasonId(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('features.warehouse.allSeasons')}</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.year})
                  </option>
                ))}
              </select>
              <select
                aria-label={t('features.warehouse.allStatuses')}
                className="h-[26px] rounded-[8px] border border-[#E7EEE3] bg-[#F7F9F5] px-2 text-[10px] text-[#6B8175]"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ParishDistributionStatus | '')
                  setPage(1)
                }}
              >
                <option value="">{t('features.warehouse.allStatuses')}</option>
                <option value="IN_TRANSIT">{t('features.warehouse.status.IN_TRANSIT')}</option>
                <option value="RECEIVED">{t('features.warehouse.status.RECEIVED')}</option>
                <option value="CANCELLED">{t('features.warehouse.status.CANCELLED')}</option>
              </select>
            </div>
          </div>
          <div className="h-px w-full bg-[#ECF1E9]" />
          <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
            <span className={cn(CELL, 'w-[100px] shrink-0 truncate')}>{t('features.warehouse.issuedAt')}</span>
            <span className={cn(CELL, 'w-[150px] shrink-0 truncate')}>{t('features.warehouse.targetArea')}</span>
            <span className={cn(CELL, 'min-w-0 flex-1')}>{t('features.warehouse.lines')}</span>
            <span className={cn(CELL, 'w-[100px] shrink-0 truncate')}>
              {t('features.warehouse.origin', { defaultValue: 'Nguồn' })}
            </span>
            <span className={cn(CELL, 'w-[110px] shrink-0 truncate')}>{t('common.status')}</span>
            <span className={cn(CELL, 'w-[88px] shrink-0 text-right truncate')}>{t('common.actions')}</span>
          </div>

          {isPending ? (
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
            <EmptyState text={t('features.warehouse.distributionEmpty')} />
          ) : (
            <ul className="flex w-full flex-col">
              {rows.map((distribution) => {
                const issued = viDateTime(distribution.issuedAt)
                const tokens = issued.split(' ')
                const date = tokens.find((token) => token.includes('/')) ?? issued
                const time = tokens.find((token) => !token.includes('/')) ?? ''
                return (
                  <li
                    key={distribution.id}
                    className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[12px] last:border-0"
                  >
                    <div className="flex w-[100px] shrink-0 flex-col gap-px">
                      <span className="font-mono text-[10.5px] font-semibold text-[#233A2E]">{date}</span>
                      <span className="font-mono text-[9px] text-[#A3B4A9]">{time ?? ''}</span>
                    </div>
                    <span className="w-[150px] shrink-0 truncate text-[11.5px] font-bold text-[#0B2E1F]">
                      {distribution.targetWorkAreaName}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      {distribution.items.map((item) => (
                        <span key={item.id} className="flex items-center gap-[6px] text-[10.5px] text-[#5C7468]">
                          <PackageCheck className="size-[10px] shrink-0 text-[#7FA391]" aria-hidden />
                          <span className="truncate">
                            {item.materialName}: {formatQuantity(item.issuedQuantity)} {item.unit}
                            {item.receivedUsableQuantity !== null && (
                              <> · {t('features.warehouse.receivedUsable')} {formatQuantity(item.receivedUsableQuantity)}</>
                            )}
                          </span>
                        </span>
                      ))}
                    </div>
                    <span className="w-[100px] shrink-0">
                      <span className="inline-flex items-center rounded-full border border-[#E3EAE0] bg-[#F1F4EF] px-2 py-[3px] text-[9.5px] font-semibold capitalize text-[#6B8175]">
                        {distribution.origin === 'PURCHASE'
                          ? t('features.warehouse.originPurchase')
                          : t('features.warehouse.originManual', { defaultValue: 'Thủ công' })}
                      </span>
                    </span>
                    <span className="w-[110px] shrink-0 overflow-hidden">
                      <StatusTag status={distribution.status} />
                    </span>
                    <span className="flex w-[88px] shrink-0 items-center justify-end gap-1">
                      {isOfficer && distribution.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          onClick={() => setConfirmTarget(distribution)}
                          className="flex h-7 items-center gap-1 rounded-[8px] border border-[#C9DCC9] bg-white px-2 text-[10px] font-bold text-[#0A5C36] transition-colors hover:bg-[#F4F8F1]"
                        >
                          <PackageCheck className="size-3" aria-hidden />
                          {t('features.warehouse.receive')}
                        </button>
                      )}
                      {isParish && distribution.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          onClick={() => setCancelTarget(distribution)}
                          className="flex h-7 items-center gap-1 rounded-[8px] px-2 text-[10px] font-bold text-[#A33F37] transition-colors hover:bg-[#FBEDEA]"
                        >
                          <XCircle className="size-3" aria-hidden />
                          {t('features.warehouse.cancel')}
                        </button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
            <span className="text-[10.5px] text-[#96AAA0]">
              {t('features.warehouse.paginationInfo', {
                from: (pageInfo.page - 1) * pageInfo.size + 1,
                to: Math.min(pageInfo.page * pageInfo.size, pageInfo.totalItems),
                total: pageInfo.totalItems,
              })}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t('common.previous', { defaultValue: 'Trang trước' })}
                disabled={pageInfo.page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className={cn(SEG, 'border border-[#E7EEE3] bg-white text-[#6B8175] disabled:opacity-45')}
              >
                ‹
              </button>
              <span className="px-2 font-mono text-[10px] font-bold text-[#0B2E1F]">
                {pageInfo.page}/{pageInfo.totalPages}
              </span>
              <button
                type="button"
                aria-label={t('common.next', { defaultValue: 'Trang sau' })}
                disabled={pageInfo.page >= pageInfo.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className={cn(SEG, 'border border-[#E7EEE3] bg-white text-[#6B8175] disabled:opacity-45')}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
          <section className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center px-[15px] py-[13px]">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.warehouse.ovHead', { defaultValue: 'Tổng quan phân xuống' })}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="flex w-full flex-col px-[15px] pb-[11px] pt-[5px]">
              {overview.map((row) => (
                <div
                  key={row.key}
                  className="flex w-full items-center justify-between border-b border-[#F0F4EC] py-2 last:border-0"
                >
                  <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                  <span className={cn('font-mono text-[10.5px] font-bold', row.tone)}>{row.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex w-full flex-col gap-[7px] overflow-hidden rounded-[16px] bg-[#06281B] p-[15px]">
            <div className="absolute left-[170px] top-[-50px] size-[150px] rounded-full bg-[#0E7A4633] blur-[20px]" />
            <span className="relative z-[1] w-fit font-mono text-[8.5px] font-bold tracking-[1.1px] text-[#F2D07A]">
              {t('features.warehouse.principleHead', { defaultValue: 'Nguyên tắc kho' })}
            </span>
            <p className="relative z-[2] w-full text-[10.5px] leading-[17px] text-[#CFE0D4]">
              {t('features.warehouse.principleBody', { defaultValue: 'Mọi vật tư phải vào kho tổng trước khi phân xuống khu, để tồn kho và chứng từ luôn khớp nhau.' })}
            </p>
          </section>
        </div>
      </div>

      {createOpen && seasonId && <CreateDrawer seasonId={seasonId} onClose={() => setCreateOpen(false)} />}
      {confirmTarget && <ConfirmDialog distribution={confirmTarget} onClose={() => setConfirmTarget(null)} />}
      {cancelTarget && <CancelDialog distribution={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  )
}
