// Phiếu phân xuống kho tổng → khu (/community/warehouse/distributions, /material-officer/distributions).
// PARISH (web COMMUNITY) tạo/huỷ; MO của khu đích xác nhận số nhận được.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, PackageCheck, Plus, XCircle } from 'lucide-react'
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

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const INPUT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface LineState {
  materialId: string
  quantity: string
}

function CreateDialog({ seasonId, onClose }: { seasonId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateParishDistribution()
  const { data: areas = [] } = useAreas([seasonId])
  const { data: inventory } = useParishInventory({ seasonId, size: 100 })
  const stock = inventory?.data ?? []

  const [targetWorkAreaId, setTargetWorkAreaId] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<LineState[]>([{ materialId: '', quantity: '1' }])

  const available = useMemo(
    () => new Map(stock.map((row) => [row.materialId, row])),
    [stock],
  )

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
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t('features.warehouse.createDistribution')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={create.isPending || !targetWorkAreaId}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="distribution-area">{t('features.warehouse.targetArea')}</Label>
          <select
            id="distribution-area"
            className={INPUT_CLS}
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

        <div className="space-y-2">
          <Label>{t('features.warehouse.lines')}</Label>
          {lines.map((line, index) => {
            const selected = available.get(line.materialId)
            return (
              <div key={index} className="flex items-end gap-2">
                <select
                  className={SELECT_CLS + ' h-10 flex-1'}
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
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selected?.confirmedAvailable}
                  value={line.quantity}
                  onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  className="w-28"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
                >
                  {t('common.remove')}
                </Button>
              </div>
            )
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { materialId: '', quantity: '1' }])}
          >
            <Plus className="size-4" />
            {t('features.warehouse.addLine')}
          </Button>
        </div>

        <div>
          <Label htmlFor="distribution-note">{t('features.warehouse.note')}</Label>
          <Textarea id="distribution-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
    </Dialog>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.warehouse.distributionTitle')}
        sub={t('features.warehouse.distributionSub')}
        actions={
          isParish && seasonId ? (
            <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
              <Plus className="size-4" />
              {t('features.warehouse.createDistribution')}
            </Button>
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
          <option value="">{t('features.warehouse.allSeasons')}</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name} ({season.year})
            </option>
          ))}
        </select>
        <select
          className={SELECT_CLS}
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

      <div className="overflow-hidden rounded-card border border-border bg-card">
        {isPending ? (
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
          <EmptyState text={t('features.warehouse.distributionEmpty')} />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t('features.warehouse.issuedAt')}</th>
                  <th className="px-4 py-3">{t('features.warehouse.targetArea')}</th>
                  <th className="px-4 py-3">{t('features.warehouse.lines')}</th>
                  <th className="px-4 py-3">{t('common.status')}</th>
                  <th className="px-4 py-3 text-center">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((distribution) => (
                  <tr key={distribution.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{viDateTime(distribution.issuedAt)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{distribution.targetWorkAreaName}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {distribution.items.map((item) => (
                          <span key={item.id}>
                            {item.materialName}: {formatQuantity(item.issuedQuantity)} {item.unit}
                            {item.receivedUsableQuantity !== null && (
                              <span className="ml-1 text-emerald-600">
                                ({t('features.warehouse.receivedUsable')} {formatQuantity(item.receivedUsableQuantity)})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusTag status={distribution.status} />
                      {distribution.origin === 'PURCHASE' && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t('features.warehouse.originPurchase')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isOfficer && distribution.status === 'IN_TRANSIT' && (
                          <Button variant="outline" size="sm" onClick={() => setConfirmTarget(distribution)} className="h-8 gap-1.5 text-xs">
                            <PackageCheck className="size-3.5" />
                            {t('features.warehouse.receive')}
                          </Button>
                        )}
                        {isParish && distribution.status === 'IN_TRANSIT' && (
                          <Button variant="ghost" size="sm" onClick={() => setCancelTarget(distribution)} className="h-8 gap-1.5 text-xs text-destructive">
                            <XCircle className="size-3.5" />
                            {t('features.warehouse.cancel')}
                          </Button>
                        )}
                      </div>
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

      {createOpen && seasonId && <CreateDialog seasonId={seasonId} onClose={() => setCreateOpen(false)} />}
      {confirmTarget && <ConfirmDialog distribution={confirmTarget} onClose={() => setConfirmTarget(null)} />}
      {cancelTarget && <CancelDialog distribution={cancelTarget} onClose={() => setCancelTarget(null)} />}
    </div>
  )
}
