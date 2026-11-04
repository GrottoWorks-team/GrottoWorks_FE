// Duyệt đăng ký tình nguyện viên (route /leader/regs).
//
// BE TaskExecution chỉ trả đăng ký THEO TỪNG task:
//   GET  /api/v1/work-areas/{areaId}/tasks        → việc của khu mình lãnh
//   GET  /api/v1/tasks/{taskId}/applications      → đơn đăng ký của việc đó
//   POST /api/v1/task-applications/{id}/approve|reject   (kèm If-Match version)
// Trang gom đơn của mọi khu mình phụ trách trong mùa đang chọn.
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api, apiPaged, ApiError } from '@/lib/api'
import { viDateTime } from '@/lib/format'
import { useDashboardData } from '@/features/dashboards/api'
import { useUsers } from '@/features/users/api'
import {
  mapTaskDtoToTask,
  useApproveApplication,
  useRejectApplication,
  type TaskApplicationDto,
  type TaskDto,
} from '@/features/tasks/api'

interface ApplicationRow extends TaskApplicationDto {
  taskName: string
}

export default function RegsApprovalPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { areas } = useDashboardData()
  const { data: users = [] } = useUsers({ withSkills: false })
  const approve = useApproveApplication()
  const reject = useRejectApplication()

  const taskQueries = useQueries({
    queries: areas.map((area) => ({
      queryKey: ['tasks', 'area', area.id],
      queryFn: async () => {
        const res = await api<{ data?: TaskDto[]; items?: TaskDto[] } | TaskDto[]>(
          `/api/v1/work-areas/${area.id}/tasks?size=100`,
        )
        const list = Array.isArray(res) ? res : (res.data ?? res.items ?? [])
        return list.map(mapTaskDtoToTask)
      },
    })),
  })

  const tasks = taskQueries.flatMap((query) => query.data ?? [])

  // BE chỉ nhận/duyệt đơn khi task còn ở trạng thái OPEN (EnsurePlanningCanBeUpdated)
  // → chỉ gọi /tasks/{id}/applications cho các task đó, tránh N request vô ích.
  const openTasks = tasks.filter((task) => task.backendStatus === 'OPEN')

  const applicationQueries = useQueries({
    queries: openTasks.map((task) => ({
      queryKey: ['tasks', 'applications', task.id],
      queryFn: async () => {
        const res = await apiPaged<TaskApplicationDto>(
          `/api/v1/tasks/${task.id}/applications?size=100`,
        )
        return res.data.map((application) => ({ ...application, taskName: task.title }))
      },
    })),
  })

  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])

  const rows = applicationQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => (b.requestedAt ?? '').localeCompare(a.requestedAt ?? ''))

  const isLoading = taskQueries.some((query) => query.isPending)

  const review = async (row: ApplicationRow, approveIt: boolean) => {
    try {
      if (approveIt) {
        await approve.mutateAsync({
          applicationId: row.id,
          taskId: row.taskId,
          version: row.version,
        })
        toast(t('features.volunteers.regApproved'))
      } else {
        await reject.mutateAsync({
          applicationId: row.id,
          taskId: row.taskId,
          version: row.version,
          reason: t('features.volunteers.regRejectReason'),
        })
        toast(t('features.volunteers.regRejected'))
      }
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  const columns = [
    {
      key: 'taskName',
      header: t('features.tasks.title'),
      render: (row: ApplicationRow) => <span className="font-semibold">{row.taskName}</span>,
    },
    {
      key: 'volunteerId',
      header: t('features.tasks.volunteer'),
      render: (row: ApplicationRow) => userNameById.get(row.volunteerId) ?? row.volunteerId,
    },
    {
      key: 'requestedAt',
      header: t('features.volunteers.requestedAt'),
      align: 'right' as const,
      render: (row: ApplicationRow) =>
        row.requestedAt ? <span className="tabular">{viDateTime(row.requestedAt)}</span> : '—',
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: ApplicationRow) => <StatusTag status={row.status} />,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right' as const,
      render: (row: ApplicationRow) =>
        row.status === 'PENDING' ? (
          <span className="flex justify-end gap-1.5">
            <Button
              size="sm"
              disabled={approve.isPending}
              onClick={() => review(row, true)}
              title={t('features.volunteers.approve')}
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={reject.isPending}
              onClick={() => review(row, false)}
              title={t('features.volunteers.reject')}
            >
              <X className="size-4" />
            </Button>
          </span>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.volunteers.regsTitle')}
        sub={t('features.volunteers.regsSub')}
      />

      <Card className="p-5">
        <DataTable
          rows={rows}
          columns={columns}
          pageSize={10}
          emptyText={
            isLoading ? t('common.loading') : t('features.volunteers.regsEmpty')
          }
        />
      </Card>
    </div>
  )
}
