// Báo cáo vật tư của các việc trong khu mình phụ trách (/material-officer/material-reports).
// MO xác nhận số lượng thực tế (verify) hoặc yêu cầu TNV làm lại báo cáo.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError, api } from '@/lib/api'
import { viDateTime } from '@/lib/format'
import { useScopedAreas } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import { mapTaskDtoToTask, type TaskDto } from '@/features/tasks/api'
import {
  useRequestMaterialReportRevision,
  useVerifyMaterialReport,
  type TaskMaterialReportDto,
} from '../api'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface ReportRow extends TaskMaterialReportDto {
  areaName: string
}

export default function MaterialReportsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [] } = useScopedAreas()
  const myAreas = useMemo(
    () => areas.filter((area) => area.officerId === user?.id),
    [areas, user?.id],
  )

  const taskQueries = useQueries({
    queries: myAreas.map((area) => ({
      queryKey: ['tasks', 'area', area.id],
      queryFn: async () => {
        const res = await api<{ data?: TaskDto[] } | TaskDto[]>(
          `/api/v1/work-areas/${area.id}/tasks?size=100`,
        )
        const list = Array.isArray(res) ? res : (res.data ?? [])
        return list.map(mapTaskDtoToTask).map((task) => ({ ...task, areaName: area.name }))
      },
    })),
  })

  const tasks = taskQueries.flatMap((query) => query.data ?? [])

  // BE chỉ cho ghi báo cáo vật tư khi task đã COMPLETED (BR-44) → chỉ gọi
  // /tasks/{id}/material-reports cho các task đó thay vì toàn bộ task của khu.
  const completedTasks = tasks.filter((task) => task.backendStatus === 'COMPLETED')

  const reportQueries = useQueries({
    queries: completedTasks.map((task) => ({
      queryKey: ['material-reports', task.id],
      queryFn: async () => {
        const res = await api<TaskMaterialReportDto[] | { data?: TaskMaterialReportDto[] }>(
          `/api/v1/tasks/${task.id}/material-reports`,
        )
        const list = Array.isArray(res) ? res : (res.data ?? [])
        return list.map((report) => ({ ...report, areaName: task.areaName }))
      },
    })),
  })

  const rows = reportQueries
    .flatMap((query) => query.data ?? [])
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))

  const verify = useVerifyMaterialReport()
  const requestRevision = useRequestMaterialReportRevision()

  const [verifying, setVerifying] = useState<ReportRow | null>(null)
  const [quantities, setQuantities] = useState<
    Record<string, { remaining: string; damaged: string; lost: string }>
  >({})
  const [revising, setRevising] = useState<ReportRow | null>(null)
  const [revisionReason, setRevisionReason] = useState('')

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  const openVerify = (report: ReportRow) => {
    const next: Record<string, { remaining: string; damaged: string; lost: string }> = {}
    for (const item of report.items) {
      next[item.id] = {
        remaining: String(item.reportedRemainingQuantity),
        damaged: String(item.reportedDamagedQuantity),
        lost: String(item.reportedLostQuantity),
      }
    }
    setQuantities(next)
    setVerifying(report)
  }

  const submitVerify = async () => {
    if (!verifying) return
    try {
      await verify.mutateAsync({
        reportId: verifying.id,
        version: verifying.version,
        items: verifying.items.map((item) => ({
          reportItemId: item.id,
          remainingQuantity: Number(quantities[item.id]?.remaining ?? 0),
          damagedQuantity: Number(quantities[item.id]?.damaged ?? 0),
          lostQuantity: Number(quantities[item.id]?.lost ?? 0),
        })),
      })
      toast(t('features.materialReports.verified'))
      setVerifying(null)
    } catch (error) {
      fail(error)
    }
  }

  const submitRevision = async () => {
    if (!revising) return
    try {
      await requestRevision.mutateAsync({
        reportId: revising.id,
        version: revising.version,
        reason: revisionReason.trim(),
      })
      toast(t('features.materialReports.revisionRequested'))
      setRevising(null)
      setRevisionReason('')
    } catch (error) {
      fail(error)
    }
  }

  const columns = [
    {
      key: 'taskName',
      header: t('features.tasks.title'),
      render: (row: ReportRow) => (
        <div>
          <p className="font-semibold">{row.taskName}</p>
          <p className="text-xs text-muted-foreground">{row.areaName}</p>
        </div>
      ),
    },
    {
      key: 'reportedAt',
      header: t('features.materialReports.reportedAt'),
      render: (row: ReportRow) => <span className="tabular">{viDateTime(row.reportedAt)}</span>,
    },
    {
      key: 'items',
      header: t('features.materialReports.lines'),
      align: 'right' as const,
      render: (row: ReportRow) => <span className="tabular">{row.items.length}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: ReportRow) => <StatusTag status={row.status} />,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right' as const,
      render: (row: ReportRow) =>
        row.status === 'PENDING' ? (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => openVerify(row)}>
              {t('features.materialReports.verify')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRevisionReason('')
                setRevising(row)
              }}
            >
              {t('features.materialReports.requestRevision')}
            </Button>
          </div>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.materialReports.title')}
        sub={t('features.materialReports.sub')}
      />
      <DataTable
        rows={rows}
        columns={columns}
        pageSize={10}
        emptyText={
          reportQueries.some((query) => query.isPending)
            ? t('common.loading')
            : t('features.materialReports.empty')
        }
      />

      {verifying && (
        <Dialog
          open
          onClose={() => setVerifying(null)}
          title={t('features.materialReports.verifyTitle')}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setVerifying(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void submitVerify()} disabled={verify.isPending}>
                {t('features.materialReports.verify')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{verifying.taskName}</p>
            <div className="space-y-2">
              {verifying.items.map((item) => (
                <div key={item.id} className="rounded-md border border-border/60 p-2">
                  <p className="text-sm font-semibold">
                    {item.materialName} <span className="text-xs text-muted-foreground">({item.unit})</span>
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {t('features.materialReports.allocated', { n: item.allocatedQuantity })}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['remaining', 'damaged', 'lost'] as const).map((field) => (
                      <div key={field} className="space-y-1">
                        <Label htmlFor={`${item.id}-${field}`}>
                          {t(`features.materialReports.field.${field}`)}
                        </Label>
                        <Input
                          id={`${item.id}-${field}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={quantities[item.id]?.[field] ?? '0'}
                          onChange={(e) =>
                            setQuantities((prev) => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], [field]: e.target.value },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {revising && (
        <Dialog
          open
          onClose={() => setRevising(null)}
          title={t('features.materialReports.requestRevision')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRevising(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => void submitRevision()}
                disabled={!revisionReason.trim() || requestRevision.isPending}
              >
                {t('features.materialReports.requestRevision')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{revising.taskName}</p>
            <Label htmlFor="report-revision-reason">{t('features.materialReports.reason')}</Label>
            <textarea
              id="report-revision-reason"
              rows={3}
              maxLength={500}
              className={TEXTAREA_CLS}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}
    </div>
  )
}
