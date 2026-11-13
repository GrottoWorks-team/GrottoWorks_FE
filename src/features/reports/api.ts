// Báo cáo — BE Reporting service. Một endpoint cho mỗi loại báo cáo, trả
// `ReportDataDto` tổng quát (columns + rows + totals + notes) nên FE render động.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CreateReportExportRequest,
  ReportExportJobDto,
  SystemExportRequest,
  SystemJobDto,
} from '@/types'

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
  operational: (type: string, seasonId?: string) => ['reports', 'operational', type, seasonId] as const,
  recognition: (seasonId?: string) => ['reports', 'recognition', seasonId] as const,
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

// ══════ Bổ sung từ nhánh khoa ══════

export interface ReportColumnDto {

  key: string

  label: string

  unit?: string | null

}

export interface OperationalReportDto {

  reportType: string

  parishId: string

  seasonId: string

  generatedAt: string

  generatedBy: string

  scope: string

  columns: ReportColumnDto[]

  rows: Record<string, unknown>[]

  totals: Record<string, unknown>

  notes: string[]

}

export interface RecognitionRankingItem {

  volunteerId: string

  displayName: string

  points: number

  hours: number

  contributions: number

  tasksCompleted: number

  rank: number

}

export interface RecognitionRankingDto {

  seasonId: string

  parishId: string

  totalPoints: number

  contributions: number

  externalDonorContributions: number

  contributors: number

  ranking: RecognitionRankingItem[]

  generatedAt: string

}

export interface ContributorRow {

  id: string

  name: string

  avatarHue: number

  communityName: string

  points: number

  hours: number

  contributions: number

  tasksDone: number

}

export function useOperationalReport(

  type: 'tasks' | 'materials' | 'purchases' | 'contributions' | 'attendance' | 'readiness',

  seasonId?: string,

) {

  return useQuery({

    queryKey: reportKeys.operational(type, seasonId),

    queryFn: () => api<OperationalReportDto>(`/api/v1/reports/${type}?seasonId=${seasonId}`),

    enabled: Boolean(seasonId),

  })

}

export function useSeasonRecognition(seasonId?: string) {

  return useQuery({

    queryKey: reportKeys.recognition(seasonId),

    queryFn: () => api<RecognitionRankingDto>(`/api/v1/seasons/${seasonId}/recognition`),

    enabled: Boolean(seasonId),

  })

}

export const exportKeys = {

  all: ['report-exports'] as const,

  detail: (id: string) => ['report-exports', id] as const,

  systemData: ['system-data-exports'] as const,

}



/** Tạo yêu cầu xuất báo cáo bất đồng bộ (POST /api/v1/report-exports) */

export async function createReportExport(

  payload: CreateReportExportRequest,

): Promise<ReportExportJobDto> {

  return api<ReportExportJobDto>('/api/v1/report-exports', {

    method: 'POST',

    body: JSON.stringify(payload),

  })

}



/** Lấy trạng thái công việc xuất báo cáo (GET /api/v1/report-exports/{id}) */

export async function getReportExportJob(jobId: string): Promise<ReportExportJobDto> {

  return api<ReportExportJobDto>(`/api/v1/report-exports/${jobId}`)

}



/** URL tải tệp báo cáo hoàn thành (GET /api/v1/report-exports/{id}/file) */

export function getReportExportFileUrl(jobId: string): string {

  return `/api/v1/report-exports/${jobId}/file`

}



/** Tạo yêu cầu xuất toàn bộ dữ liệu hệ thống cho Admin (POST /api/v1/system-data-exports) */

export async function createSystemDataExport(

  payload?: SystemExportRequest,

): Promise<SystemJobDto> {

  return api<SystemJobDto>('/api/v1/system-data-exports', {

    method: 'POST',

    body: JSON.stringify(payload ?? {}),

  })

}

export function useCreateSystemDataExport() {

  const queryClient = useQueryClient()

  return useMutation({

    mutationFn: (payload?: SystemExportRequest) => createSystemDataExport(payload),

    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: exportKeys.systemData })

    },

  })

}

