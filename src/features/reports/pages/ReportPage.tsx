// Trang báo cáo tổng kết (route /community/reports) — 4 bảng tổng kết
// (chi phí, quyên góp, giờ công, nhiệm vụ hoàn thành) + Bảng vinh danh
// RecognitionBoard. Mỗi bảng có nút "Xuất CSV" dùng exportCsv có sẵn
// (src/lib/csv.ts — BOM + ';' cho Excel vi). Tổng hợp client-side.
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { exportCsv } from '@/lib/csv'
import { viDate } from '@/lib/format'
import { useReportData } from '../api'
import { RecognitionBoard } from '../components/RecognitionBoard'
import type { ContributorRow } from '../api'

// Tiêu đề khối bảng: label + nút Xuất CSV (disabled khi hết dữ liệu).
function Section({
  title,
  count,
  onExport,
  children,
  index,
}: {
  title: string
  count: number
  onExport: () => void
  children: React.ReactNode
  index: number
}) {
  const { t } = useTranslation()
  return (
    <section className="mt-8" style={{ '--d': index } as CSSProperties} data-g-item>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold tracking-tight text-foreground">
          {title}
          <span className="lbl-mono ml-2">{t('common.total', { n: count })}</span>
        </h2>
        <Button variant="outline" size="sm" onClick={onExport} disabled={!count}>
          <Download className="size-4" />
          {t('features.reports.export')}
        </Button>
      </div>
      {children}
    </section>
  )
}

