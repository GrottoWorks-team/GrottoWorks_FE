// Minh bạch tiền bạc (26/11/2026): tách "mua vật tư" khỏi "quyên góp".
// Nguồn dữ liệu:
//   - Báo cáo mua sắm: GET /reports/purchases   → totals.actualCost / estimatedApproved
//   - Báo cáo đóng góp: GET /reports/contributions → totals.receivedMoney (tiền đã nhận)
//   - Vật tư người khác tự mua: GET /self-purchases?seasonId= → tổng totalCost
// Trang này KHÔNG trừ quỹ (chưa có sổ quỹ) — chỉ đối chiếu ba con số để thấy tiền đi đâu.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Coins, Info, Receipt, ShoppingCart } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { formatVnd } from '@/lib/format'
import { useSeasons } from '@/features/season/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useOperationalReport } from '@/features/reports/api'
import { useSelfPurchases } from '@/features/materials/selfPurchaseApi'

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

function amount(totals: Record<string, unknown> | undefined, key: string): number {
  const value = totals?.[key]
  return typeof value === 'number' ? value : Number(value ?? 0) || 0
}

export default function FinancePage() {
  const { t } = useTranslation()
  const { seasonId: headerSeasonId } = useSeasonContext()
  const [seasonId, setSeasonId] = useState(headerSeasonId ?? '')
  const { data: seasons = [] } = useSeasons()

  useEffect(() => {
    if (!headerSeasonId) return
    setSeasonId((current) => current || headerSeasonId)
  }, [headerSeasonId])

  useEffect(() => {
    if (seasonId) return
    const fallback = seasons.find((season) => season.status === 'ACTIVE') ?? seasons[0]
    if (fallback) setSeasonId(fallback.id)
  }, [seasonId, seasons])

  const purchases = useOperationalReport('purchases', seasonId || undefined)
  const contributions = useOperationalReport('contributions', seasonId || undefined)
  const selfPurchases = useSelfPurchases({ seasonId: seasonId || undefined, size: 500 }, { enabled: Boolean(seasonId) })

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
    },
    {
      key: 'purchase',
      label: t('features.finance.purchaseActual'),
      value: purchaseActual,
      icon: ShoppingCart,
      hint: t('features.finance.purchaseHint', { estimate: formatVnd(purchaseEstimate) }),
    },
    {
      key: 'self',
      label: t('features.finance.selfPurchase'),
      value: selfPurchaseTotal,
      icon: Receipt,
      hint: t('features.finance.selfPurchaseHint', { count: selfPurchases.data?.length ?? 0 }),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.finance.title')}
        sub={t('features.finance.sub')}
        actions={
          <select className={SELECT_CLS} value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
            <option value="">{t('features.finance.chooseSeason')}</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} ({season.year})
              </option>
            ))}
          </select>
        }
      />

      <div className="flex items-start gap-2 rounded-card border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>{t('features.finance.disclaimer')}</p>
      </div>

      {!seasonId ? (
        <EmptyState text={t('features.finance.chooseSeasonHint')} />
      ) : isError ? (
        <div className="rounded-card border border-border bg-card p-8 text-center text-sm text-destructive">
          <AlertCircle className="mx-auto mb-2 size-8 text-destructive/80" />
          <p>{t('features.finance.loadError')}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              void purchases.refetch()
              void contributions.refetch()
              void selfPurchases.refetch()
            }}
          >
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.key} className="rounded-card border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">{stat.label}</p>
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <p className="tabular mt-2 text-xl font-bold text-foreground">
                    {isLoading ? '—' : formatVnd(stat.value)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
                </div>
              )
            })}
            <div className="rounded-card border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t('features.finance.balance')}
                </p>
              </div>
              <p
                className={`tabular mt-2 text-xl font-bold ${balance < 0 ? 'text-destructive' : 'text-foreground'}`}
              >
                {isLoading ? '—' : formatVnd(balance)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('features.finance.balanceHint')}</p>
            </div>
          </div>

          <div className="rounded-card border border-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">{t('features.finance.selfPurchaseList')}</p>
            {(selfPurchases.data ?? []).length === 0 ? (
              <EmptyState text={t('features.finance.selfPurchaseEmpty')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2">{t('features.selfPurchase.purchaseDate')}</th>
                      <th className="px-2 py-2">{t('features.selfPurchase.buyer')}</th>
                      <th className="px-2 py-2">{t('features.selfPurchase.supplier')}</th>
                      <th className="px-2 py-2 text-right">{t('features.finance.lines')}</th>
                      <th className="px-2 py-2 text-right">{t('features.selfPurchase.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(selfPurchases.data ?? []).map((receipt) => (
                      <tr key={receipt.id}>
                        <td className="tabular px-2 py-2">{receipt.purchaseDate}</td>
                        <td className="px-2 py-2">{receipt.buyerName}</td>
                        <td className="px-2 py-2 text-muted-foreground">{receipt.supplierName ?? '—'}</td>
                        <td className="tabular px-2 py-2 text-right">{receipt.items.length}</td>
                        <td className="tabular px-2 py-2 text-right font-semibold">{formatVnd(receipt.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
