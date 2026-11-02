import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { exportCsv } from '@/lib/csv'
import { useDonations } from '../api'
import type { Donation } from '@/types'

export default function DonationListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: donations = [], isPending } = useDonations()

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
          <Button variant="outline" onClick={onExport} disabled={!donations.length}>
            <Download className="size-4" />
            {t('features.donations.export')}
          </Button>
        }
      />

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
    </div>
  )
}
