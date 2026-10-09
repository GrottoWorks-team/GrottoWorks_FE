// Trang chấm công (route /leader/timesheets) — leader khu mình:
// TNV thuộc khu = assignees của tasks khu; lọc volunteerId ∈ set đó.
// Bảng: TNV, ngày, giờ vào/ra, giờ (tabular), StatusTag; row PENDING_FIX
// có nút "Xử lý" mở CorrectionDialog. Thêm bản ghi tay qua TimesheetFormDialog.
// StatCard tổng giờ + BarChart giờ theo ngày (7 ngày cuối của dữ liệu).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Plus, Wrench } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useTasks } from '@/features/tasks/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useTimesheets } from '../api'
import { SELECT_CLS, TimesheetFormDialog } from './TimesheetFormDialog'
import { CorrectionDialog } from '../components/CorrectionDialog'
import type { Timesheet } from '@/types'

// View-row: cộng tên TNV vào row để DataTable search theo tên client-side.
type Row = Timesheet & { volunteerName: string }

export default function TimesheetPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: areas = [] } = useAreas()
  const { data: users = [] } = useUsers()
  const { data: tasks = [] } = useTasks()
  const { data: timesheets = [], isPending } = useTimesheets()

  // Khu của leader: 1 khu → cố định; nhiều khu → select (default khu đầu).
  const myAreas = areas.filter((a) => a.leaderId === user?.id)
  const [selectedArea, setSelectedArea] = useState('')
  const areaId =
    myAreas.length === 1 ? myAreas[0].id : myAreas.length > 1 ? selectedArea || myAreas[0].id : ''

  // TNV của khu = assignees của mọi task khu đang chọn.
  const areaVolunteerIds = useMemo(
    () => new Set(tasks.filter((x) => x.areaId === areaId).flatMap((x) => x.assignees)),
    [tasks, areaId],
  )
  const areaVolunteers = useMemo(
    () => users.filter((u) => areaVolunteerIds.has(u.id)),
    [users, areaVolunteerIds],
  )
  const volunteerName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  const rows = useMemo(
    () =>
      timesheets
        .filter((x) => areaVolunteerIds.has(x.volunteerId))
        .map((x) => ({ ...x, volunteerName: volunteerName(x.volunteerId) })),
    [timesheets, areaVolunteerIds, users],
  )

  const totalHours = useMemo(() => rows.reduce((s, x) => s + x.hours, 0), [rows])

  // Giờ theo ngày: group by date, lấy 7 ngày cuối của dữ liệu (tuần gần nhất).
  const chartData = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const x of rows) byDate.set(x.date, (byDate.get(x.date) ?? 0) + x.hours)
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, hours]) => ({ date: viDate(date), hours }))
  }, [rows])

  const [creating, setCreating] = useState(false)
  const [fixingId, setFixingId] = useState<string | null>(null)
  // Theo id — data luôn tươi sau mutation.
  const fixing = fixingId ? (timesheets.find((x) => x.id === fixingId) ?? null) : null

  const columns = useMemo(
    () => [
      {
        key: 'volunteerName',
        header: t('features.timesheets.volunteer'),
        render: (x: Row) => <span className="font-semibold">{x.volunteerName}</span>,
      },
      {
        key: 'date',
        header: t('features.timesheets.date'),
        render: (x: Row) => <span className="tabular">{viDate(x.date)}</span>,
      },
      {
        key: 'checkIn',
        header: t('features.timesheets.checkIn'),
        render: (x: Row) => <span className="tabular">{x.checkIn}</span>,
      },
      {
        key: 'checkOut',
        header: t('features.timesheets.checkOut'),
        render: (x: Row) => (
          <span className="tabular">{x.checkOut ?? <span className="text-muted-foreground">—</span>}</span>
        ),
      },
      {
        key: 'hours',
        header: t('features.timesheets.hours'),
        align: 'right' as const,
        render: (x: Row) => <span className="tabular">{x.hours}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        // Theo brief chấm công: OPEN ◇ soft (ca chưa bấm ra), PENDING_FIX ✕ straw.
        render: (x: Row) => (
          <StatusTag
            status={x.status}
            glyph={x.status === 'OPEN' ? '◇' : x.status === 'PENDING_FIX' ? '✕' : undefined}
            tone={x.status === 'OPEN' ? 'soft' : undefined}
          />
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (x: Row) =>
          x.status === 'PENDING_FIX' ? (
            <Button
              variant="outline"
              size="sm"
              aria-label={t('features.timesheets.handle')}
              onClick={() => setFixingId(x.id)}
            >
              <Wrench className="size-4" />
              {t('features.timesheets.handle')}
            </Button>
          ) : null,
      },
    ],
    [t],
  )

  const pendingFixCount = useMemo(
    () => rows.filter((x) => x.status === 'PENDING_FIX').length,
    [rows],
  )

  return (
    <div>
      <PageHeader
        title={t('features.timesheets.title')}
        sub={
          areaId
            ? `${t('features.tasks.area')}: ${areas.find((a) => a.id === areaId)?.name ?? '—'}`
            : t('features.timesheets.sub')
        }
        actions={
          areaId && (
            <>
              {myAreas.length > 1 && (
                <select
                  aria-label={t('features.tasks.area')}
                  className={`${SELECT_CLS} w-48`}
                  value={areaId}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  {myAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <Button onClick={() => setCreating(true)} disabled={areaVolunteers.length === 0}>
                <Plus className="size-4" />
                {t('features.timesheets.create')}
              </Button>
            </>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : user?.role === 'LEADER' && myAreas.length === 0 ? (
        <EmptyState text={t('features.tasks.noArea')} />
      ) : (
        <>
          {/* Top 3 StatCards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={t('features.timesheets.totalHours')}
              value={totalHours}
              unit={t('features.volunteers.hourUnit')}
              tone="ok"
            />
            <StatCard
              label="Số ca chấm công"
              value={rows.length}
              unit="ca"
            />
            <StatCard
              label="Yêu cầu sửa giờ"
              value={pendingFixCount}
              unit="yêu cầu"
              tone={pendingFixCount > 0 ? 'alert' : 'ok'}
            />
          </div>

          {/* 7 Days Bar Chart */}
          <Card className="mb-6 p-5">
            <p className="lbl-mono mb-3 text-foreground">{t('features.timesheets.hoursByDay')}</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#E9ECEF" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6C757D' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6C757D' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F2' }} />
                  <Bar dataKey="hours" fill="#0A5C36" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <DataTable
            rows={rows}
            columns={columns}
            searchKeys={['volunteerName']}
            filters={[{ key: 'status', options: ['OPEN', 'CLOSED', 'PENDING_FIX'] }]}
            emptyText={t('features.timesheets.empty')}
          />
        </>
      )}

      {creating && areaId && (
        <TimesheetFormDialog
          volunteers={areaVolunteers}
          onClose={() => setCreating(false)}
        />
      )}
      {fixing && fixing.correctionRequest != null && (
        <CorrectionDialog
          item={fixing}
          volunteerName={volunteerName(fixing.volunteerId)}
          onClose={() => setFixingId(null)}
        />
      )}
    </div>
  )
}
