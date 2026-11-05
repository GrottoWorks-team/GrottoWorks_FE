// Dashboard dùng dữ liệu THẬT của BE:
//   GET /api/v1/dashboards/season?seasonId=      (PARISH — ban hành giáo)
//   GET /api/v1/dashboards/work-area?workAreaId= (LEADER của khu)
//   GET /api/v1/dashboards/materials?seasonId=|workAreaId= (MO)
//   GET /api/v1/seasons                          (mùa — nguồn của header chọn mùa)
//   GET /api/v1/seasons/{seasonId}/work-areas     (khu vực của mùa đang chọn)
//   GET /api/v1/users                             (tên leader/officer; ADMIN → /admin/users)
//   GET /api/v1/parishes/{parishId}/communities   (cộng đoàn)
//
// Các chỉ số tính từ read-model của Reporting; khi read-model chưa nhận event
// (task_projection rỗng) BE trả 0 chứ không phải số giả.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useScopedAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useCommunities } from '@/features/communities/api'
import type { WorkArea } from '@/types'

export const dashboardKeys = {
  activity: ['activity'] as const,
  season: (seasonId: string) => ['dashboards', 'season', seasonId] as const,
  workArea: (workAreaId: string) => ['dashboards', 'work-area', workAreaId] as const,
  materials: (seasonId?: string, workAreaId?: string) =>
    ['dashboards', 'materials', seasonId ?? '', workAreaId ?? ''] as const,
}

export interface TaskSummaryDto {
  total: number
  byStatus: Record<string, number>
  unassigned: number
  overdue: number
  revisionRequired: number
  completed: number
  progressPercent: number
}

export interface MaterialSummaryDto {
  lines: number
  linesWithShortage: number
  pledgedLines: number
}

export interface PurchaseSummaryDto {
  pendingApproval: number
  inProgress: number
  completed: number
  rejected: number
  estimatedApproved: number
  actualCost: number
}

export interface DonationSummaryDto {
  openPledges: number
  openPledgedMoney: number
  receivedMoney: number
  receivedUsableQuantity: number
  receivedUnusableQuantity: number
}

export interface VolunteerSummaryDto {
  assigned: number
  withApprovedHours: number
  approvedHours: number
  participationPercent: number
}

export interface ReadinessSummaryDto {
  ready: number
  needsCorrection: number
  reopened: number
  withoutResult: number
  failedMandatoryItems: number
}

export interface AreaSummaryDto {
  workAreas: number
  workAreasByStatus: Record<string, number>
  tasks: TaskSummaryDto
  materials: MaterialSummaryDto
  purchases: PurchaseSummaryDto
  donations: DonationSummaryDto
  volunteers: VolunteerSummaryDto
  readiness: ReadinessSummaryDto
  notAvailable: string[]
}

export interface CommunityProgressDto {
  communityId?: string | null
  workAreas: number
  tasks: number
  completed: number
  progressPercent: number
}

export interface WorkAreaProgressDto {
  workAreaId: string
  name: string
  status: string
  tasks: number
  completed: number
  progressPercent: number
  readiness?: string | null
}

export interface SeasonDashboardDto {
  seasonId: string
  parishId: string
  generatedAt: string
  summary: AreaSummaryDto
  communities: CommunityProgressDto[]
  workAreas: WorkAreaProgressDto[]
}

export interface WorkAreaDashboardDto {
  workAreaId: string
  name: string
  status: string
  seasonId: string
  generatedAt: string
  summary: AreaSummaryDto
}

export interface MaterialLineDto {
  workAreaId: string
  workAreaName: string
  materialId: string
  materialCode?: string | null
  materialName?: string | null
  unit?: string | null
  required: number
  confirmedAvailable: number
  shortage: number
  pledged: number
  donatedUsable: number
  purchasedUsable: number
}

export interface MaterialDashboardDto {
  seasonId: string
  generatedAt: string
  workAreaIds: string[]
  lines: MaterialLineDto[]
  purchases: PurchaseSummaryDto
  donations: DonationSummaryDto
}

export function useSeasonDashboard(seasonId?: string) {
  return useQuery({
    queryKey: dashboardKeys.season(seasonId ?? ''),
    queryFn: () =>
      api<SeasonDashboardDto>(`/api/v1/dashboards/season?seasonId=${seasonId}`),
    enabled: Boolean(seasonId),
  })
}

export function useWorkAreaDashboard(workAreaId?: string) {
  return useQuery({
    queryKey: dashboardKeys.workArea(workAreaId ?? ''),
    queryFn: () =>
      api<WorkAreaDashboardDto>(`/api/v1/dashboards/work-area?workAreaId=${workAreaId}`),
    enabled: Boolean(workAreaId),
  })
}

export function useMaterialDashboard(params: { seasonId?: string; workAreaId?: string }) {
  const { seasonId, workAreaId } = params
  const qs = workAreaId ? `workAreaId=${workAreaId}` : `seasonId=${seasonId}`
  return useQuery({
    queryKey: dashboardKeys.materials(seasonId, workAreaId),
    queryFn: () => api<MaterialDashboardDto>(`/api/v1/dashboards/materials?${qs}`),
    enabled: Boolean(seasonId || workAreaId),
  })
}

// Activity log đã có API thật ở NotificationAudit (`/api/v1/activity-logs`) và
// được dùng qua `useActivityLogs` ở trang /parish/activity. Dashboard không gọi
// endpoint riêng nữa.

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
