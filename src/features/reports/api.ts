// Reports domain (task 11) — không CRUD riêng: mọi số liệu tổng hợp từ các
// resource có sẵn qua CRUD generic của handlers.ts (pattern endpoint có
// sẵn, KHÔNG đụng handlers). Aggregate/join chạy client-side trong page
// (≤ vài trăm dòng — quy ước ponytail của repo).
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

export const reportKeys = { all: ['reports'] as const }

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

// 1 query duy nhất cho cả trang — chỉ lấy các resource Backend đã có
// (/api/v1/users, /api/v1/materials) phục vụ Bảng vinh danh và lookup vật tư.
// Bỏ 6 route chết (/purchaseRecords, /donations, /timesheets, /tasks, /communities, /areas)
// để tránh làm hỏng toàn bộ batch Promise.all.
export function useReportData() {
  return useQuery({
    queryKey: reportKeys.all,
    queryFn: async (): Promise<ReportData> => {
      const [usersRes, materialsRes] = await Promise.allSettled([
        api<User[]>('/api/v1/users'),
        api<Material[]>('/api/v1/materials'),
      ])
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
      }
    },
  })
}
