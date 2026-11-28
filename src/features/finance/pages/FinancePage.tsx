// Minh bạch tiền bạc (26/11/2026): tách "mua vật tư" khỏi "quyên góp".
// Nguồn dữ liệu:
//   - Báo cáo mua sắm: GET /reports/purchases   → totals.actualCost / estimatedApproved
//   - Báo cáo đóng góp: GET /reports/contributions → totals.receivedMoney (tiền đã nhận)
//   - Vật tư người khác tự mua: GET /self-purchases?seasonId= → tổng totalCost
// 27/11/2026: thêm lọc theo KHU VỰC — BE nhận `workAreaId` cho cả 2 báo cáo và
// `self-purchases`, nên xem được tiền của từng vùng trong mùa.
// Trang này KHÔNG trừ quỹ (chưa có sổ quỹ) — chỉ đối chiếu ba con số để thấy tiền đi đâu.
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Vật tư — Tài chính mùa".
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, ArrowLeftRight, Coins, FileDown, Info, Receipt, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatVnd } from '@/lib/format'
import { exportCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useSeasonAreas } from '@/features/areas/api'
import { useOperationalReport } from '@/features/reports/api'
import { useSelfPurchases } from '@/features/materials/selfPurchaseApi'

const SELECT_CLS =
  'h-8 rounded-[9px] border border-[#DBE5D6] bg-[#F7F9F5] px-2.5 text-[10.5px] text-[#2C463A] focus-visible:outline-none focus-visible:border-[#0A5C36]'

