// Chi tiết TNV (route /leader/volunteers/:id + /community/volunteers/:id):
// profile (avatar hue, giáo khu), StatCard điểm + giờ công, bảng giờ công,
// nhiệm vụ đang/đã tham gia (assignees chứa id), đóng góp (quyên góp đối
// chiếu donorName — donation không có volunteerId, khớp chuỗi con vì seed
// có tiền tố "Bà/Ông/Anh"; hồ sơ mua theo buyerId).
import { useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAreas } from '@/features/areas/api'
import { useCommunities } from '@/features/communities/api'
import { useDonations } from '@/features/donations/api'
import { useMaterials } from '@/features/materials/api'
import { usePurchaseRecords } from '@/features/purchases/api'
import { useTasks } from '@/features/tasks/api'
import { useTimesheets } from '@/features/timesheets/api'
import { useUsers } from '@/features/users/api'
import { viDate } from '@/lib/format'
import type { Donation, PurchaseRecord, Task, Timesheet } from '@/types'

export default function VolunteerDetailPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const prefix = pathname.startsWith('/community') ? '/community' : '/leader'

  const { data: users = [], isPending } = useUsers()
  const { data: communities = [] } = useCommunities()
  const { data: areas = [] } = useAreas()
  const { data: timesheets = [] } = useTimesheets()
  const { data: tasks = [] } = useTasks()
  const { data: donations = [] } = useDonations()
  const { data: purchases = [] } = usePurchaseRecords()
  const { data: materials = [] } = useMaterials()

  const areaName = (aid: string) => areas.find((a) => a.id === aid)?.name ?? '—'
  const materialName = (mid?: string) =>
    materials.find((m) => m.id === mid)?.name ?? t('features.volunteers.monetaryOnly')

  // Mọi hook trước early return (quy tắc hooks); user lookup chỉ là find.
  const tsColumns = useMemo(
    () => [
      { key: 'date', header: t('features.volunteers.date'), render: (x: Timesheet) => <span className="tabular">{viDate(x.date)}</span> },
      { key: 'checkIn', header: t('features.volunteers.checkIn') },
      { key: 'checkOut', header: t('features.volunteers.checkOut'), render: (x: Timesheet) => x.checkOut ?? '—' },
      { key: 'hours', header: t('features.volunteers.hours'), align: 'right' as const, render: (x: Timesheet) => <span className="tabular">{x.hours.toFixed(1)}</span> },
      { key: 'status', header: t('common.status'), render: (x: Timesheet) => <StatusTag status={x.status} /> },
    ],
    [t],
  )
  const taskColumns = useMemo(
    () => [
      { key: 'title', header: t('features.volunteers.task'), render: (x: Task) => <span className="font-semibold">{x.title}</span> },
      { key: 'area', header: t('features.volunteers.area'), render: (x: Task) => areaName(x.areaId) },
      { key: 'dueDate', header: t('features.volunteers.dueDate'), render: (x: Task) => <span className="tabular">{viDate(x.dueDate)}</span> },
      { key: 'status', header: t('common.status'), render: (x: Task) => <StatusTag status={x.status} /> },
    ],
    [t, areas],
  )
  const donationColumns = useMemo(
    () => [
      { key: 'material', header: t('features.volunteers.material'), render: (d: Donation) => materialName(d.materialId) },
      { key: 'promisedQty', header: t('features.volunteers.qty'), align: 'right' as const, render: (d: Donation) => <span className="tabular">{d.promisedQty ?? '—'}</span> },
      { key: 'monetary', header: t('features.volunteers.amount'), align: 'right' as const, render: (d: Donation) => <span className="tabular">{d.monetary ? d.monetary.toLocaleString() : '—'}</span> },
      { key: 'status', header: t('common.status'), render: (d: Donation) => <StatusTag status={d.status} /> },
    ],
    [t, materials],
  )
  const purchaseColumns = useMemo(
    () => [
      { key: 'date', header: t('features.volunteers.date'), render: (p: PurchaseRecord) => <span className="tabular">{viDate(p.date)}</span> },
      { key: 'material', header: t('features.volunteers.material'), render: (p: PurchaseRecord) => materialName(p.materialId) },
      { key: 'qty', header: t('features.volunteers.qty'), align: 'right' as const, render: (p: PurchaseRecord) => <span className="tabular">{p.qty}</span> },
      { key: 'cost', header: t('features.volunteers.cost'), align: 'right' as const, render: (p: PurchaseRecord) => <span className="tabular">{p.cost.toLocaleString()}</span> },
      { key: 'supplier', header: t('features.volunteers.supplier') },
      { key: 'confirmed', header: t('features.volunteers.confirmed'), align: 'center' as const, render: (p: PurchaseRecord) => (p.confirmed ? '✓' : '·') },
    ],
    [t, materials],
  )

  const user = users.find((u) => u.id === id)
  if (isPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (!user) {
    return (
      <div>
        <PageHeader title={t('features.volunteers.title')} />
        <EmptyState text={t('features.volunteers.notFound')} />
      </div>
    )
  }

  const myTimesheets = timesheets.filter((x) => x.volunteerId === id)
  const totalHours = myTimesheets.reduce((s, x) => s + x.hours, 0)
  const myTasks = tasks.filter((x) => x.assignees.includes(id))
  // Donation không có volunteerId — đối chiếu tên (includes: seed có "Bà/Ông/…").
  const myDonations = donations.filter((d) => d.donorName.includes(user.name))
  const myPurchases = purchases.filter((p) => p.buyerId === id)
  const community = communities.find((c) => c.id === user.communityId)

  return (
    <div>
      <PageHeader
        title={user.name}
        sub={community?.name ?? t('features.volunteers.noCommunity')}
        actions={
          <Button variant="outline" onClick={() => navigate(`${prefix}/volunteers`)}>
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Button>
        }
      />

      {/* Hero Profile & Stats Bar */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="flex items-center gap-4 rounded-card border border-border bg-card p-5 shadow-xs">
          <Avatar name={user.name} hue={user.avatarHue} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-bold text-foreground">{user.name}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                ★ {user.points}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {user.skills.length ? (
                user.skills.map((s) => (
                  <Badge key={s} className="bg-brand-pine/10 text-brand-pine border-brand-pine/20 text-[11px] px-2 py-0.5">
                    {s}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* 2 Stat Cards for volunteer */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <StatCard
            label={t('features.volunteers.hoursTitle')}
            value={totalHours}
            unit={t('features.volunteers.hourUnit')}
            tone="ok"
          />
          <StatCard
            label={t('features.volunteers.tasksTitle')}
            value={myTasks.length}
            unit="việc"
            tone="warn"
          />
        </div>
      </div>

      {/* Main Grid: Timesheets & Tasks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="lbl-mono mb-3 text-foreground">{t('features.volunteers.timesheetsTitle')}</h3>
          <DataTable rows={myTimesheets} columns={tsColumns} pageSize={5} emptyText={t('features.volunteers.noTimesheets')} />
        </Card>

        <Card className="p-5">
          <h3 className="lbl-mono mb-3 text-foreground">{t('features.volunteers.tasksTitle')}</h3>
          <DataTable rows={myTasks} columns={taskColumns} pageSize={5} emptyText={t('features.volunteers.noTasks')} />
        </Card>
      </div>

      {/* Bottom Grid: Donations & Purchases */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="lbl-mono mb-3 text-foreground">{t('features.volunteers.donationsTitle')}</h3>
          <DataTable rows={myDonations} columns={donationColumns} pageSize={5} emptyText={t('features.volunteers.noDonations')} />
        </Card>

        <Card className="p-5">
          <h3 className="lbl-mono mb-3 text-foreground">{t('features.volunteers.purchasesTitle')}</h3>
          <DataTable rows={myPurchases} columns={purchaseColumns} pageSize={5} emptyText={t('features.volunteers.noPurchases')} />
        </Card>
      </div>
    </div>
  )
}