export default function ReportPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isPending } = useReportData()

  // Lookup name: material, user, community — Map để O(1) khi join hàng nghìn dòng.
  const lookups = useMemo(() => {
    const material = new Map((data?.materials ?? []).map((m) => [m.id, m]))
    const user = new Map((data?.users ?? []).map((u) => [u.id, u]))
    const community = new Map((data?.communities ?? []).map((c) => [c.id, c.name]))
    const area = new Map((data?.areas ?? []).map((a) => [a.id, a.name]))
    return { material, user, community, area }
  }, [data])

  const onExported = (label: string) => toast(t('features.reports.exported', { label }))

  // — Bảng 1: chi phí (purchaseRecords đã duyệt/mua).
  const purchaseRows = useMemo(
    () =>
      (data?.purchaseRecords ?? []).map((p) => ({
        id: p.id,
        material: lookups.material.get(p.materialId)?.name ?? p.materialId,
        qty: p.qty,
        cost: p.cost,
        supplier: p.supplier,
        date: p.date,
        buyer: lookups.user.get(p.buyerId)?.name ?? p.buyerId,
        confirmed: p.confirmed,
      })),
    [data, lookups],
  )

  // — Bảng 2: quyên góp (vật tư + tiền mặt).
  const donationRows = useMemo(
    () =>
      (data?.donations ?? []).map((d) => ({
        id: d.id,
        donor: d.donorName,
        material: d.materialId ? lookups.material.get(d.materialId)?.name ?? d.materialId : t('features.donations.money'),
        promised: d.promisedQty ?? '',
        received: d.receivedQty ?? '',
        monetary: d.monetary ?? '',
        status: d.status,
      })),
    [data, lookups, t],
  )

  // — Bảng 3: giờ công theo TNV (timesheets aggregate).
  const hourRows = useMemo(() => {
    const byVolunteer = new Map<string, { hours: number; sessions: number }>()
    for (const ts of data?.timesheets ?? []) {
      const acc = byVolunteer.get(ts.volunteerId) ?? { hours: 0, sessions: 0 }
      byVolunteer.set(ts.volunteerId, { hours: acc.hours + ts.hours, sessions: acc.sessions + 1 })
    }
    return [...byVolunteer.entries()]
      .map(([volunteerId, { hours, sessions }]) => ({
        id: volunteerId,
        volunteer: lookups.user.get(volunteerId)?.name ?? volunteerId,
        hours,
        sessions,
      }))
      .sort((a, b) => b.hours - a.hours)
  }, [data, lookups])

  // — Bảng 4: nhiệm vụ hoàn thành (status DONE).
  const doneRows = useMemo(
    () =>
      (data?.tasks ?? [])
        .filter((x) => x.status === 'DONE')
        .map((x) => ({
          id: x.id,
          title: x.title,
          area: lookups.area.get(x.areaId) ?? x.areaId,
          estimateHours: x.estimateHours,
          assignees: x.assignees.length
            ? x.assignees.map((id) => lookups.user.get(id)?.name ?? id).join(', ')
            : t('features.tasks.assignNone'),
          dueDate: x.dueDate,
          photos: x.submittedPhotos,
        }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data, lookups, t],
  )

  // — RecognitionBoard: điểm + giờ + quà + nhiệm vụ DONE từng TNV.
  const contributorRows: ContributorRow[] = useMemo(() => {
    const hours = new Map(hourRows.map((r) => [r.id, r.hours]))
    const contributions = new Map<string, number>()
    for (const d of data?.donations ?? []) {
      if (d.status === 'CANCELED') continue
      contributions.set(d.donorName, (contributions.get(d.donorName) ?? 0) + 1)
    }
    // Donor là tên tự do (không phải user id) — đếm đơn giản theo tên xuất hiện
    // trong bảng quyên góp; nếu khớp tên user thì cộng vào hàng của user đó.
    const byName = new Map((data?.users ?? []).map((u) => [u.name, u.id]))
    const contributionsById = new Map<string, number>()
    for (const [name, n] of contributions) {
      const uid = byName.get(name)
      if (uid) contributionsById.set(uid, n)
    }
    const tasksDone = new Map<string, number>()
    for (const x of data?.tasks ?? []) {
      if (x.status !== 'DONE') continue
      for (const id of x.assignees) tasksDone.set(id, (tasksDone.get(id) ?? 0) + 1)
    }
    return (data?.users ?? [])
      .filter((u) => u.role !== 'PARISH' && u.role !== 'COMMUNITY')
      .map((u) => ({
        id: u.id,
        name: u.name,
        avatarHue: u.avatarHue,
        communityName: u.communityId ? lookups.community.get(u.communityId) ?? '—' : '—',
        points: u.points,
        hours: hours.get(u.id) ?? 0,
        contributions: contributionsById.get(u.id) ?? 0,
        tasksDone: tasksDone.get(u.id) ?? 0,
      }))
  }, [data, lookups, hourRows])

  // — Số liệu tổng cho StatCards.
  const totalCost = useMemo(() => purchaseRows.reduce((s, x) => s + x.cost, 0), [purchaseRows])
  const totalHours = useMemo(() => hourRows.reduce((s, x) => s + x.hours, 0), [hourRows])
  const totalMonetary = useMemo(
    () => (data?.donations ?? []).reduce((s, d) => s + (d.monetary ?? 0), 0),
    [data],
  )

  const purchaseColumns = useMemo(
    () => [
      { key: 'material', header: t('features.purchases.material') },
      { key: 'qty', header: t('features.purchases.qty'), align: 'right' as const, render: (r: (typeof purchaseRows)[number]) => <span className="tabular">{r.qty}</span> },
      { key: 'cost', header: t('features.purchases.cost'), align: 'right' as const, render: (r: (typeof purchaseRows)[number]) => <span className="tabular">{r.cost.toLocaleString()} ₫</span> },
      { key: 'supplier', header: t('features.purchases.supplier') },
      { key: 'date', header: t('features.purchases.date'), render: (r: (typeof purchaseRows)[number]) => <span className="tabular">{viDate(r.date)}</span> },
      { key: 'buyer', header: t('features.purchases.buyer') },
      { key: 'confirmed', header: t('features.purchases.confirmed'), align: 'center' as const, render: (r: (typeof purchaseRows)[number]) => (r.confirmed ? '✓' : '·') },
    ],
    [t],
  )

  const donationColumns = useMemo(
    () => [
      { key: 'donor', header: t('features.donations.donor'), render: (r: (typeof donationRows)[number]) => <span className="font-semibold">{r.donor}</span> },
      { key: 'material', header: t('features.donations.material') },
      { key: 'promised', header: t('features.donations.promised'), align: 'right' as const, render: (r: (typeof donationRows)[number]) => <span className="tabular">{r.promised || '—'}</span> },
      { key: 'received', header: t('features.donations.receivedCol'), align: 'right' as const, render: (r: (typeof donationRows)[number]) => <span className="tabular">{r.received || '—'}</span> },
      { key: 'monetary', header: t('features.donations.money'), align: 'right' as const, render: (r: (typeof donationRows)[number]) => <span className="tabular">{r.monetary ? `${r.monetary.toLocaleString()} ₫` : '—'}</span> },
    ],
    [t],
  )

  const hourColumns = useMemo(
    () => [
      { key: 'volunteer', header: t('features.timesheets.volunteer'), render: (r: (typeof hourRows)[number]) => <span className="font-semibold">{r.volunteer}</span> },
      { key: 'sessions', header: t('features.reports.sessions'), align: 'right' as const, render: (r: (typeof hourRows)[number]) => <span className="tabular">{r.sessions}</span> },
      { key: 'hours', header: t('features.timesheets.hours'), align: 'right' as const, render: (r: (typeof hourRows)[number]) => <span className="tabular font-semibold">{r.hours.toFixed(1)}</span> },
    ],
    [t],
  )

  const doneColumns = useMemo(
    () => [
      { key: 'title', header: t('features.tasks.name'), render: (r: (typeof doneRows)[number]) => <span className="font-semibold">{r.title}</span> },
      { key: 'area', header: t('features.tasks.area') },
      { key: 'estimateHours', header: t('features.tasks.estimateHours'), align: 'right' as const, render: (r: (typeof doneRows)[number]) => <span className="tabular">{r.estimateHours}</span> },
      { key: 'assignees', header: t('features.tasks.assignees') },
      { key: 'dueDate', header: t('features.tasks.dueDate'), render: (r: (typeof doneRows)[number]) => <span className="tabular">{viDate(r.dueDate)}</span> },
      { key: 'photos', header: t('features.tasks.photos'), align: 'right' as const, render: (r: (typeof doneRows)[number]) => <span className="tabular">{r.photos}</span> },
    ],
    [t],
  )

  // Nút Xuất CSV cho từng bảng — tên file tiếng Việt không dấu, header dùng
  // label i18n của cột (Excel vi mở thẳng nhờ BOM).
  const exportPurchases = () => {
    exportCsv(
      'grottoworks-bao-cao-chi-phi.csv',
      purchaseRows.map((r) => ({
        [t('features.purchases.material')]: r.material,
        [t('features.purchases.qty')]: r.qty,
        [t('features.purchases.cost')]: r.cost,
        [t('features.purchases.supplier')]: r.supplier,
        [t('features.purchases.date')]: viDate(r.date),
        [t('features.purchases.buyer')]: r.buyer,
        [t('features.purchases.confirmed')]: r.confirmed ? '✓' : '·',
      })),
    )
    onExported(t('features.reports.purchasesTitle'))
  }

  const exportDonations = () => {
    exportCsv(
      'grottoworks-bao-cao-quyen-gop.csv',
      donationRows.map((r) => ({
        [t('features.donations.donor')]: r.donor,
        [t('features.donations.material')]: r.material,
        [t('features.donations.promised')]: r.promised,
        [t('features.donations.receivedCol')]: r.received,
        [t('features.donations.money')]: r.monetary,
      })),
    )
    onExported(t('features.reports.donationsTitle'))
  }

  const exportHours = () => {
    exportCsv(
      'grottoworks-bao-cao-gio-cong.csv',
      hourRows.map((r) => ({
        [t('features.timesheets.volunteer')]: r.volunteer,
        [t('features.reports.sessions')]: r.sessions,
        [t('features.timesheets.hours')]: r.hours.toFixed(1),
      })),
    )
    onExported(t('features.reports.hoursTitle'))
  }

  const exportDone = () => {
    exportCsv(
      'grottoworks-bao-cao-nhiem-vu.csv',
      doneRows.map((r) => ({
        [t('features.tasks.name')]: r.title,
        [t('features.tasks.area')]: r.area,
        [t('features.tasks.estimateHours')]: r.estimateHours,
        [t('features.tasks.assignees')]: r.assignees,
        [t('features.tasks.dueDate')]: viDate(r.dueDate),
        [t('features.tasks.photos')]: r.photos,
      })),
    )
    onExported(t('features.reports.doneTitle'))
  }

  if (isPending) return <p className="lbl-mono">{t('common.loading')}</p>

  return (
    <div>
      <PageHeader title={t('features.reports.title')} sub={t('features.reports.sub')} />

      <div className="stagger mb-2 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div style={{ '--d': 0 } as CSSProperties}>
          <StatCard label={t('features.reports.purchasesTitle')} value={purchaseRows.length} unit={t('features.reports.recordUnit')} tone="ok" />
        </div>
        <div style={{ '--d': 1 } as CSSProperties}>
          <StatCard label={t('features.reports.totalCost')} value={totalCost} unit="₫" tone="alert" />
        </div>
        <div style={{ '--d': 2 } as CSSProperties}>
          <StatCard label={t('features.reports.totalHours')} value={totalHours} unit={t('features.volunteers.hourUnit')} tone="warn" />
        </div>
        <div style={{ '--d': 3 } as CSSProperties}>
          <StatCard label={t('features.reports.totalMonetary')} value={totalMonetary} unit="₫" tone="ok" />
        </div>
      </div>

      <Section
        title={t('features.reports.purchasesTitle')}
        count={purchaseRows.length}
        onExport={exportPurchases}
        index={0}
      >
        <DataTable
          rows={purchaseRows}
          columns={purchaseColumns}
          searchKeys={['material', 'supplier']}
          emptyText={t('features.reports.emptyPurchases')}
        />
      </Section>

      <Section
        title={t('features.reports.donationsTitle')}
        count={donationRows.length}
        onExport={exportDonations}
        index={1}
      >
        <DataTable
          rows={donationRows}
          columns={donationColumns}
          searchKeys={['donor', 'material']}
          emptyText={t('features.reports.emptyDonations')}
        />
      </Section>

      <Section
        title={t('features.reports.hoursTitle')}
        count={hourRows.length}
        onExport={exportHours}
        index={2}
      >
        <DataTable
          rows={hourRows}
          columns={hourColumns}
          searchKeys={['volunteer']}
          emptyText={t('features.reports.emptyHours')}
        />
      </Section>

      <Section
        title={t('features.reports.doneTitle')}
        count={doneRows.length}
        onExport={exportDone}
        index={3}
      >
        <DataTable
          rows={doneRows}
          columns={doneColumns}
          searchKeys={['title', 'area']}
          emptyText={t('features.reports.emptyDone')}
        />
      </Section>

      <section className="mt-8" style={{ '--d': 4 } as CSSProperties} data-g-item>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold tracking-tight text-foreground">
            {t('features.reports.recognitionTitle')}
          </h2>
        </div>
        <RecognitionBoard rows={contributorRows} />
      </section>
    </div>
  )
}
