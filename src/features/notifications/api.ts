// Nguồn của chuông thông báo trên header và trang Thông báo.
//
// Kết nối trực tiếp NotificationAudit service:
//   - GET /api/v1/notifications?size=50 (NotificationDto)
//   - POST /api/v1/notifications/{id}/read
//   - POST /api/v1/notifications/read-all
// Khi BE chưa có dữ liệu hoặc offline, tự động fallback sang feed suy ra từ:
//   GET /api/v1/seasons/{seasonId}/work-areas + GET /api/v1/purchase-requests
import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { roleHomePath, rolePrefix } from '@/lib/roles'
import { useAreas } from '@/features/areas/api'
import { useSeasonContext } from '@/features/season/season-context'
import type { NotificationDto, Role } from '@/types'
import { markSeen } from './seen'

export type { NotificationDto }

export type FeedKind =
  | 'ASSIGNED_LEADER'
  | 'ASSIGNED_OFFICER'
  | 'AREA_MISSING_LEADER'
  | 'AREA_MISSING_OFFICER'
  | 'PURCHASE_PENDING'
  | 'TASK_ASSIGNED'
  | 'MATERIAL_ALLOCATED'
  | 'SEASON_READY'
  | string

export interface FeedItem {
  /** Id ổn định — dùng để so "đã đọc". */
  id: string
  kind: FeedKind
  title?: string
  body?: string
  areaName?: string
  areaStatus?: string
  count?: number
  /** Bấm vào mục thì mở trang nghiệp vụ tương ứng. */
  href?: string
  isRead?: boolean
  createdAt?: string
  source?: 'BE' | 'DERIVED'
}

export interface NotificationFeed {
  items: FeedItem[]
  isPending: boolean
  isLive?: boolean
  source?: 'BE' | 'DERIVED'
}

function resolveNotifHref(n: NotificationDto, role: Role | string): string {
  const prefix = rolePrefix((role as Role) ?? 'COMMUNITY')
  switch (n.referenceType) {
    case 'TASK':
      return `/${prefix}/tasks`
    case 'ALLOCATION':
      return role === 'MATERIAL_OFFICER' ? '/material-officer/allocations' : `/${prefix}`
    case 'SEASON':
      return role === 'PARISH' ? '/parish/seasons' : `/${prefix}/areas`
    default:
      return roleHomePath((role as Role) ?? 'COMMUNITY')
  }
}

export function useNotifications(filter?: { isRead?: boolean; eventType?: string }) {
  const params = new URLSearchParams()
  if (filter?.isRead !== undefined) params.set('isRead', String(filter.isRead))
  if (filter?.eventType) params.set('eventType', filter.eventType)
  params.set('size', '50')
  const qs = params.toString() ? `?${params.toString()}` : ''

  return useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => api<NotificationDto[]>(`/api/v1/notifications${qs}`),
    staleTime: 10_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      markSeen([id])
      await api<void>(`/api/v1/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (allIds?: string[]) => {
      if (allIds?.length) markSeen(allIds)
      await api<void>('/api/v1/notifications/read-all', { method: 'POST' }).catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

/**
 * Gom thông báo hiển thị ở chuông và trang Thông báo.
 * Ưu tiên gọi NotificationAudit service (/api/v1/notifications).
 * Dự phòng sang dữ liệu phân công khu vực khi BE trống hoặc offline.
 */
export function useNotificationFeed(): NotificationFeed {
  const { user } = useAuth()
  const role = user?.role ?? 'COMMUNITY'
  const { seasonId } = useSeasonContext()

  // 1. BE Live Notifications
  const {
    data: beNotifs = [],
    isPending: bePending,
    isError: beError,
  } = useQuery({
    queryKey: ['notifications', 'live-feed'],
    queryFn: () => api<NotificationDto[]>('/api/v1/notifications?size=50'),
    staleTime: 10_000,
    retry: 1,
  })

  // Tự động đồng bộ trạng thái isRead từ BE vào local seen store
  useEffect(() => {
    if (beNotifs && Array.isArray(beNotifs)) {
      const readIds = beNotifs.filter((n) => n.isRead).map((n) => n.id)
      if (readIds.length > 0) {
        markSeen(readIds)
      }
    }
  }, [beNotifs])

  // 2. Dự phòng: Phân công khu vực
  const needsAreas = role === 'LEADER' || role === 'MATERIAL_OFFICER' || role === 'COMMUNITY'
  const { data: areas = [], isPending: areasPending } = useAreas(
    needsAreas ? (seasonId ? [seasonId] : undefined) : [],
  )

  const canReadPurchases = role === 'MATERIAL_OFFICER'
  const { data: pendingPurchases = [], isPending: purchasesPending } = useQuery({
    queryKey: ['purchaseRequests', 'pendingApproval'],
    enabled: canReadPurchases,
    queryFn: () =>
      api<{ id: string }[]>('/api/v1/purchase-requests?status=PENDING_APPROVAL&size=50'),
  })

  const derivedItems = useMemo<FeedItem[]>(() => {
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
          source: 'DERIVED',
        })
      }
    }

    if (role === 'COMMUNITY') {
      for (const a of areas) {
        if (!a.leaderId) {
          out.push({
            id: `missing-leader:${a.id}`,
            kind: 'AREA_MISSING_LEADER',
            areaName: a.name,
            areaStatus: a.status,
            href: '/community/areas',
            source: 'DERIVED',
          })
        }
        if (!a.officerId) {
          out.push({
            id: `missing-officer:${a.id}`,
            kind: 'AREA_MISSING_OFFICER',
            areaName: a.name,
            areaStatus: a.status,
            href: '/community/areas',
            source: 'DERIVED',
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
        source: 'DERIVED',
      })
    }

    return out
  }, [areas, role, user?.id, canReadPurchases, pendingPurchases.length])

  if (!beError && beNotifs && beNotifs.length > 0) {
    const beItems: FeedItem[] = beNotifs.map((n) => ({
      id: n.id,
      kind: n.eventType,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      createdAt: n.createdAt,
      href: resolveNotifHref(n, role),
      source: 'BE',
    }))
    return {
      items: beItems,
      isPending: bePending,
      isLive: true,
      source: 'BE',
    }
  }

  return {
    items: derivedItems,
    isPending: bePending || areasPending || purchasesPending,
    isLive: false,
    source: 'DERIVED',
  }
}
