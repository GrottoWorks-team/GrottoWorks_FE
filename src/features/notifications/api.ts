// Nguồn của chuông thông báo trên header.
//
// BE hiện CHƯA có service Notification:
//   - `notify_db` tồn tại nhưng 0 bảng, không có project Notification trong solution
//   - gateway (YarpApiGateway/appsettings.json) không route `/api/v1/notifications`
//     hay `/api/v1/activity`
//   - ParishCoordination không có Contracts/event nên thao tác phân công khu vực
//     (PUT /work-areas/{id}/leader, .../material-officer) KHÔNG phát sự kiện nào
// → vì vậy chuông không thể lấy "thông báo" từ server. Chi tiết đã ghi trong
//   BE-gap-requests-activity-flows.md §6.
//
// Trong khi chờ BE, feed được SUY RA từ dữ liệu THẬT đang có (không mock):
//   GET /api/v1/seasons/{seasonId}/work-areas  → khu tôi được phân công
//                                               (leader/officer) + khu thiếu nhân sự
//   GET /api/v1/purchase-requests?status=PENDING_APPROVAL → đơn chờ duyệt
// Mỗi mục có `id` ổn định (khoá localStorage "đã đọc"), nên dot đỏ vẫn đúng.
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { roleHomePath } from '@/lib/roles'
import { useAreas } from '@/features/areas/api'
import { useSeasonContext } from '@/features/season/season-context'

export type FeedKind =
  | 'ASSIGNED_LEADER'
  | 'ASSIGNED_OFFICER'
  | 'AREA_MISSING_LEADER'
  | 'AREA_MISSING_OFFICER'
  | 'PURCHASE_PENDING'

export interface FeedItem {
  /** Id ổn định — dùng để so "đã đọc" (không phụ thuộc đồng hồ). */
  id: string
  kind: FeedKind
  areaName?: string
  areaStatus?: string
  count?: number
  /** Bấm vào mục thì mở trang nghiệp vụ tương ứng. */
  href?: string
}

export interface NotificationFeed {
  items: FeedItem[]
  isPending: boolean
}

/**
 * Gom sự kiện hiển thị ở chuông cho role đang đăng nhập.
 * `key` query của purchase-requests trùng với AppShell (badge) nên React Query
 * chỉ gọi mạng MỘT lần.
 */
export function useNotificationFeed(): NotificationFeed {
  const { user } = useAuth()
  const role = user?.role ?? 'COMMUNITY'
  const { seasonId } = useSeasonContext()

  // Chỉ 3 role cận nghiệp vụ cần đọc work-areas; PARISH (quản trị) không có
  // khung chọn mùa nên tránh gọi hết mọi mùa (N+1) trên mọi trang.
  const needsAreas = role === 'LEADER' || role === 'MATERIAL_OFFICER' || role === 'COMMUNITY'
  const { data: areas = [], isPending: areasPending } = useAreas(
    needsAreas ? (seasonId ? [seasonId] : undefined) : [],
  )

  // Chỉ Trưởng nhóm vật tư có trang "Yêu cầu mua" trong FE → chỉ role này cần
  // badge/feed đơn chờ duyệt (LEADER/COMMUNITY dùng badge riêng của AppShell).
  const canReadPurchases = role === 'MATERIAL_OFFICER'
  const { data: pendingPurchases = [], isPending: purchasesPending } = useQuery({
    queryKey: ['purchaseRequests', 'pendingApproval'],
    enabled: canReadPurchases,
    queryFn: () =>
      api<{ id: string }[]>('/api/v1/purchase-requests?status=PENDING_APPROVAL&size=50'),
  })

  const items = useMemo<FeedItem[]>(() => {
    const out: FeedItem[] = []
    const uid = user?.id ?? ''

    if (role === 'LEADER' || role === 'MATERIAL_OFFICER') {
      const isLeader = role === 'LEADER'
      for (const a of areas) {
        const mine = isLeader ? a.leaderId === uid : a.officerId === uid
        if (!mine) continue
        out.push({
          id: `${isLeader ? 'assigned-leader' : 'assigned-officer'}:${a.id}`,
          kind: isLeader ? 'ASSIGNED_LEADER' : 'ASSIGNED_OFFICER',
          areaName: a.name,
          areaStatus: a.status,
          href: roleHomePath(role),
        })
      }
    }

    // Ban hành giáo điều phối: nhắc khu còn trống vị trí.
    if (role === 'COMMUNITY') {
      for (const a of areas) {
        if (!a.leaderId) {
          out.push({
            id: `missing-leader:${a.id}`,
            kind: 'AREA_MISSING_LEADER',
            areaName: a.name,
            areaStatus: a.status,
            href: '/community/areas',
          })
        }
        if (!a.officerId) {
          out.push({
            id: `missing-officer:${a.id}`,
            kind: 'AREA_MISSING_OFFICER',
            areaName: a.name,
            areaStatus: a.status,
            href: '/community/areas',
          })
        }
      }
    }

    if (canReadPurchases && pendingPurchases.length) {
      out.push({
        id: 'purchase-pending',
        kind: 'PURCHASE_PENDING',
        count: pendingPurchases.length,
        href: '/material-officer/purchases',
      })
    }

    return out
  }, [areas, role, user?.id, canReadPurchases, pendingPurchases.length])

  return { items, isPending: areasPending || purchasesPending }
}
