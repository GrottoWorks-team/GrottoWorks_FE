// Dashboards domain — query key ['dashboard', <role>] theo contract chung.
// 3 summary endpoint đã có sẵn trong src/mocks/handlers.ts (committeeSummary/
// leaderSummary/material-officerSummary), FE chỉ bọc useQuery. "Tuần hiện tại" phía
// server = 7 ngày tính từ ngày chấm công cuối của db (weekFrom, handlers.ts).
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ActivityLog, WorkArea } from '@/types'

export const dashboardKeys = {
  committee: ['dashboard', 'committee'] as const,
  leader: ['dashboard', 'leader'] as const,
  officer: ['dashboard', 'officer'] as const,
}

// CommitteeSummary.areas là bản rút gọn WorkArea (không có type/level/ids).
export interface CommitteeSummary {
  materialsShortage: number
  pendingPurchases: number
  donationPercent: number
  weekHours: number
  pendingVolunteers: number
  openSupportRequests: number
  areas: Pick<
    WorkArea,
    'id' | 'name' | 'progress' | 'status' | 'volunteerCount' | 'taskCount'
  >[]
}

export interface LeaderSummary {
  area: WorkArea | null
  taskCounts: Record<string, number>
  volunteerCount: number
  materialsShortage: number
  weekHours: number
  pendingVolunteers: number
  checklist: { done: number; total: number }
}

export interface OfficerSummary {
  area: WorkArea | null
  shortageList: { id: string; name: string; unit: string; short: number; status: string }[]
  pendingPurchases: { id: string; total: number; note?: string }[]
  weekHours: number
}

export function useCommitteeSummary() {
  return useQuery({
    queryKey: dashboardKeys.committee,
    queryFn: () => api<CommitteeSummary>('/dashboard/community'),
  })
}

// Leader/material-officer endpoint suy người dùng từ Bearer token; không có token
// (chưa đăng nhập / trong test) → mock fallback leader/material-officer đầu tiên.
export function useLeaderSummary() {
  return useQuery({
    queryKey: dashboardKeys.leader,
    queryFn: () => api<LeaderSummary>('/dashboard/leader'),
  })
}

export function useOfficerSummary() {
  return useQuery({
    queryKey: dashboardKeys.officer,
    queryFn: () => api<OfficerSummary>('/dashboard/material-officer'),
  })
}

// 50 dòng activity mới nhất (GET /api/activity) — dùng cho bảng "Việc cần
// chú ý" của committee. Query key 'activity' riêng vì endpoint không trùng
// resource seed nào (seed key là activityLogs).
export function useActivity() {
  return useQuery({
    queryKey: ['activity'],
    queryFn: () => api<ActivityLog[]>('/activity'),
  })
}
