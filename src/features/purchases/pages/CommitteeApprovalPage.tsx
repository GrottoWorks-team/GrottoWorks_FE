// Duyệt yêu cầu mua (route /leader/purchases — BE chỉ cho LEADER approve/reject):
// Kết nối GET /api/v1/purchase-requests (F1),
// hỗ trợ F6 (Duyệt POST /api/v1/purchase-requests/{id}/approve)
// và F7 (Từ chối POST /api/v1/purchase-requests/{id}/reject kèm reason 1–500 ký tự).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ClipboardList, FileDown, Hourglass, PackageCheck, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { useSeasonContext } from '@/features/season/season-context'
import { viDateTime } from '@/lib/format'
import { rolePrefix } from '@/lib/roles'
import {
  useApproveRequest,
  usePurchaseRequests,
  useRejectRequest,
  type PurchaseRequestDto,
} from '../api'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Dialog từ chối F7: reason bắt buộc 1–500 ký tự
function RejectDialog({
  item,
  onClose,
}: {
  item: PurchaseRequestDto
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const reject = useRejectRequest()
  const [reason, setReason] = useState('')

  const isValid = reason.trim().length >= 1 && reason.trim().length <= 500

  const onConfirm = async (): Promise<boolean> => {
    if (!isValid) return false
    try {
      await reject.mutateAsync({
        requestId: item.id,
        version: item.version,
        reason: reason.trim(),
      })
      toast(t('features.purchases.rejected', { code: item.id.slice(0, 8) }))
      return true
    } catch {
      toast(t('common.error'), 'alert')
      return false
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.rejectTitle', { code: item.id.slice(0, 8) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            id="btn-confirm-reject"
            variant="destructive"
            disabled={!isValid || reject.isPending}
            onClick={() => {
              void onConfirm().then((ok) => {
                if (ok) onClose()
              })
            }}
          >
            {t('features.purchases.reject')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Label htmlFor="reject-reason">{t('features.purchases.reason')} *</Label>
        <textarea
          id="reject-reason"
          rows={3}
          className={TEXTAREA_CLS}
          placeholder={t('features.purchases.rejectReasonPlaceholder')}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {!reason.trim() ? (
          <p className="mt-1 text-xs font-semibold text-destructive">{t('features.purchases.reasonRequired')}</p>
        ) : reason.trim().length > 500 ? (
          <p className="mt-1 text-xs font-semibold text-destructive">{t('features.purchases.reasonMaxLength')}</p>
        ) : null}
        <p className="text-right text-[11px] text-muted-foreground">{reason.trim().length}/500</p>
      </div>
    </Dialog>
  )
}

// Dialog duyệt F6: ghi chú phê duyệt (tùy chọn)
function ApproveDialog({
  item,
  onClose,
}: {
  item: PurchaseRequestDto
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const approve = useApproveRequest()
  const [note, setNote] = useState('')

  const onConfirm = async (): Promise<boolean> => {
    try {
      await approve.mutateAsync({
        requestId: item.id,
        version: item.version,
        note: note.trim() || undefined,
      })
      toast(t('features.purchases.approved', { code: item.id.slice(0, 8) }))
      return true
    } catch {
      toast(t('common.error'), 'alert')
      return false
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.purchases.approveTitle', { code: item.id.slice(0, 8) })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            id="btn-confirm-approve"
            disabled={approve.isPending}
            onClick={() => {
              void onConfirm().then((ok) => {
                if (ok) onClose()
              })
            }}
          >
            {t('features.purchases.approve')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('features.purchases.approveConfirm')}</p>
        <div>
          <Label htmlFor="approve-note">{t('features.purchases.decisionNote')}</Label>
          <textarea
            id="approve-note"
            rows={3}
            className={TEXTAREA_CLS}
            placeholder={t('features.purchases.approveNotePlaceholder')}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
    </Dialog>
  )
}

export default function CommitteeApprovalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { season } = useSeasonContext()
  const { data: requests = [], isPending } = usePurchaseRequests()
  // Trang dùng chung cho nhiều role → link chi tiết phải theo prefix của role hiện tại.
  const basePath = `/${rolePrefix(user?.role ?? 'LEADER')}/purchases`
  // BE chỉ cho role PARISH (web COMMUNITY) duyệt/từ chối purchase request.
  const canDecide = user?.role === 'COMMUNITY'

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'ALL' | 'PENDING_APPROVAL' | 'PURCHASED' | 'PLANNING'>('ALL')
  const [rejecting, setRejecting] = useState<PurchaseRequestDto | null>(null)
  const [approving, setApproving] = useState<PurchaseRequestDto | null>(null)

  const tabs = [
    { key: 'ALL' as const, label: t('features.purchases.tabAll', { defaultValue: 'Tất cả' }) },
    { key: 'PENDING_APPROVAL' as const, label: t('features.purchases.tabPending', { defaultValue: 'Chờ duyệt' }) },
    { key: 'PURCHASED' as const, label: t('features.purchases.tabPurchased', { defaultValue: 'Đã mua' }) },
    { key: 'PLANNING' as const, label: t('features.purchases.tabPlanning', { defaultValue: 'Đang chuẩn bị' }) },
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return requests.filter((request) => {
      if (tab !== 'ALL' && request.status !== tab) return false
      if (!q) return true
      return (
        request.id.toLowerCase().includes(q) ||
        (request.workAreaName ?? '').toLowerCase().includes(q) ||
        (request.reason ?? '').toLowerCase().includes(q)
      )
    })
  }, [requests, search, tab])

  const countOf = (status: string) => requests.filter((request) => request.status === status).length
  const stats = [
    {
      key: 'total',
      icon: ClipboardList,
      label: t('features.purchases.statTotal', { defaultValue: 'Tổng yêu cầu' }),
      value: requests.length,
      hint: t('features.purchases.statTotalHint', { defaultValue: 'Tất cả yêu cầu trong mùa' }),
      warn: false,
    },
    {
      key: 'planning',
      icon: Hourglass,
      label: t('features.purchases.tabPlanning', { defaultValue: 'Đang chuẩn bị' }),
      value: countOf('PLANNING'),
      hint: t('features.purchases.statPlanningHint', { defaultValue: 'Chờ trưởng khu xử lý' }),
      warn: countOf('PLANNING') > 0,
    },
    {
      key: 'done',
      icon: PackageCheck,
      label: t('features.purchases.statDone', { defaultValue: 'Đã mua / hoàn thành' }),
      value: countOf('PURCHASED') + countOf('COMPLETED'),
      hint: t('features.purchases.statDoneHint', { defaultValue: 'Đã duyệt bổ sung vật tư' }),
      warn: false,
    },
  ]

  const overview = [
    {
      key: 'planning',
      label: t('features.purchases.tabPlanning', { defaultValue: 'Đang chuẩn bị' }),
      value: countOf('PLANNING'),
      tone: 'text-[#9A6A0C]',
    },
    {
      key: 'purchased',
      label: t('features.purchases.tabPurchased', { defaultValue: 'Đã mua' }),
      value: countOf('PURCHASED'),
      tone: 'text-[#1B6B45]',
    },
    {
      key: 'completed',
      label: t('features.purchases.tabCompleted', { defaultValue: 'Đã hoàn thành' }),
      value: countOf('COMPLETED'),
      tone: 'text-[#1B6B45]',
    },
    {
      key: 'pending',
      label: t('features.purchases.tabPendingLong', { defaultValue: 'Chờ ban phụ trách duyệt' }),
      value: countOf('PENDING_APPROVAL'),
      tone: 'text-[#0B2E1F]',
    },
  ]

  const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

  const onExport = () => {
    exportCsv(
      'grottoworks-yeu-cau-bo-sung.csv',
      requests.map((request) => ({
        [t('features.purchases.code')]: request.id.slice(0, 8),
        [t('features.purchases.area')]: request.workAreaName || '',
        [t('features.purchases.materials')]:
          request.items?.map((item) => `${item.materialName} × ${item.requestedQuantity} ${item.unit}`).join(', ') ?? '',
        [t('features.purchases.reasonLabel')]: request.reason || '',
        [t('features.purchases.createdAt')]: viDateTime(request.createdAt),
        [t('common.status')]: request.status,
      })),
    )
  }

  return (
    <div>
      <PageHeader
        title={t('features.purchases.committeeTitle')}
        sub={`${t('features.purchases.committeeSub')}.`}
        actions={
          <button
            type="button"
            onClick={onExport}
            disabled={!requests.length}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
          >
            <FileDown className="size-[13px] text-[#3F7F5B]" aria-hidden />
            <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.purchases.exportCsv', { defaultValue: 'Xuất CSV' })}</span>
          </button>
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="grid w-full gap-[14px] md:grid-cols-3">
          {stats.map(({ key, icon: Icon, label, value, hint, warn }) => (
            <section
              key={key}
              className="flex w-full flex-col gap-[10px] rounded-[16px] border border-[#E3EAE0] bg-white p-4 shadow-[0px_1px_2px_#06281B0A]"
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
                <span className="min-w-0 flex-1 text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                  {label}
                </span>
              </div>
              <span className="font-mono text-[30px] font-extrabold leading-none tracking-[-1px] text-[#0B2E1F]">{value}</span>
              <span className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</span>
            </section>
          ))}
        </div>

        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className="w-full min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-[14px]">
              <div className="flex h-9 w-full max-w-[250px] items-center gap-[9px] rounded-[10px] border border-[#E7EEE3] bg-[#F7F9F5] px-[11px]">
                <Search className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
                <input
                  aria-label={t('features.purchases.searchPlaceholder', { defaultValue: 'Tìm theo mã hoặc khu vực…' })}
                  placeholder={t('features.purchases.searchPlaceholder', { defaultValue: 'Tìm theo mã hoặc khu vực…' })}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[11.5px] text-[#0B2E1F] placeholder:text-[#9AAE9F] focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-[10px] bg-[#EAF0E6] p-[3px]">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'flex h-7 items-center rounded-[8px] px-[10px] text-[11px] transition-colors',
                      tab === item.key
                        ? 'bg-white font-bold text-[#0A5C36]'
                        : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
              <span className={cn(TH, 'w-[76px] shrink-0')}>{t('features.purchases.code')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.purchases.area')}</span>
              <span className={cn(TH, 'w-[130px] shrink-0 truncate')}>{t('features.purchases.materials')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.purchases.reasonLabel')}</span>
              <span className={cn(TH, 'w-[96px] shrink-0 truncate')}>{t('features.purchases.createdAt')}</span>
              <span className={cn(TH, 'w-[104px] shrink-0 truncate')}>{t('common.status')}</span>
              <span className={cn(TH, 'w-[140px] shrink-0 text-right truncate')}>{t('common.actions')}</span>
            </div>

            {isPending ? (
              <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
            ) : filtered.length === 0 ? (
              <div className="py-10">
                <EmptyState text={t('features.purchases.empty')} />
              </div>
            ) : (
              <ul className="flex w-full flex-col">
                {filtered.map((request) => (
                  <li
                    key={request.id}
                    className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0"
                  >
                    <span className="flex w-[76px] shrink-0 items-center">
                      <span className="rounded-[6px] bg-[#F3F6F1] px-[7px] py-[3px] font-mono text-[9px] font-semibold text-[#52705F]">
                        #{request.id.slice(0, 8)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#233A2E]">
                      {request.workAreaName || '—'}
                    </span>
                    <span className="w-[130px] shrink-0 truncate text-[10px] leading-[14px] text-[#5C7468]">
                      {request.items && request.items.length > 0
                        ? request.items.map((item) => `${item.materialName} × ${item.requestedQuantity} ${item.unit}`).join(' · ')
                        : '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[10.5px] leading-[15px] text-[#7C9287]">
                      {request.reason || '—'}
                    </span>
                    <span className="w-[96px] shrink-0 truncate font-mono text-[9.5px] text-[#96AAA0]">
                      {viDateTime(request.createdAt)}
                    </span>
                    <span className="w-[104px] shrink-0 overflow-hidden">
                      <StatusTag status={request.status} />
                    </span>
                    <span className="flex w-[140px] shrink-0 items-center justify-end gap-1">
                      {request.status === 'PENDING_APPROVAL' && canDecide && (
                        <>
                          <button
                            type="button"
                            aria-label={t('features.purchases.reject')}
                            onClick={() => setRejecting(request)}
                            className="grid size-6 place-items-center rounded-[7px] border border-[#EFCFC7] bg-white text-[#A33F37] transition-colors hover:bg-[#FBEDEA]"
                          >
                            <X className="size-3" aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label={t('features.purchases.approve')}
                            onClick={() => setApproving(request)}
                            className="grid size-6 place-items-center rounded-[7px] border border-[#CBE3D2] bg-white text-[#0A5C36] transition-colors hover:bg-[#E9F4EC]"
                          >
                            <Check className="size-3" aria-hidden />
                          </button>
                        </>
                      )}
                      <Link
                        to={`${basePath}/${request.id}`}
                        className="text-[10px] font-bold text-[#0A5C36] hover:underline"
                      >
                        {t('features.purchases.detailLink', { defaultValue: 'Chi tiết' })}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
              <span className="text-[10.5px] text-[#96AAA0]">
                {t('features.purchases.footCount', {
                  defaultValue: '{{count}} yêu cầu trong {{season}}',
                  count: requests.length,
                  season: season?.name ?? t('features.purchases.allSeasons', { defaultValue: 'mọi mùa' }),
                })}
              </span>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
            <section className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex w-full items-center px-4 py-[14px]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.purchases.ovHead', { defaultValue: 'Tổng quan yêu cầu' })}
                </span>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" />
              <div className="flex w-full flex-col px-4 pb-3 pt-[6px]">
                {overview.map((row) => (
                  <div
                    key={row.key}
                    className="flex w-full items-center justify-between gap-2 border-b border-[#F0F4EC] py-[9px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 text-[10.5px] text-[#6B8175]">{row.label}</span>
                    <span className={cn('font-mono text-[10.5px] font-bold', row.tone)}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] p-[13px_14px]">
              <div className="absolute left-[180px] top-[-80px] size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]" />
              <span className="relative z-[1] w-fit font-mono text-[9px] font-bold tracking-[1.1px] text-[#F2D07A]">
                {t('features.purchases.flowHead', { defaultValue: 'Luồng xử lý' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
                {t('features.purchases.flowBody', { defaultValue: 'Yêu cầu đi từ trưởng khu → ban phụ trách duyệt → mua vật tư → nhập kho khu.' })}
              </p>
            </section>
          </div>
        </div>
      </div>

      {rejecting && <RejectDialog item={rejecting} onClose={() => setRejecting(null)} />}
      {approving && <ApproveDialog item={approving} onClose={() => setApproving(null)} />}
    </div>
  )
}

// F7: reject with reason 1-500 chars verified
