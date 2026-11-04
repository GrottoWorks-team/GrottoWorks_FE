// Sổ quyên góp (/material-officer/donations) — BE Resource `Donation`.
// Cam kết vật tư/tiền + ghi nhận từng lần nhận (số lượng là PHẦN TĂNG) + huỷ có lý do.
// Donor do BE tự gán theo user đăng nhập (VolunteerDonorResolver).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, ClipboardCheck, Download, PencilLine, Plus, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { DonorsDialog } from '@/features/donors/DonorsDialog'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import i18n from '@/lib/i18n'
import { useCancelDonation, useContributionNeeds, useDonation, useDonations, useRecordDonationReceipt } from '../api'
import { useSeasonContext } from '@/features/season/season-context'
import { AdjustReceiptDialog } from '../AdjustReceiptDialog'
import { DonationFormDialog } from './DonationFormDialog'
import type { Donation } from '@/types'

const fmt = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')

function ReceiptDialog({ donation, onClose }: { donation: Donation; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordDonationReceipt()
  // Lấy lại bản ghi mới nhất trước khi ghi nhận (danh sách có thể đã cũ).
  const { data: fresh } = useDonation(donation.id)
  const current = fresh ?? donation
  const outstandingOf = (i: Donation['items'][number]) => Math.max(0, i.pledgedQuantity - i.receivedQuantity)

  const [lines, setLines] = useState<Record<string, { qty: string; unusable: string }>>(() =>
    Object.fromEntries(
      donation.items.map((item) => [item.id, { qty: String(outstandingOf(item) || ''), unusable: '0' }]),
    ),
  )
  const [amount, setAmount] = useState(String(donation.pledgedAmount ?? donation.receivedAmount ?? ''))
  const [note, setNote] = useState('')

  const onSubmit = async () => {
    try {
      if (donation.type === 'MONEY') {
        await record.mutateAsync({ donationId: donation.id, amount: Number(amount), note: note || undefined })
      } else {
        const items = Object.entries(lines)
          .map(([donationItemId, line]) => ({
            donationItemId,
            receivedQuantity: Number(line.qty),
            unusableQuantity: Number(line.unusable) || 0,
          }))
          .filter((line) => line.receivedQuantity > 0)
        if (!items.length) {
          toast(t('features.donations.receiptEmpty'), 'alert')
          return
        }
        await record.mutateAsync({ donationId: donation.id, items, note: note || undefined })
      }
      toast(t('features.donations.recorded'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.donations.recordTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={record.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm">
          <span className="font-semibold text-foreground">{donation.donorName}</span> —{' '}
          {current.type === 'MONEY'
            ? t('features.donations.money')
            : current.items.map((i) => i.materialName).join(', ')}
        </p>
        {current.type === 'MONEY' ? (
          <div>
            <Label htmlFor="receipt-amount">{t('features.donations.receiveNow')}</Label>
            <Input
              id="receipt-amount"
              type="number"
              min={1}
              step={1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {current.items.map((item) => (
              <div key={item.id} className="rounded-md border border-border/60 p-3">
                <p className="text-sm font-semibold text-foreground">
                  {item.materialName}{' '}
                  <span className="text-xs font-normal text-muted-foreground">({item.unit})</span>
                </p>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t('features.donations.progressOf', {
                    received: item.receivedQuantity,
                    pledged: item.pledgedQuantity,
                  })}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`receipt-${item.id}`}>{t('features.donations.receiveNow')}</Label>
                    <Input
                      id={`receipt-${item.id}`}
                      type="number"
                      min={0}
                      step={1}
                      value={lines[item.id]?.qty ?? ''}
                      onChange={(e) =>
                        setLines((prev) => ({ ...prev, [item.id]: { ...prev[item.id], qty: e.target.value } }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`unusable-${item.id}`}>{t('features.donations.unusableQty')}</Label>
                    <Input
                      id={`unusable-${item.id}`}
                      type="number"
                      min={0}
                      step={1}
                      value={lines[item.id]?.unusable ?? '0'}
                      onChange={(e) =>
                        setLines((prev) => ({ ...prev, [item.id]: { ...prev[item.id], unusable: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div>
          <Label htmlFor="receipt-note">{t('features.donations.note')}</Label>
          <Input id="receipt-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}

function CancelDialog({ donation, onClose }: { donation: Donation; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const cancel = useCancelDonation()
  const [reason, setReason] = useState('')

  const onSubmit = async () => {
    if (!reason.trim()) {
      toast(t('features.donations.cancelReasonRequired'), 'alert')
      return
    }
    try {
      await cancel.mutateAsync({ id: donation.id, reason: reason.trim() })
      toast(t('features.donations.canceled'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.donations.cancelTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={onSubmit} disabled={cancel.isPending}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        {t('features.donations.cancelConfirm', { name: donation.donorName })}
      </p>
      <Label htmlFor="cancel-reason">{t('features.donations.cancelReason')}</Label>
      <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Dialog>
  )
}

export default function DonationListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useScopedAreas()
  const { data: donations = [], isPending } = useDonations()
  const { seasonId } = useSeasonContext()
  const { data: needs = [] } = useContributionNeeds(seasonId ?? undefined)

  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreaIds = useMemo(
    () => new Set(isOfficer ? areas.filter((a) => a.officerId === user.id).map((a) => a.id) : []),
    [areas, isOfficer, user],
  )
  const rows = useMemo(
    () =>
      isOfficer
        ? donations.filter((d) => d.type === 'MONEY' || (d.workAreaId ? myAreaIds.has(d.workAreaId) : false))
        : donations,
    [donations, isOfficer, myAreaIds],
  )

  const [creating, setCreating] = useState(false)
  const [donorsOpen, setDonorsOpen] = useState(false)
  const [recording, setRecording] = useState<Donation | null>(null)
  const [canceling, setCanceling] = useState<Donation | null>(null)
  const [adjusting, setAdjusting] = useState<Donation | null>(null)

  const materialSummary = (d: Donation) =>
    d.type === 'MONEY'
      ? `${t('features.donations.money')} · ${fmt(d.pledgedAmount ?? 0)} ₫`
      : d.items.map((item) => `${item.materialName} (${item.unit})`).join(', ')

  const pledgedOf = (d: Donation) =>
    d.type === 'MONEY'
      ? `${fmt(d.pledgedAmount ?? 0)} ₫`
      : d.items.map((item) => `${item.pledgedQuantity} ${item.unit}`).join(' + ')

  const receivedOf = (d: Donation) =>
    d.type === 'MONEY'
      ? `${fmt(d.receivedAmount ?? 0)} ₫`
      : d.items.map((item) => `${item.receivedQuantity} ${item.unit}`).join(' + ')

  const columns = useMemo(
    () => [
      {
        key: 'donorName',
        header: t('features.donations.donor'),
        render: (d: Donation) => <span className="font-semibold text-foreground">{d.donorName}</span>,
      },
      { key: 'material', header: t('features.donations.material'), render: materialSummary },
      {
        key: 'promised',
        header: t('features.donations.promised'),
        align: 'right' as const,
        render: (d: Donation) => <span className="tabular">{pledgedOf(d)}</span>,
      },
      {
        key: 'received',
        header: t('features.donations.receivedCol'),
        align: 'right' as const,
        render: (d: Donation) => <span className="tabular">{receivedOf(d)}</span>,
      },
      { key: 'status', header: t('common.status'), render: (d: Donation) => <StatusTag status={d.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (d: Donation) =>
          d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED' ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.donations.record')}
                onClick={() => setRecording(d)}
              >
                <ClipboardCheck className="size-4" />
              </Button>
              {d.status === 'PARTIALLY_RECEIVED' && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('features.donations.adjust')}
                  onClick={() => setAdjusting(d)}
                >
                  <PencilLine className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.donations.cancel')}
                onClick={() => setCanceling(d)}
              >
                <Ban className="size-4" />
              </Button>
            </div>
          ) : d.status === 'RECEIVED' ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.donations.adjust')}
                onClick={() => setAdjusting(d)}
              >
                <PencilLine className="size-4" />
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const onExport = () => {
    exportCsv(
      'grottoworks-quyen-gop.csv',
      rows.map((d) => ({
        [t('features.donations.donor')]: d.donorName,
        [t('features.donations.material')]: materialSummary(d),
        [t('features.donations.promised')]: pledgedOf(d),
        [t('features.donations.receivedCol')]: receivedOf(d),
        [t('common.status')]: t(`status.${d.status}`),
      })),
    )
    toast(t('features.donations.exported'))
  }

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreaIds.size) return <EmptyState text={t('features.donations.noArea')} />

  const fullReceived = rows.filter((d) => d.status === 'RECEIVED').length
  const pending = rows.filter((d) => d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED').length
  const totalMoney = rows.reduce((s, d) => s + (d.receivedAmount ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={t('features.donations.title')}
        sub={t('features.donations.sub')}
        actions={
          <>
            <Button variant="outline" onClick={() => setDonorsOpen(true)}>
              <Users className="size-4" />
              {t('features.donations.donors')}
            </Button>
            <Button variant="outline" onClick={onExport} disabled={!rows.length}>
              <Download className="size-4" />
              {t('features.donations.export')}
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('features.donations.create')}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label={t('features.donations.statTotal')} value={rows.length} unit={t('features.donations.statTotalUnit')} />
        <StatCard label={t('features.donations.statReceived')} value={fullReceived} unit={t('features.donations.statReceivedUnit')} tone="ok" />
        <StatCard label={t('features.donations.statPending')} value={pending} unit={t('features.donations.statPendingUnit')} />
        <StatCard label={t('features.donations.statMoney')} value={fmt(totalMoney)} unit="₫" tone="ok" />
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={rows} columns={columns} emptyText={t('features.donations.empty')} />
      )}

      {needs.length > 0 && (
        <Card className="mt-6 p-5">
          <p className="lbl-mono mb-3">{t('features.donations.needsTitle')}</p>
          <ul className="space-y-1.5">
            {needs.slice(0, 8).map((need) => (
              <li
                key={`${need.workAreaId}-${need.materialId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{need.materialName}</span>
                  <span className="text-muted-foreground"> · {need.workAreaName}</span>
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {t('features.donations.needRemaining', {
                    need: need.remainingNeed,
                    unit: need.unit,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {creating && <DonationFormDialog open onClose={() => setCreating(false)} />}
      {recording && <ReceiptDialog donation={recording} onClose={() => setRecording(null)} />}
      {canceling && <CancelDialog donation={canceling} onClose={() => setCanceling(null)} />}
      {adjusting && <AdjustReceiptDialog donation={adjusting} onClose={() => setAdjusting(null)} />}
      {donorsOpen && <DonorsDialog open onClose={() => setDonorsOpen(false)} />}
    </div>
  )
}