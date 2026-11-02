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
      // Không có seasonId thì KHÔNG gọi 7 endpoint báo cáo: BE bắt buộc
      // seasonId nên gọi với id cứng chỉ tạo ra 404 giả hoặc số liệu của mùa
      // khác. Trả mảng rỗng và để trang hiện trạng thái chọn mùa.
      const sid = seasonIdParam
      // Chưa chọn mùa → chỉ lấy danh mục; 7 báo cáo bắt buộc seasonId nên bỏ
      // qua, tránh gửi `seasonId=undefined` lên BE.
      const reportCalls = sid
        ? [
            api<OperationalReportDto>(`/api/v1/reports/tasks?seasonId=${sid}`),
            api<OperationalReportDto>(`/api/v1/reports/materials?seasonId=${sid}`),
            api<OperationalReportDto>(`/api/v1/reports/purchases?seasonId=${sid}`),
            api<OperationalReportDto>(`/api/v1/reports/contributions?seasonId=${sid}`),
            api<OperationalReportDto>(`/api/v1/reports/attendance?seasonId=${sid}`),
            api<OperationalReportDto>(`/api/v1/reports/readiness?seasonId=${sid}`),
            api<RecognitionRankingDto>(`/api/v1/seasons/${sid}/recognition`),
          ]
        : []
      const settled = await Promise.allSettled([
        ...reportCalls,
        api<User[]>('/api/v1/users'),
        api<Material[]>('/api/v1/materials'),
      ])
      // reportCalls rỗng khi chưa chọn mùa → settled[0..6] không tồn tại.
      const report = (i: number): OperationalReportDto | undefined => {
        const row = settled[reportCalls.length ? i : -1]
        return row && row.status === 'fulfilled' ? (row.value as OperationalReportDto) : undefined
      }
      const usersRow = settled[reportCalls.length]
      const materialsRow = settled[reportCalls.length + 1]
      // allSettled() của mảng trộn suy ra User[] | Material[], nên phải ép
      // kiểu tường minh ở từng nhánh thay vì để TS thu hẹp sai.
      const users: User[] =
        usersRow?.status === 'fulfilled' && Array.isArray(usersRow.value) ? (usersRow.value as User[]) : []
      const materials: Material[] =
        materialsRow?.status === 'fulfilled' && Array.isArray(materialsRow.value)
          ? (materialsRow.value as unknown as Material[])
          : []
      const recRow = reportCalls.length ? settled[6] : undefined
      const recognition =
        recRow?.status === 'fulfilled' ? (recRow.value as RecognitionRankingDto) : undefined

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
          tasks: report(0),
          materials: report(1),
          purchases: report(2),
          contributions: report(3),
          attendance: report(4),
          readiness: report(5),
          recognition,
        },
      }
    },
  })
}
