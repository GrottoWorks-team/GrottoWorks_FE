// Reports domain (task 11) — không CRUD riêng: mọi số liệu tổng hợp từ các
// resource có sẵn qua CRUD generic của handlers.ts (pattern endpoint có
// sẵn, KHÔNG đụng handlers). Aggregate/join chạy client-side trong page
// (≤ vài trăm dòng — quy ước ponytail của repo).
import { useQuery } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import { normalizeRole } from '@/lib/auth'
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

export const reportKeys = { all: ['reports'] as const }

/** `UserSummary` của BE (`GET /api/v1/users`) — KHÔNG phải `User` của FE. */
interface ReportUserDto {
  id: string
  displayName: string
  email: string
  phone?: string | null
  role: string
  status: string
  communityId?: string | null
  skillIds?: string[]
}

function toReportUser(dto: ReportUserDto): User {
  return {
    id: dto.id,
    name: dto.displayName || dto.email,
    email: dto.email,
    role: normalizeRole(dto.role),
    communityId: dto.communityId ?? undefined,
    locked: dto.status?.toUpperCase() === 'LOCKED',
    skills: [],
    skillIds: dto.skillIds ?? [],
    // BE chưa có điểm thưởng (service Volunteer/Reward chưa gắn).
    points: 0,
    avatarHue: 45,
  }
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
}

// Hàng Bảng vinh danh: 1 TNV — điểm (User.points), tổng giờ công, số quà
// tặng đã trao, số nhiệm vụ DONE có tham gia.
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

// 1 query duy nhất cho cả trang — mọi bảng tổng kết + RecognitionBoard ăn
// chung 1 request batch (Promise.all), tránh waterfall 8 query riêng lẻ.
export function useReportData() {
  return useQuery({
    queryKey: reportKeys.all,
    queryFn: async (): Promise<ReportData> => {
      const [purchaseRecords, donations, timesheets, tasks, userPage, communities, areas, materialPage] =
        await Promise.all([
          api<PurchaseRecord[]>('/purchaseRecords'),
          api<Donation[]>('/donations'),
          api<Timesheet[]>('/timesheets'),
          api<Task[]>('/tasks'),
          apiPaged<ReportUserDto>('/api/v1/users?size=100'),
          api<Community[]>('/communities'),
          api<WorkArea[]>('/areas'),
          apiPaged<Material>('/api/v1/materials?size=100'),
        ])
      return {
        purchaseRecords,
        donations,
        timesheets,
        tasks,
        users: userPage.data.map(toReportUser),
        communities,
        areas,
        materials: materialPage.data,
      }
    },
  })
}
