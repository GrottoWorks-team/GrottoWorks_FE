import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Gift, Layers } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { exportCsv } from '@/lib/csv'
import { useDonations, useContributionNeeds } from '../api'
import { useSeasons } from '@/features/season/api'
import type { Donation, ContributionNeedDto } from '@/types'

const SELECT_CLS =
  'h-9 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function DonationListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'donations' | 'needs'>('donations')

  // Donations data
  const { data: donations = [], isPending } = useDonations()

  // Seasons & Contribution needs data (GET /api/v1/seasons/{id}/contribution-needs)
  const { data: seasons = [] } = useSeasons()
  const activeSeason = seasons.find((s) => s.status === 'ACTIVE') ?? seasons[0] ?? null
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const currentSeasonId = selectedSeasonId || activeSeason?.id || ''
  const { data: needs = [], isPending: needsPending } = useContributionNeeds(
    activeTab === 'needs' ? currentSeasonId : undefined,
  )

  const totalCount = donations.length
  const receivedCount = donations.filter((d) => d.status === 'RECEIVED').length
  const pendingCount = donations.filter(
    (d) => d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED',
  ).length
  const totalMoney = donations
    .filter((d) => d.type === 'MONEY')
    .reduce((sum, d) => sum + (d.receivedAmount?.amount ?? d.pledgedAmount?.amount ?? 0), 0)

  const columns: Column<Donation>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('features.donations.date'),
        render: (d) => (
          <span className="font-mono text-xs text-muted-foreground">
            {d.donationDate ? new Date(d.donationDate).toLocaleDateString('vi-VN') : '—'}
          </span>
        ),
      },
      {
        key: 'donor',
        header: t('features.donations.donor'),
        render: (d) => <span className="font-medium text-foreground">{d.donorName}</span>,
      },
      {
        key: 'type',
        header: t('features.donations.kind'),
        render: (d) =>
          d.type === 'MONEY' ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {t('features.donations.money')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              {t('features.donations.material')}
            </span>
          ),
      },
      {
        key: 'detail',
        header: t('features.donations.detail'),
        render: (d) => {
          if (d.type === 'MONEY') {
            const received = d.receivedAmount?.amount
            const pledged = d.pledgedAmount?.amount
            if (received != null) {
              return (
                <span className="font-semibold text-foreground">
                  {Number(received).toLocaleString('vi-VN')} ₫
                </span>
              )
            }
            if (pledged != null) {
              return (
                <span className="text-muted-foreground">
                  {Number(pledged).toLocaleString('vi-VN')} ₫ ({t('features.donations.promised')})
                </span>
              )
            }
            return <span className="text-muted-foreground">—</span>
          }
          if (d.items && d.items.length > 0) {
            return (
              <div className="space-y-0.5">
                {d.items.map((item) => (
                  <div key={item.id} className="text-sm">
                    <span className="font-medium text-foreground">{item.materialName}</span>
                    <span className="ml-1 text-muted-foreground">
                      ({Number(item.usableQuantity || item.receivedQuantity || item.pledgedQuantity || 0).toLocaleString('vi-VN')} {item.unit})
                    </span>
                    {item.note && (
                      <span className="ml-1 text-xs italic text-muted-foreground">
                        ({item.note})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          }
          return <span className="text-muted-foreground">—</span>
        },
      },
      {
        key: 'note',
        header: t('features.donations.note'),
        render: (d) => <span className="text-sm text-muted-foreground">{d.note || '—'}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (d) => <StatusTag status={d.status} />,
      },
    ],
    [t],
  )

  const needColumns: Column<ContributionNeedDto>[] = useMemo(
    () => [
      {
        key: 'material',
        header: t('features.materials.name', { defaultValue: 'Vật tư' }),
        render: (need: ContributionNeedDto) => (
          <div>
            <span className="font-semibold">{need.materialName}</span>
            {need.materialCode && (
              <p className="font-mono text-xs text-muted-foreground">{need.materialCode}</p>
            )}
          </div>
        ),
      },
      {
        key: 'workArea',
        header: t('features.tasks.area', { defaultValue: 'Khu vực' }),
        render: (need: ContributionNeedDto) => <span>{need.workAreaName}</span>,
      },
      {
        key: 'kind',
        header: t('features.donations.kind', { defaultValue: 'Phân loại' }),
        render: (need: ContributionNeedDto) => (
          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            {need.kind}
          </span>
        ),
      },
      {
        key: 'required',
        header: t('features.materials.required', { defaultValue: 'Nhu cầu' }),
        align: 'right' as const,
        render: (need: ContributionNeedDto) => (
          <span className="tabular">
            {need.required} {need.unit}
          </span>
        ),
      },
      {
        key: 'shortage',
        header: t('features.materials.shortage', { defaultValue: 'Thiếu hụt' }),
        align: 'right' as const,
        render: (need: ContributionNeedDto) => (
          <span className={`tabular font-bold ${need.shortage > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
            {need.shortage} {need.unit}
          </span>
        ),
      },
      {
        key: 'pledged',
        header: t('features.donations.promised', { defaultValue: 'Đã cam kết' }),
        align: 'right' as const,
        render: (need: ContributionNeedDto) => (
          <span className="tabular">
            {need.pledgedOutstanding} {need.unit}
          </span>
        ),
      },
      {
        key: 'remainingNeed',
        header: t('features.donations.remainingNeed', { defaultValue: 'Còn cần' }),
        align: 'right' as const,
        render: (need: ContributionNeedDto) => (
          <span className={`tabular font-bold ${need.remainingNeed > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
            {need.remainingNeed} {need.unit}
          </span>
        ),
      },
    ],
    [t],
  )

  const onExport = () => {
    exportCsv(
      'so-quyen-gop.csv',
      donations.map((d) => ({
        [t('features.donations.date')]: d.donationDate
          ? new Date(d.donationDate).toLocaleDateString('vi-VN')
          : '',
        [t('features.donations.donor')]: d.donorName,
        [t('features.donations.kind')]:
          d.type === 'MONEY' ? t('features.donations.money') : t('features.donations.material'),
        [t('features.donations.detail')]:
          d.type === 'MONEY'
            ? `${d.receivedAmount?.amount ?? d.pledgedAmount?.amount ?? 0} ₫`
            : (d.items || [])
                .map(
                  (i) =>
                    `${i.materialName} (${i.usableQuantity || i.receivedQuantity || i.pledgedQuantity || 0} ${i.unit})`,
                )
                .join('; '),
        [t('common.status')]: t(`status.${d.status}`),
        [t('features.donations.note')]: d.note ?? '',
      })),
    )
    toast(t('features.donations.exported'))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.donations.title')}
        sub={t('features.donations.sub')}
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'needs' && seasons.length > 1 && (
              <select
                aria-label={t('features.season.name')}
                value={currentSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
                className={SELECT_CLS}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.year})
                  </option>
                ))}
              </select>
            )}
            {activeTab === 'donations' && (
              <Button variant="outline" onClick={onExport} disabled={!donations.length}>
                <Download className="size-4" />
                {t('features.donations.export')}
              </Button>
            )}
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('donations')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'donations'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Gift className="size-4" />
          {t('features.donations.tabDonations', { defaultValue: 'Danh sách quyên góp' })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('needs')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'needs'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="size-4" />
          {t('features.donations.tabNeeds', { defaultValue: 'Nhu cầu đóng góp mùa vụ' })}
        </button>
      </div>

      {activeTab === 'donations' ? (
        <>
          {/* 4 StatCards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label={t('features.donations.statTotal')}
              value={totalCount}
              unit={t('features.donations.unitTimes')}
            />
            <StatCard
              label={t('features.donations.statReceived')}
              value={receivedCount}
              unit={t('features.donations.unitTimes')}
              tone="ok"
            />
            <StatCard
              label={t('features.donations.statPending')}
              value={pendingCount}
              unit={t('features.donations.unitTimes')}
              tone={pendingCount > 0 ? 'warn' : 'ok'}
            />
            <StatCard
              label={t('features.donations.statMoney')}
              value={totalMoney}
              unit="₫"
              tone="ok"
            />
          </div>

          {isPending ? (
            <p className="lbl-mono">{t('common.loading')}</p>
          ) : (
            <DataTable
              rows={donations}
              columns={columns}
              searchKeys={['donorName', 'note']}
              filters={[
                {
                  key: 'status',
                  options: ['PLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
                },
              ]}
              emptyText={t('features.donations.empty')}
            />
          )}
        </>
      ) : (
        <>
          {/* Contribution Needs StatCards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={t('features.donations.statNeedsTotal', { defaultValue: 'Mặt hàng cần quyên góp' })}
              value={needs.length}
            />
            <StatCard
              label={t('features.donations.statNeedsShortage', { defaultValue: 'Mặt hàng còn thiếu' })}
              value={needs.filter((n) => n.remainingNeed > 0).length}
              tone={needs.filter((n) => n.remainingNeed > 0).length > 0 ? 'warn' : 'ok'}
            />
            <StatCard
              label={t('features.donations.statNeedsPledged', { defaultValue: 'Đã có cam kết' })}
              value={needs.filter((n) => n.pledgedOutstanding > 0).length}
              tone="ok"
            />
          </div>

          {needsPending ? (
            <p className="lbl-mono">{t('common.loading')}</p>
          ) : (
            <DataTable
              rows={needs}
              columns={needColumns}
              searchKeys={['materialName', 'materialCode', 'workAreaName']}
              emptyText={t('features.donations.noNeeds', {
                defaultValue: 'Hiện chưa có nhu cầu đóng góp nào cho mùa vụ (BE trả rỗng)',
              })}
            />
          )}
        </>
      )}
    </div>
  )
}
