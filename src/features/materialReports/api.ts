// Báo cáo vật tư sau khi làm việc — Resource `/api/v1/tasks/{taskId}/material-reports`
//   GET  /tasks/{taskId}/material-reports            (LEADER, MO, VOLUNTEER)
//   POST /task-material-reports/{reportId}/verify    (MO)
//   POST /task-material-reports/{reportId}/request-revision (MO)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface TaskMaterialReportItemDto {
  id: string
  materialAllocationItemId: string
  materialId: string
  materialCode?: string | null
  materialName: string
  unit?: string | null
  allocatedQuantity: number
  reportedRemainingQuantity: number
  reportedDamagedQuantity: number
  reportedLostQuantity: number
  verifiedRemainingQuantity?: number | null
  verifiedDamagedQuantity?: number | null
  verifiedLostQuantity?: number | null
  note?: string | null
}

export interface TaskMaterialReportDto {
  id: string
  taskId: string
  taskName: string
  workAreaId: string
  reportedBy: string
  verifiedBy?: string | null
  status: 'PENDING' | 'VERIFIED' | 'REVISION_REQUIRED' | string
  note?: string | null
  revisionReason?: string | null
  reportedAt: string
  verifiedAt?: string | null
  items: TaskMaterialReportItemDto[]
  version: number
}

export const materialReportKeys = {
  byTask: (taskId: string) => ['material-reports', taskId] as const,
}

export function useTaskMaterialReports(taskId?: string) {
  return useQuery({
    queryKey: materialReportKeys.byTask(taskId ?? ''),
    queryFn: async () => {
      const res = await api<TaskMaterialReportDto[] | { data?: TaskMaterialReportDto[] }>(
        `/api/v1/tasks/${taskId}/material-reports`,
      )
      return Array.isArray(res) ? res : (res.data ?? [])
    },
    enabled: Boolean(taskId),
  })
}

function useMaterialReportMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      const report = result as unknown as TaskMaterialReportDto | undefined
      if (report?.taskId) {
        void qc.invalidateQueries({ queryKey: materialReportKeys.byTask(report.taskId) })
      }
      void qc.invalidateQueries({ queryKey: ['material-reports'] })
      void qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export interface VerifiedLineInput {
  reportItemId: string
  remainingQuantity: number
  damagedQuantity: number
  lostQuantity: number
}

/** POST /task-material-reports/{id}/verify (MO) — xác nhận số lượng thực tế. */
export function useVerifyMaterialReport() {
  return useMaterialReportMutation(
    ({ reportId, version, items }: { reportId: string; version: number; items: VerifiedLineInput[] }) =>
      api<TaskMaterialReportDto>(`/api/v1/task-material-reports/${reportId}/verify`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, items }),
      }),
  )
}

/** POST /task-material-reports/{id}/request-revision (MO) — trả báo cáo để TNV sửa. */
export function useRequestMaterialReportRevision() {
  return useMaterialReportMutation(
    ({ reportId, version, reason }: { reportId: string; version: number; reason: string }) =>
      api<TaskMaterialReportDto>(`/api/v1/task-material-reports/${reportId}/request-revision`, {
        method: 'POST',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, reason }),
      }),
  )
}
