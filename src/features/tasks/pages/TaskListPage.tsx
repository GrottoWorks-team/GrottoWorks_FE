// Danh sách nhiệm vụ. Mount ở các route:
// - /leader/tasks: leader thấy việc các khu mình lãnh (nhiều khu → select khu),
//   committee/parish thấy tất cả (route committee tương lai).
// - /community/areas/:id/tasks: read-only (ẩn tạo/sửa/xoá), khoá theo :id.
// Status tabs = chip filter của DataTable (client-side trên key 'status').
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button, buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useAreas } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useDeleteTask, useTasks } from '../api'
import { SELECT_CLS, TaskFormDialog } from './TaskFormDialog'
import type { Task } from '@/types'

export default function TaskListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { id: areaParam } = useParams()
  const { user } = useAuth()

    const readOnly = pathname.startsWith('/community/') || pathname.startsWith('/parish/')

  const { data: areas = [] } = useAreas()
  const deleteTask = useDeleteTask()

  // Khu của leader: 1 khu → cố định; nhiều khu → select (default khu đầu).
  const myAreas = areas.filter((a) => a.leaderId === user?.id)
  const [selectedArea, setSelectedArea] = useState('')
  const leaderAreaId =
    myAreas.length === 1 ? myAreas[0].id : myAreas.length > 1 ? selectedArea || myAreas[0].id : ''
  const areaId = (readOnly ? areaParam : undefined) ?? (leaderAreaId || undefined)

    const { data: allTasks = [], isPending } = useTasks(areaId)
  const tasks = allTasks

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'

  const stats = useMemo(() => {
    const total = tasks.length
    const doing = tasks.filter((x) => x.status === 'DOING').length
    const revise = tasks.filter((x) => x.status === 'REVISE').length
    const done = tasks.filter((x) => x.status === 'DONE').length
    return { total, doing, revise, done }
  }, [tasks])

  const columns = useMemo(
    () => [
      {
        key: 'title',
        header: t('features.tasks.name'),
        render: (x: Task) => (
          <div className="space-y-1">
            <span className="font-semibold text-foreground hover:text-brand-pine transition-colors">
              {x.title}
            </span>
            {x.skills && x.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {x.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center rounded-full bg-brand-gold/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'area',
        header: t('features.tasks.area'),
        render: (x: Task) => (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {areaName(x.areaId)}
          </span>
        ),
      },
      {
        key: 'dueDate',
        header: t('features.tasks.dueDate'),
        render: (x: Task) => <span className="tabular text-sm font-medium">{viDate(x.dueDate)}</span>,
      },
      {
        key: 'assignees',
        header: t('features.tasks.assignees'),
        align: 'right' as const,
        render: (x: Task) => {
          const ratio = Math.min(100, Math.round((x.assignees.length / x.volunteersNeeded) * 100))
          const isFull = x.assignees.length >= x.volunteersNeeded
          return (
            <div className="flex flex-col items-end gap-1">
              <span className={cn('tabular text-xs font-bold', isFull ? 'text-brand-pine' : 'text-amber-700')}>
                {x.assignees.length}/{x.volunteersNeeded} TNV
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                <div
                  className={cn('h-full rounded-full transition-all', isFull ? 'bg-brand-pine' : 'bg-brand-warm')}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          )
        },
      },
      { key: 'status', header: t('common.status'), render: (x: Task) => <StatusTag status={x.status} /> },
      ...(readOnly
        ? []
        : [
            {
              key: 'actions',
              header: t('common.actions'),
              render: (x: Task) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.edit')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(x)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleting(x)
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ),
            },
          ]),
    ],
    [t, areas, readOnly],
  )

  const onDelete = async (x: Task) => {
    try {
      await deleteTask.mutateAsync(x.id)
      toast(t('features.tasks.deleted', { name: x.title }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.tasks.title')}
        sub={
          areaId
            ? `${t('features.tasks.area')}: ${areaName(areaId)}`
            : t('features.tasks.sub')
        }
        actions={
          !readOnly &&
          areaId && (
            <>
              {myAreas.length > 1 && (
                <select
                  aria-label={t('features.tasks.area')}
                  className={`${SELECT_CLS} w-48`}
                  value={leaderAreaId}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  {myAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="size-4" />
                {t('features.tasks.create')}
              </Button>
            </>
          )
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : user?.role === 'LEADER' && myAreas.length === 0 ? (
        // Leader chưa lãnh khu nào — không đổ toàn bộ tasks, hướng liên hệ committee.
        <EmptyState
          text={t('features.tasks.noArea')}
          action={
            <a
              href="mailto:committee@grottoworks.vn"
              className={cn(buttonBase, buttonVariants.default, buttonSizes.default)}
            >
              {t('features.tasks.contactCommittee')}
            </a>
          }
        />
      ) : (
        <>
          {tasks.length > 0 && (
            <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Tổng công việc" value={stats.total} tone="ok" />
              <StatCard label="Đang triển khai" value={stats.doing} tone="warn" />
              <StatCard label="Cần chỉnh sửa" value={stats.revise} tone={stats.revise > 0 ? 'alert' : 'ok'} />
              <StatCard label="Đã hoàn thành" value={stats.done} tone="ok" />
            </div>
          )}

          <DataTable
            rows={tasks}
            columns={columns}
            searchKeys={['title']}
            filters={[{ key: 'status', options: ['TODO', 'DOING', 'REVIEW', 'DONE', 'REVISE'] }]}
            pageSize={8}
            emptyText={t('features.tasks.empty')}
            onRowClick={readOnly ? undefined : (x) => navigate(`/leader/tasks/${x.id}`)}
          />
        </>
      )}

      {formOpen && (
        <TaskFormDialog
          task={editing}
          fixedAreaId={areaId}
          onClose={() => setFormOpen(false)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('features.tasks.deleteTitle')}
        description={deleting ? t('features.tasks.deleteConfirm', { name: deleting.title }) : undefined}
        confirmLabel={t('common.delete')}
        tone="destructive"
        onConfirm={() => deleting && onDelete(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
