// Báo cáo — BE Reporting service. Một endpoint cho mỗi loại báo cáo, trả
// `ReportDataDto` tổng quát (columns + rows + totals + notes) nên FE render động.
import { useQuery } from '@tanstack/react-query'
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