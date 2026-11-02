import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Community,
  Donation,
  Material,
  PurchaseRecord,
  Task,
  Timesheet,
  User,
  WorkArea,
} from '@/types'

export const reportKeys = {
  all: ['reports'] as const,
  operational: (type: string, seasonId?: string) => ['reports', type, seasonId] as const,
  recognition: (seasonId?: string) => ['recognition', seasonId] as const,
}

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

export interface ReportData {
  purchaseRecords: PurchaseRecord[]
  donations: Donation[]
  timesheets: Timesheet[]
  tasks: Task[]
  users: User[]
  communities: Community[]
  areas: WorkArea[]
  materials: Material[]
  operational?: {
    tasks?: OperationalReportDto
    purchases?: OperationalReportDto
    contributions?: OperationalReportDto
    attendance?: OperationalReportDto
    materials?: OperationalReportDto
    readiness?: OperationalReportDto
    recognition?: RecognitionRankingDto
  }
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

export function useReportData(seasonIdParam?: string) {
  return useQuery({
    queryKey: [...reportKeys.all, seasonIdParam],
    queryFn: async (): Promise<ReportData> => {
      const sid = seasonIdParam || '44444444-4444-4444-4444-444444444444'
      const [
        tasksRes,
        materialsReportRes,
        purchasesRes,
        contributionsRes,
        attendanceRes,
        readinessRes,
        recRes,
        usersRes,
        materialsRes,
      ] = await Promise.allSettled([
        api<OperationalReportDto>(`/api/v1/reports/tasks?seasonId=${sid}`),
        api<OperationalReportDto>(`/api/v1/reports/materials?seasonId=${sid}`),
        api<OperationalReportDto>(`/api/v1/reports/purchases?seasonId=${sid}`),
        api<OperationalReportDto>(`/api/v1/reports/contributions?seasonId=${sid}`),
        api<OperationalReportDto>(`/api/v1/reports/attendance?seasonId=${sid}`),
        api<OperationalReportDto>(`/api/v1/reports/readiness?seasonId=${sid}`),
        api<RecognitionRankingDto>(`/api/v1/seasons/${sid}/recognition`),
        api<User[]>('/api/v1/users'),
        api<Material[]>('/api/v1/materials'),
      ])

      const tasksReport = tasksRes.status === 'fulfilled' ? tasksRes.value : undefined
      const purchasesReport = purchasesRes.status === 'fulfilled' ? purchasesRes.value : undefined
      const contributionsReport = contributionsRes.status === 'fulfilled' ? contributionsRes.value : undefined
      const attendanceReport = attendanceRes.status === 'fulfilled' ? attendanceRes.value : undefined
      const materialsReport = materialsReportRes.status === 'fulfilled' ? materialsReportRes.value : undefined
      const readinessReport = readinessRes.status === 'fulfilled' ? readinessRes.value : undefined
      const recognition = recRes.status === 'fulfilled' ? recRes.value : undefined
      const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value) ? usersRes.value : []
      const materials = materialsRes.status === 'fulfilled' && Array.isArray(materialsRes.value) ? materialsRes.value : []

      return {
        purchaseRecords: [],
        donations: [],
        timesheets: [],
        tasks: [],
        users,
        communities: [],
        areas: [],
        materials,
        operational: {
          tasks: tasksReport,
          purchases: purchasesReport,
          contributions: contributionsReport,
          attendance: attendanceReport,
          materials: materialsReport,
          readiness: readinessReport,
          recognition,
        },
      }
    },
  })
}
