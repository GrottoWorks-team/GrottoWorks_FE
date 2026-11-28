// Sổ quyên góp (/material-officer/donations) — BE Resource `Donation`.
// Cam kết vật tư/tiền + ghi nhận từng lần nhận (số lượng là PHẦN TĂNG) + huỷ có lý do.
// Donor do BE tự gán theo user đăng nhập (VolunteerDonorResolver).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, CheckCheck, ClipboardCheck, Coins, Gift, Hourglass, PencilLine, Plus, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { DonorsDialog } from '@/features/donors/DonorsDialog'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { formatQuantity, formatVnd, MISSING } from '@/lib/format'
import { useCancelDonation, useContributionNeeds, useDonation, useDonations, useRecordDonationReceipt } from '../api'
import { useSeasonContext } from '@/features/season/season-context'
import { AdjustReceiptDialog } from '../AdjustReceiptDialog'
import { DonationFormDialog } from './DonationFormDialog'
import { DirectDonationDialog } from './DirectDonationDialog'
import type { Donation } from '@/types'

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
  const [directOpen, setDirectOpen] = useState(false)
  const [donorsOpen, setDonorsOpen] = useState(false)
  const [recording, setRecording] = useState<Donation | null>(null)
  const [canceling, setCanceling] = useState<Donation | null>(null)
  const [adjusting, setAdjusting] = useState<Donation | null>(null)

  const materialSummary = (d: Donation) =>
    d.type === 'MONEY'
      ? `${t('features.donations.money')} · ${formatVnd(d.pledgedAmount)}`
      : d.items.length
        ? d.items.map((item) => `${item.materialName} (${item.unit})`).join(', ')
        : MISSING

  // "Khu vực nhận" — BE trả `workAreaId`; tên khu lấy từ danh sách khu đã tải.
  const areaNameOf = (d: Donation) =>
    d.workAreaId ? (areas.find((a) => a.id === d.workAreaId)?.name ?? MISSING) : MISSING

  // Pledge KHÔNG phải tiền đã nhận: hai cột tách riêng, thiếu số hiện '—'.
  const pledgedOf = (d: Donation) =>
    d.type === 'MONEY'
      ? formatVnd(d.pledgedAmount)
      : d.items.length
        ? d.items.map((item) => formatQuantity(item.pledgedQuantity, item.unit)).join(' + ')
        : MISSING

  const receivedOf = (d: Donation) =>
    d.type === 'MONEY'
      ? formatVnd(d.receivedAmount)
      : d.items.length
        ? d.items.map((item) => formatQuantity(item.receivedQuantity, item.unit)).join(' + ')
        : MISSING

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreaIds.size) return <EmptyState text={t('features.donations.noArea')} />

  const fullReceived = rows.filter((d) => d.status === 'RECEIVED').length
  const pending = rows.filter((d) => d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED').length
  const totalMoney = rows.reduce((s, d) => s + (d.receivedAmount ?? 0), 0)

  const stats = [
    {
      key: 'total',
      icon: Gift,
      label: t('features.donations.statTotal'),
      value: String(rows.length),
      hint: t('features.donations.statTotalUnit', { defaultValue: 'lượt cam kết' }),
      warn: false,
    },
    {
      key: 'received',
      icon: CheckCheck,
      label: t('features.donations.statReceived'),
      value: String(fullReceived),
      hint: t('features.donations.statReceivedUnit', { defaultValue: 'lượt đã nhận đủ' }),
      warn: false,
    },
    {
      key: 'pending',
      icon: Hourglass,
      label: t('features.donations.statPending'),
      value: String(pending),
      hint: t('features.donations.statPendingUnit', { defaultValue: 'lượt chờ ghi nhận' }),
      warn: pending > 0,
    },
    {
      key: 'money',
      icon: Coins,
      label: t('features.donations.statMoney'),
      value: formatVnd(totalMoney),
      hint: t('features.donations.statMoneyHint', { defaultValue: 'Quy đổi cam kết tiền' }),
      warn: false,
    },
  ]

  const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

  return (
    <div>
      <PageHeader
        title={t('features.donations.title')}
        sub={`${t('features.donations.sub')}.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setDonorsOpen(true)}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
            >
              <Users className="size-[13px] text-[#3F7F5B]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.donations.donors')}</span>
            </button>
            {(user?.role === 'COMMUNITY' || user?.role === 'MATERIAL_OFFICER') && (
              <button
                type="button"
                onClick={() => setDirectOpen(true)}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
              >
                <ClipboardCheck className="size-[13px] text-[#3F7F5B]" aria-hidden />
                <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.donations.directCreate')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
            >
              <Plus className="size-[13px] text-[#F2D07A]" aria-hidden />
              <span className="text-[12px] font-bold text-white">{t('features.donations.create')}</span>
            </button>
          </>
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="grid w-full gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
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
              <span className="font-mono text-[29px] font-extrabold leading-none tracking-[-1px] text-[#0B2E1F]">{value}</span>
              <span className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</span>
            </section>
          ))}
        </div>

        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className="w-full min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-[14px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.donations.listHead', { defaultValue: 'Cam kết quyên góp' })}
              </span>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.donations.countGifts', { defaultValue: '{{count}} lượt', count: rows.length })}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.donor')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.material')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.workArea')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.promised')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.receivedCol')}</span>
              <span className={cn(TH, 'w-[110px] shrink-0')}>{t('common.status')}</span>
              <span className={cn(TH, 'w-[84px] shrink-0 text-right')}>{t('common.actions')}</span>
            </div>

            {isPending ? (
              <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
            ) : rows.length === 0 ? (
              <div className="flex w-full flex-col items-center justify-center gap-[9px] px-4 py-12">
                <Gift className="size-6 text-[#B9C8BE]" aria-hidden />
                <span className="text-[12px] font-semibold text-[#7C9287]">{t('features.donations.empty')}</span>
                <span className="w-full max-w-[320px] text-center text-[10px] leading-[15px] text-[#A3B4A9]">
                  {t('features.donations.emptyHint', { defaultValue: 'Cam kết vật tư hoặc tiền sẽ xuất hiện ở đây khi được ghi nhận.' })}
                </span>
              </div>
            ) : (
              <ul className="flex w-full flex-col">
                {rows.map((donation) => {
                  const canRecord = donation.status === 'PLEDGED' || donation.status === 'PARTIALLY_RECEIVED'
                  const canAdjust = donation.status === 'PARTIALLY_RECEIVED' || donation.status === 'RECEIVED'
                  return (
                    <li
                      key={donation.id}
                      className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#0B2E1F]">
                        {donation.donorName}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#5C7468]">{materialSummary(donation)}</span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#5C7468]">{areaNameOf(donation)}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#5C7468]">{pledgedOf(donation)}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold text-[#0B2E1F]">
                        {receivedOf(donation)}
                      </span>
                      <span className="w-[110px] shrink-0">
                        <StatusTag status={donation.status} />
                      </span>
                      <span className="flex w-[84px] shrink-0 items-center justify-end gap-1">
                        {canRecord && (
                          <button
                            type="button"
                            aria-label={t('features.donations.record')}
                            onClick={() => setRecording(donation)}
                            className="grid size-6 place-items-center rounded-[7px] border border-[#CBE3D2] bg-white text-[#0A5C36] transition-colors hover:bg-[#E9F4EC]"
                          >
                            <ClipboardCheck className="size-3" aria-hidden />
                          </button>
                        )}
                        {canAdjust && (
                          <button
                            type="button"
                            aria-label={t('features.donations.adjust')}
                            onClick={() => setAdjusting(donation)}
                            className="grid size-6 place-items-center rounded-[7px] border border-[#E7EEE3] bg-white text-[#6B8175] transition-colors hover:bg-[#F7F9F5]"
                          >
                            <PencilLine className="size-3" aria-hidden />
                          </button>
                        )}
                        {canRecord && (
                          <button
                            type="button"
                            aria-label={t('features.donations.cancel')}
                            onClick={() => setCanceling(donation)}
                            className="grid size-6 place-items-center rounded-[7px] border border-[#EFCFC7] bg-white text-[#A33F37] transition-colors hover:bg-[#FBEDEA]"
                          >
                            <Ban className="size-3" aria-hidden />
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
                {t('features.donations.footHint', { defaultValue: 'Ghi nhận khi quà thực sự về đến khu' })}
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
            <section className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex w-full items-center px-4 py-[14px]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.donations.needsTitle')}
                </span>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" />
              <div className="flex w-full flex-col gap-2 p-3">
                <span className="text-[10px] text-[#A3B4A9]">
                  {t('features.donations.needsHint', { defaultValue: 'Cần quyên góp để đủ vật tư thi công' })}
                </span>
                {needs.length === 0 ? (
                  <span className="py-4 text-center text-[10.5px] text-[#A3B4A9]">{t('features.donations.needsEmpty', { defaultValue: 'Không còn thiếu vật tư nào.' })}</span>
                ) : (
                  needs.slice(0, 4).map((need) => (
                    <div
                      key={`${need.workAreaId}-${need.materialId}`}
                      className="flex w-full flex-col gap-1 rounded-[10px] border border-[#EDE6D6] bg-[#FBFAF6] p-[9px_11px]"
                    >
                      <span className="text-[11.5px] font-bold text-[#0B2E1F]">{need.materialName}</span>
                      <span className="truncate text-[9.5px] text-[#A3B4A9]">· {need.workAreaName}</span>
                      <span className="flex w-fit items-center rounded-full bg-[#FDF0EC] px-2 py-[3px] text-[9.5px] font-semibold text-[#A33F37]">
                        {t('features.donations.needRemaining', { need: need.remainingNeed, unit: need.unit })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] p-[13px_14px]">
              <div className="absolute left-[180px] top-[-80px] size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]" />
              <span className="relative z-[1] w-fit font-mono text-[9px] font-bold tracking-[1.1px] text-[#F2D07A]">
                {t('features.donations.recordHintHead', { defaultValue: 'Ghi nhận quyên góp' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
                {t('features.donations.recordHintBody', { defaultValue: 'Chỉ ghi nhận khi quà thực sự về đến khu. Cam kết chưa nhận sẽ nằm ở trạng thái Chờ ghi nhận.' })}
              </p>
            </section>
          </div>
        </div>
      </div>

      {creating && <DonationFormDialog open onClose={() => setCreating(false)} />}
      {directOpen && <DirectDonationDialog onClose={() => setDirectOpen(false)} />}
      {recording && <ReceiptDialog donation={recording} onClose={() => setRecording(null)} />}
      {canceling && <CancelDialog donation={canceling} onClose={() => setCanceling(null)} />}
      {adjusting && <AdjustReceiptDialog donation={adjusting} onClose={() => setAdjusting(null)} />}
      {donorsOpen && <DonorsDialog open onClose={() => setDonorsOpen(false)} />}
    </div>
  )
}
