// Tổng quan trưởng khu (route /leader, index route).
// Một leader CÓ THỂ lãnh nhiều khu → danh sách khu lấy thật từ useScopedAreas()
// (lọc leaderId + mùa đang chọn), nhiều khu thì hiện select (`?area=`).
// Số liệu khu đang chọn: GET /api/v1/dashboards/work-area?workAreaId= (Reporting).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { useTasks } from '@/features/tasks/api'
import { formatDate } from '@/lib/format'
import { useDashboardData, useWorkAreaDashboard } from './api'
import type { Task, WorkArea } from '@/types'

const SELECT_CLS =
  'h-10 max-w-56 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function LeaderOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { areas, coverage, userNameById, isPending } = useDashboardData()

  const requestedAreaId = searchParams.get('area')
  const area = areas.find((a) => a.id === requestedAreaId) ?? areas[0] ?? null
  const { data: workAreaDashboard, isPending: workAreaDashboardPending, isError: workAreaDashboardError, refetch: refetchWorkArea } = useWorkAreaDashboard(
    area?.id,
  )
  const workAreaSummary = workAreaDashboard?.summary

  // "Việc nào chưa ai làm": việc chưa bắt đầu lên đầu, rồi tới hạn gần nhất.
  const { data: areaTasks = [], isPending: tasksPending, isError: tasksError, refetch: refetchTasks } =
    useTasks(area?.id)
  const priorityTasks = useMemo(() => {
    const rank = (task: Task) =>
      task.backendStatus === 'NOT_STARTED' || task.backendStatus === 'OPEN' ? 0 : 1
    return [...areaTasks]
      .sort((a, b) => rank(a) - rank(b) || String(a.dueDate).localeCompare(String(b.dueDate)))
      .slice(0, 8)
  }, [areaTasks])

  const selectArea = (areaId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (areaId) next.set('area', areaId)
        else next.delete('area')
        return next
      },
      { replace: true },
    )
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.tasks.area'),
        render: (a: WorkArea) => <span className="font-semibold">{a.name}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkArea) => <StatusTag status={a.status} />,
      },
      {
        key: 'officer',
        header: t('features.areas.officer'),
        render: (a: WorkArea) => userNameById.get(a.officerId) ?? '—',
      },
    ],
    [t, userNameById],
  )

  return (
    <div>
      <PageHeader
        title={
          area
            ? // BE chưa trả `name` → toWorkArea() đã dùng fallback "Khu vực #id"
              // (đã có tiền tố) nên tránh lặp thành "Khu Khu vực #id".
              area.name.startsWith(t('features.areas.namePrefix'))
              ? area.name
              : t('features.dashboards.leaderTitle', { name: area.name })
            : t('features.dashboards.leaderTitleNoArea')
        }
        sub={
          areas.length > 1
            ? t('features.dashboards.leaderSubMulti', { count: areas.length })
            : t('features.dashboards.leaderSub')
        }
        finding={
          area
            ? t('features.dashboards.leaderFinding', {
                unassigned: workAreaSummary?.tasks.unassigned ?? 0,
                overdue: workAreaSummary?.tasks.overdue ?? 0,
              })
            : undefined
        }
        actions={
          area && (
            <div className="flex items-center gap-2">
              {areas.length > 1 && (
                <select
                  aria-label={t('features.tasks.area')}
                  value={area.id}
                  onChange={(e) => selectArea(e.target.value)}
                  className={SELECT_CLS}
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !area ? (
        <EmptyState text={t('features.tasks.noArea')} />
      ) : (
        <div className="space-y-6">
          <div className="stagger grid gap-4 sm:grid-cols-3">
            <StatCard label={t('features.dashboards.myAreas')} value={coverage.total} />
            <StatCard
              label={t('features.dashboards.missingMaterialOfficer')}
              value={coverage.missingMaterialOfficer}
              tone={coverage.missingMaterialOfficer ? 'warn' : 'ok'}
            />
            <StatCard
              label={t('features.dashboards.fullyStaffed')}
              value={coverage.fullyStaffed}
              tone={coverage.fullyStaffed === coverage.total ? 'ok' : 'warn'}
            />
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="lbl-mono">{t('features.dashboards.myAreas')}</p>
              {areas.length > 1 && (
                <select
                  aria-label={t('features.tasks.area')}
                  value={area.id}
                  onChange={(e) => selectArea(e.target.value)}
                  className={SELECT_CLS}
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <DataTable
              rows={areas}
              columns={columns}
              pageSize={10}
              emptyText={t('features.tasks.noArea')}
            />
          </Card>

          <Card className="p-5">
            <p className="lbl-mono mb-3">{t('features.dashboards.priorityTitle')}</p>
            {tasksError ? (
              <ErrorState compact onRetry={() => void refetchTasks()} />
            ) : tasksPending ? (
              <EmptyState text={t('common.loading')} className="py-6" />
            ) : priorityTasks.length === 0 ? (
              <EmptyState
                text={t('features.dashboards.priorityEmpty')}
                hint={t('features.dashboards.priorityEmptyHint')}
                className="py-6"
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {priorityTasks.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/leader/tasks/${task.id}`)}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left transition-colors hover:bg-gw-hover"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {task.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(task.dueDate)}
                          {task.backendStatus === 'NOT_STARTED' || task.backendStatus === 'OPEN'
                            ? ` · ${t('features.dashboards.notStarted')}`
                            : ''}
                        </span>
                      </span>
                      <StatusTag status={task.status} scope="task" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <p className="lbl-mono mb-3">{t('features.dashboards.workAreaProgress')}</p>
            {workAreaDashboardError ? (
              <ErrorState compact onRetry={() => void refetchWorkArea()} />
            ) : workAreaDashboardPending || !workAreaSummary ? (
              <EmptyState text={t('common.loading')} className="py-6" />
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('features.dashboards.taskProgress')}</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {workAreaSummary.tasks.completed}/{workAreaSummary.tasks.total} ·{' '}
                    {Math.round(workAreaSummary.tasks.progressPercent)}%
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('features.dashboards.lateTasks')}</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {workAreaSummary.tasks.overdue}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('features.dashboards.revisionTasks')}</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {workAreaSummary.tasks.revisionRequired}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('features.dashboards.unassignedTasks')}</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {workAreaSummary.tasks.unassigned}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{t('features.dashboards.approvedHours')}</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {workAreaSummary.volunteers.approvedHours}
                  </dd>
                </div>
              </dl>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
