// Báo cáo — BE Reporting service. Một endpoint cho mỗi loại báo cáo, trả
// `ReportDataDto` tổng quát (columns + rows + totals + notes) nên FE render động.
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ReportType = 'TASKS' | 'MATERIALS' | 'PURCHASES' | 'CONTRIBUTIONS' | 'ATTENDANCE' | 'READINESS'

export interface ReportColumn {
  key: string
  label: string
  unit?: string | null
}

export interface ReportFilters {
  seasonId: string
  workAreaId?: string | null
  communityId?: string | null
  from?: string | null
  to?: string | null
}

export interface ReportData {
  reportType: ReportType
  parishId: string
  seasonId: string
  generatedAt: string
  generatedBy: string
  scope: string
  filters: ReportFilters
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
  totals: Record<string, unknown>
  notes: string[]
}

const PATHS: Record<ReportType, string> = {
  TASKS: 'tasks',
  MATERIALS: 'materials',
  PURCHASES: 'purchases',
  CONTRIBUTIONS: 'contributions',
  ATTENDANCE: 'attendance',
  READINESS: 'readiness',
}

export const reportKeys = {
  data: (params: ReportQuery) => ['reports', 'data', params] as const,
}

export interface ReportQuery {
  type: ReportType
  seasonId?: string
  workAreaId?: string
  communityId?: string
  from?: string
  to?: string
}

export function useReportData(params: ReportQuery) {
  return useQuery({
    queryKey: reportKeys.data(params),
    queryFn: async () => {
      const q = new URLSearchParams({ seasonId: params.seasonId ?? '' })
      if (params.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params.communityId) q.set('communityId', params.communityId)
      if (params.from) q.set('from', params.from)
      if (params.to) q.set('to', params.to)
      return api<ReportData>(`/api/v1/reports/${PATHS[params.type]}?${q.toString()}`)
    },
    enabled: Boolean(params.seasonId),
  })
}

/* ------------------------------------------------------------------------ */
/* Xuất báo cáo bất đồng bộ — Reporting F-RPT-06                             */
/*   POST /api/v1/report-exports        → 202 { jobId, status }              */
/*   GET  /api/v1/report-exports/{id}   → trạng thái job                     */
/*   GET  /api/v1/report-exports/{id}/file → tệp nhị phân                    */
/* ------------------------------------------------------------------------ */

export type ExportFormat = 'XLSX' | 'PDF' | 'CSV'
export type ExportStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface ExportJobDto {
  id: string
  reportType: ReportType
  format: ExportFormat
  status: ExportStatus
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
  downloadUrl?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
}

export function useCreateReportExport() {
  return useMutation({
    mutationFn: (payload: {
      reportType: ReportType
      format?: ExportFormat
      seasonId: string
      workAreaId?: string
      communityId?: string
      from?: string
      to?: string
    }) =>
      api<ExportJobDto>('/api/v1/report-exports', {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ ...payload, format: payload.format ?? 'XLSX' }),
      }),
  })
}

export function useReportExportJob(jobId?: string) {
  return useQuery({
    queryKey: ['report-exports', jobId ?? ''],
    queryFn: () => api<ExportJobDto>(`/api/v1/report-exports/${jobId}`),
    enabled: Boolean(jobId),
    // BE giới hạn 3 request/phút cho system-jobs → không auto-poll dày.
    retry: false,
    refetchInterval: false,
  })
}

/** Tải tệp xuất — endpoint trả nhị phân nên phải đi qua fetch + blob. */
export async function downloadReportExport(jobId: string, fileName: string): Promise<void> {
  const token = localStorage.getItem('grotto-token')
  const res = await fetch(`/api/v1/report-exports/${jobId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}