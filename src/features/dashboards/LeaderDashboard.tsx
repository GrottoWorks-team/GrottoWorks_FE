// Dashboard trưởng khu (route /leader, index route): thống kê khu mình —
// donut nhiệm vụ theo trạng thái (Recharts PieChart), giờ công tuần, checklist
// sẵn sàng, danh sách việc trễ hạn + khoảng thiếu TNV, quick links.
// Dữ liệu: GET /api/dashboard/leader (suy khu từ Bearer token, fallback u3)
// + tasks (lấy chi tiết việc trễ/không đủ người của khu).
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ArrowRight, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTasks } from '@/features/tasks/api'
import { viDate } from '@/lib/format'
import { useLeaderSummary } from './api'
import type { Task } from '@/types'

const d = (n: number) => ({ '--d': n }) as CSSProperties

// Màu donut theo trạng thái nhiệm vụ — moss (xong) → straw (đang làm) →
// terra nhạt (chờ duyệt) → brick (trễ/làm lại) → hair (chưa bắt đầu).
const STATUS_FILL: Record<string, string> = {
  DONE: '#0A5C36',
  DOING: '#EEB902',
  REVIEW: '#F4A261',
  REVISE: '#991B1B',
  TODO: '#E9ECEF',
}

export default function LeaderDashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: summary, isPending } = useLeaderSummary()
  const { data: allTasks = [] } = useTasks()

  const area = summary?.area ?? null

  // Việc của khu: dùng tasks thật (đầy đủ title/dueDate/assignees) thay vì
  // chỉ tổng trong summary; summary là nguồn cho StatCard.
  const areaTasks = useMemo(
    () => (area ? allTasks.filter((x) => x.areaId === area.id) : []),
    [allTasks, area],
  )

  // Việc trễ: chưa DONE/REVIEW mà đã quá hạn (mốc demo 2026-11-28 — cuối
  // dữ liệu chấm công, khớp seed bất kể ngày hệ thống).
  const DEMO_TODAY = '2026-11-28'
  const lateTasks = useMemo(
    () =>
      areaTasks
        .filter((x) => x.status !== 'DONE' && x.status !== 'REVIEW' && x.dueDate < DEMO_TODAY)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [areaTasks],
  )

  // Khoảng thiếu TNV: volunteersNeeded > assignees.length.
  const gaps = useMemo(
    () => areaTasks.filter((x) => x.assignees.length < x.volunteersNeeded).length,
    [areaTasks],
  )

  const donutData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.taskCounts).map(([status, count]) => ({
      status,
      count,
      fill: STATUS_FILL[status] ?? '#E9ECEF',
    }))
  }, [summary])

  const lateColumns = useMemo(
    () => [
      {
        key: 'title',
        header: t('features.tasks.name'),
        render: (x: Task) => <span className="font-semibold">{x.title}</span>,
      },
      {
        key: 'dueDate',
        header: t('features.tasks.dueDate'),
        align: 'right' as const,
        render: (x: Task) => <span className="tabular">{viDate(x.dueDate)}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (x: Task) => <StatusTag status={x.status} />,
      },
    ],
    [t],
  )

  return (
    <div>
      <PageHeader
        title={area ? t('features.dashboards.leaderTitle', { name: area.name }) : t('features.dashboards.leaderTitleNoArea')}
        sub={t('features.dashboards.leaderSub')}
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !area || !summary ? (
        <EmptyState text={t('features.tasks.noArea')} />
      ) : (
        <div className="space-y-6">
          {/* 4 StatCard: giờ tuần, TNV, thiếu vật tư, đăng ký chờ duyệt. */}
          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div style={d(0)}>
              <StatCard
                label={t('features.dashboards.weekHours')}
                value={summary.weekHours}
                unit={t('features.volunteers.hourUnit')}
                tone="ok"
              />
            </div>
            <div style={d(1)}>
              <StatCard
                label={t('features.dashboards.volunteerCount')}
                value={summary.volunteerCount}
                tone="ok"
              />
            </div>
            <div style={d(2)}>
              <StatCard
                label={t('features.dashboards.shortageMaterials')}
                value={summary.materialsShortage}
                tone={summary.materialsShortage > 0 ? 'alert' : 'ok'}
              />
            </div>
            <div style={d(3)}>
              <StatCard
                label={t('features.dashboards.pendingVolunteers')}
                value={summary.pendingVolunteers}
                tone={summary.pendingVolunteers > 0 ? 'warn' : 'ok'}
              />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
            {/* Donut nhiệm vụ theo trạng thái + checklist sẵn sàng. */}
            <div className="space-y-6">
              <Card className="p-5">
                <p className="lbl-mono mb-2">{t('features.dashboards.tasksByStatus')}</p>
                {donutData.length === 0 ? (
                  <EmptyState text={t('features.tasks.empty')} className="py-6" />
                ) : (
                  <>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="count"
                            nameKey="status"
                            innerRadius="62%"
                            outerRadius="88%"
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {donutData.map((entry) => (
                              <Cell key={entry.status} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {donutData.map((entry) => (
                        <li key={entry.status} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm text-foreground">
                            <span
                              aria-hidden
                              className="inline-block size-2.5 rounded-full"
                              style={{ background: entry.fill }}
                            />
                            {t(`status.${entry.status}`)}
                          </span>
                          <span className="tabular text-sm font-extrabold text-foreground">
                            {entry.count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>

              <Card className="p-5">
                <p className="lbl-mono mb-2">{t('features.checklist.title')}</p>
                <div className="flex items-baseline justify-between">
                  <p className="tabular text-2xl font-extrabold text-foreground">
                    {summary.checklist.done}/{summary.checklist.total}
                  </p>
                  <p className="tabular text-sm font-semibold text-muted-foreground">
                    {summary.checklist.total
                      ? Math.round((summary.checklist.done / summary.checklist.total) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={summary.checklist.done}
                  aria-valuemin={0}
                  aria-valuemax={summary.checklist.total}
                  aria-label={t('features.checklist.title')}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-border"
                >
                  <div
                    className="g-bar h-full rounded-full bg-brand-pine"
                    style={{
                      width: `${summary.checklist.total ? (summary.checklist.done / summary.checklist.total) * 100 : 0}%`,
                      ...d(0),
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/leader/checklist')}
                >
                  {t('features.dashboards.openChecklist')}
                </Button>
              </Card>
            </div>

            {/* Việc trễ + khoảng thiếu TNV + quick links. */}
            <div className="space-y-6">
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="lbl-mono">{t('features.dashboards.lateTasks')}</p>
                  <span
                    className="tabular rounded-full bg-destructive/12 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-destructive"
                    aria-label={t('features.dashboards.lateTasks')}
                  >
                    ✕ {lateTasks.length}
                  </span>
                </div>
                <DataTable
                  rows={lateTasks}
                  columns={lateColumns}
                  pageSize={5}
                  emptyText={t('features.dashboards.noLateTasks')}
                />
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-11 place-items-center rounded-card bg-brand-gold/15 text-brand-gold" aria-hidden>
                      <Users className="size-5" />
                    </span>
                    <div>
                      <p className="lbl-mono">{t('features.dashboards.volunteerGaps')}</p>
                      <p className="tabular text-2xl font-extrabold text-foreground">{gaps}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/leader/tasks')}
                    >
                      {t('features.tasks.assignmentsTitle')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/leader/regs')}
                    >
                      {t('features.dashboards.pendingVolunteers')}
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/leader/timesheets')}
                    >
                      {t('features.timesheets.title')}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