function amount(totals: Record<string, unknown> | undefined, key: string): number {
  const value = totals?.[key]
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

export default function FinancePage() {
  const { t } = useTranslation()
  const { seasonId: headerSeasonId } = useSeasonContext()
  const [seasonId, setSeasonId] = useState(headerSeasonId ?? '')
  const [workAreaId, setWorkAreaId] = useState('')
  const { data: seasons = [] } = useSeasons()
  const { data: areas = [] } = useSeasonAreas(seasonId || undefined)

  useEffect(() => {
    if (!headerSeasonId) return
    setSeasonId((current) => current || headerSeasonId)
  }, [headerSeasonId])

  // Đổi mùa thì bỏ lọc khu — khu của mùa cũ không còn trong danh sách.
  useEffect(() => {
    setWorkAreaId('')
  }, [seasonId])

  useEffect(() => {
    if (seasonId) return
    const fallback = seasons.find((season) => season.status === 'ACTIVE') ?? seasons[0]
    if (fallback) setSeasonId(fallback.id)
  }, [seasonId, seasons])

  const purchases = useOperationalReport('purchases', seasonId || undefined, workAreaId || undefined)
  const contributions = useOperationalReport('contributions', seasonId || undefined, workAreaId || undefined)
  const selfPurchases = useSelfPurchases(
    { seasonId: seasonId || undefined, workAreaId: workAreaId || undefined, size: 500 },
    { enabled: Boolean(seasonId) },
  )

  const purchaseActual = amount(purchases.data?.totals, 'actualCost')
  const purchaseEstimate = amount(purchases.data?.totals, 'estimatedApproved')
  const donationMoney = amount(contributions.data?.totals, 'receivedMoney')
  const selfPurchaseTotal = useMemo(
    () => (selfPurchases.data ?? []).reduce((sum, receipt) => sum + receipt.totalCost, 0),
    [selfPurchases.data],
  )
  const balance = donationMoney - purchaseActual - selfPurchaseTotal
  const isLoading = purchases.isPending || contributions.isPending || selfPurchases.isPending
  const isError = purchases.isError || contributions.isError || selfPurchases.isError

  const stats = [
    {
      key: 'donation',
      label: t('features.finance.donationMoney'),
      value: donationMoney,
      icon: Coins,
      hint: t('features.finance.donationHint'),
      warn: false,
    },
    {
      key: 'purchase',
      label: t('features.finance.purchaseActual'),
      value: purchaseActual,
      icon: ShoppingCart,
      hint: t('features.finance.purchaseHint', { estimate: formatVnd(purchaseEstimate) }),
      warn: false,
    },
    {
      key: 'self',
      label: t('features.finance.selfPurchase'),
      value: selfPurchaseTotal,
      icon: Receipt,
      hint: t('features.finance.selfPurchaseHint', { count: selfPurchases.data?.length ?? 0 }),
      warn: false,
    },
    {
      key: 'balance',
      label: t('features.finance.balance'),
      value: balance,
      icon: ArrowLeftRight,
      hint: t('features.finance.balanceHint'),
      warn: balance < 0,
    },
  ]

  const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

  const onExport = () => {
    exportCsv(
      'grottoworks-tai-chinh-mua-ngoai-don.csv',
      (selfPurchases.data ?? []).map((receipt) => ({
        [t('features.selfPurchase.purchaseDate')]: receipt.purchaseDate,
        [t('features.selfPurchase.buyer')]: receipt.buyerName,
        [t('features.selfPurchase.supplier')]: receipt.supplierName ?? '',
        [t('features.finance.lines')]: receipt.items.length,
        [t('features.selfPurchase.total')]: receipt.totalCost,
      })),
    )
  }

  return (
    <div>
      <PageHeader
        title={t('features.finance.title')}
        sub={`${t('features.finance.sub')}.`}
        actions={
          <>
            <select
              aria-label={t('features.finance.allAreas')}
              className={SELECT_CLS}
              value={workAreaId}
              disabled={!seasonId || areas.length === 0}
              onChange={(event) => setWorkAreaId(event.target.value)}
            >
              <option value="">{t('features.finance.allAreas')}</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <select
              aria-label={t('features.finance.chooseSeason')}
              className={SELECT_CLS}
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
            >
              <option value="">{t('features.finance.chooseSeason')}</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onExport}
              disabled={!(selfPurchases.data ?? []).length}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
            >
              <FileDown className="size-[13px] text-[#3F7F5B]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.finance.exportCsv', { defaultValue: 'Xuất CSV' })}</span>
            </button>
          </>
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="flex w-full items-start gap-3 rounded-[12px] border border-[#E9EFE6] bg-[#F7F9F5] p-[9px_12px]">
          <Info className="mt-0.5 size-[13px] shrink-0 text-[#7C9287]" aria-hidden />
          <p className="min-w-0 flex-1 text-[10.5px] leading-[16px] text-[#7C9287]">{t('features.finance.disclaimer')}</p>
        </div>

        {!seasonId ? (
          <div className="rounded-[16px] border border-[#E3EAE0] bg-white">
            <EmptyState text={t('features.finance.chooseSeasonHint')} />
          </div>
        ) : isError ? (
          <div className="rounded-[16px] border border-[#E3EAE0] bg-white py-8 text-center">
            <AlertCircle className="mx-auto mb-2 size-8 text-[#B4483F]/80" aria-hidden />
            <p className="text-[11.5px] text-[#B4483F]">{t('features.finance.loadError')}</p>
            <button
              type="button"
              onClick={() => {
                void purchases.refetch()
                void contributions.refetch()
                void selfPurchases.refetch()
              }}
              className="mt-3 text-[11px] font-semibold text-[#0A5C36] hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : (
          <>
            <div className="grid w-full gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <section
                    key={stat.key}
                    className="flex w-full flex-col gap-[9px] rounded-[16px] border border-[#E3EAE0] bg-white p-[15px] shadow-[0px_1px_2px_#06281B0A]"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span
                        className={cn(
                          'grid size-[26px] shrink-0 place-items-center rounded-[8px]',
                          stat.warn ? 'bg-[#F7F4E7]' : 'bg-[#EDF4EA]',
                        )}
                      >
                        <Icon className={cn('size-[13px]', stat.warn ? 'text-[#A8830F]' : 'text-[#3F7F5B]')} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 text-right font-mono text-[8px] font-semibold uppercase leading-[12px] tracking-[0.9px] text-[#97AB9E]">
                        {stat.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'font-mono text-[22px] font-extrabold leading-[24px] tracking-[-0.6px]',
                        stat.key === 'balance' && stat.warn ? 'text-[#A65A12]' : 'text-[#0B2E1F]',
                      )}
                    >
                      {isLoading ? '—' : formatVnd(stat.value)}
                    </span>
                    <span className="w-full truncate text-[10px] leading-[14px] text-[#8AA298]">{stat.hint}</span>
                  </section>
                )
              })}
            </div>

            <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
              <div className="flex w-full items-center justify-between gap-3 px-4 py-[14px]">
                <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.finance.selfPurchaseList')}
                </span>
                <span className="flex w-fit items-center rounded-full bg-[#F7F4E7] px-[9px] py-1 text-[10px] font-bold text-[#8A6412]">
                  {t('features.finance.receiptChip', { defaultValue: '{{count}} phiếu', count: selfPurchases.data?.length ?? 0 })}
                </span>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" />
              <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
                <span className={cn(TH, 'w-[110px] shrink-0')}>{t('features.selfPurchase.purchaseDate')}</span>
                <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.finance.paidBy', { defaultValue: 'Người đã trả tiền' })}</span>
                <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.selfPurchase.supplier')}</span>
                <span className={cn(TH, 'w-[80px] shrink-0 text-right')}>{t('features.finance.lines')}</span>
                <span className={cn(TH, 'w-[130px] shrink-0 text-right')}>{t('features.finance.totalCol', { defaultValue: 'Tổng cộng' })}</span>
              </div>

              {(selfPurchases.data ?? []).length === 0 ? (
                <div className="py-8">
                  <EmptyState text={t('features.finance.selfPurchaseEmpty')} />
                </div>
              ) : (
                <ul className="flex w-full flex-col">
                  {(selfPurchases.data ?? []).map((receipt) => (
                    <li
                      key={receipt.id}
                      className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[12px] last:border-0"
                    >
                      <span className="w-[110px] shrink-0 font-mono text-[10.5px] text-[#5C7468]">{receipt.purchaseDate}</span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[#233A2E]">{receipt.buyerName}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[#5C7468]">{receipt.supplierName ?? '—'}</span>
                      <span className="w-[80px] shrink-0 text-right font-mono text-[11px] text-[#5C7468]">{receipt.items.length}</span>
                      <span className="w-[130px] shrink-0 text-right font-mono text-[11.5px] font-bold text-[#0B2E1F]">
                        {formatVnd(receipt.totalCost)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
                <span className="text-[10.5px] text-[#96AAA0]">
                  {t('features.finance.threeChannels', {
                    defaultValue: 'Ba kênh tách riêng: quyên góp · mua qua đơn · người khác tự mua',
                  })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
