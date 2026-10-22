// Dashboard dùng dữ liệu THẬT hiện có của BE:
//   GET /api/v1/seasons                          (mùa — nguồn của header chọn mùa)
//   GET /api/v1/seasons/{seasonId}/work-areas     (khu vực của mùa đang chọn)
//   GET /api/v1/users                             (tên leader/officer; ADMIN → /admin/users)
//   GET /api/v1/parishes/{parishId}/communities   (cộng đoàn)
//
// Các chỉ số còn thiếu endpoint ở BE (vật tư thiếu, đơn mua chờ duyệt, % quyên góp,
// giờ công tuần, checklist…) — xem BE-gap-requests-activity-flows.md §2 — nên
// dashboard KHÔNG hiển thị số giả, chỉ hiện phần suy ra được từ dữ liệu thật.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useScopedAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useCommunities } from '@/features/communities/api'
import type { ActivityLog, WorkArea } from '@/types'

export const dashboardKeys = {
  activity: ['activity'] as const,
}

// BE chưa có Reporting service → `/api/activity` chưa tồn tại. Để false để không
// gọi 404 trên MỌI trang (mọi trang đều render NotificationsDropdown).
const ACTIVITY_API_AVAILABLE = false

// 50 dòng activity mới nhất (GET /api/activity) — bật khi BE có endpoint.
export function useActivity() {
  return useQuery({
    queryKey: dashboardKeys.activity,
    enabled: ACTIVITY_API_AVAILABLE,
    queryFn: () => api<ActivityLog[]>('/activity'),
  })
}

export interface AreaCoverage {
  total: number
  missingLeader: number
  missingMaterialOfficer: number
  /** Khu đã có đủ trưởng khu + trưởng nhóm vật tư. */
  fullyStaffed: number
  byStatus: Record<string, number>
}

/** Thống kê độ phủ của danh sách khu vực — thuần tính toán, không gọi mạng. */
export function areaCoverage(areas: WorkArea[]): AreaCoverage {
  const byStatus: Record<string, number> = {}
  let missingLeader = 0
  let missingMaterialOfficer = 0
  let fullyStaffed = 0

  for (const area of areas) {
    byStatus[area.status] = (byStatus[area.status] ?? 0) + 1
    if (!area.leaderId) missingLeader += 1
    if (!area.officerId) missingMaterialOfficer += 1
    if (area.leaderId && area.officerId) fullyStaffed += 1
  }

  return { total: areas.length, missingLeader, missingMaterialOfficer, fullyStaffed, byStatus }
}

/**
 * Dữ liệu nền cho dashboard của 4 role: khu vực trong mùa đang chọn (đã lọc theo
 * role), thống kê độ phủ, map id → tên để hiển thị leader / officer / cộng đoàn.
 * Không phụ thuộc endpoint `/api/dashboard/*` (BE chưa có).
 */
export function useDashboardData(options: { withCommunities?: boolean } = {}) {
  const { user } = useAuth()
  const { data: allAreas = [], isPending: areasPending } = useScopedAreas()
  // Chỉ cần tên người dùng → bỏ request danh mục kỹ năng.
  const { data: users = [] } = useUsers({ withSkills: false })
  const { data: communities = [] } = useCommunities({ enabled: options.withCommunities ?? false })

  // Khu vực theo phạm vi role: LEADER → khu mình lãnh, MO → khu mình phụ trách vật tư.
  const areas = useMemo(() => {
    if (!user) return []
    if (user.role === 'LEADER') return allAreas.filter((a) => a.leaderId === user.id)
    if (user.role === 'MATERIAL_OFFICER') return allAreas.filter((a) => a.officerId === user.id)
    return allAreas
  }, [allAreas, user])

  const coverage = useMemo(() => areaCoverage(areas), [areas])
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const communityNameById = useMemo(
    () => new Map(communities.map((c) => [c.id, c.name])),
    [communities],
  )

  return {
    user,
    areas,
    coverage,
    communities,
    userNameById,
    communityNameById,
    isPending: areasPending,
  }
}
