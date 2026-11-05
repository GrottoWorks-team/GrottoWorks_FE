// Thông báo — NotificationAudit service (BE đã có đủ API, gateway đã route):
//   GET    /api/v1/notifications?isRead=&eventType=&page=&size=   (paged)
//   POST   /api/v1/notifications/{notificationId}/read             (204)
//   POST   /api/v1/notifications/read-all                          (204)
//   GET    /api/v1/users/me/notification-preferences
//   PUT    /api/v1/users/me/notification-preferences
//
// Trạng thái "đã đọc" nằm ở server (`isRead`), không còn lưu localStorage.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'

export interface NotificationDto {
  id: string
  eventType: string
  title: string
  body: string
  referenceType?: string | null
  referenceId?: string | null
  isRead: boolean
  createdAt: string
  readAt?: string | null
}

export interface NotificationPreferenceDto {
  inAppEnabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

export const notificationKeys = {
  all: ['notifications'] as const,
  feed: (size: number) => ['notifications', 'feed', size] as const,
  unread: ['notifications', 'unread'] as const,
  preferences: ['notifications', 'preferences'] as const,
}

/** Trang thông báo của user — mới nhất trước (BE sắp xếp sẵn). */
export function useNotifications(
  options: { isRead?: boolean; size?: number; enabled?: boolean } = {},
) {
  const size = options.size ?? 100
  return useQuery({
    queryKey: [...notificationKeys.all, 'list', options.isRead ?? 'ALL', size] as const,
    queryFn: async () => {
      const qs = new URLSearchParams({ size: String(size) })
      if (options.isRead !== undefined) qs.set('isRead', String(options.isRead))
      const res = await apiPaged<NotificationDto>(`/api/v1/notifications?${qs.toString()}`)
      return { items: res.data, total: res.page?.totalItems ?? res.data.length }
    },
    enabled: options.enabled ?? true,
  })
}

/** Số thông báo chưa đọc — dùng cho chuông + badge điều hướng. */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => {
      const res = await apiPaged<NotificationDto>('/api/v1/notifications?isRead=false&size=1')
      return res.page?.totalItems ?? 0
    },
    refetchInterval: 60_000,
  })
}

/** Panel chuông: N mục mới nhất — chỉ gọi khi dropdown mở (`enabled`). */
export function useNotificationFeed(size = 10, enabled = true) {
  const query = useNotifications({ size, enabled })
  return {
    items: query.data?.items ?? [],
    isPending: query.isPending,
    refetch: query.refetch,
  }
}

function useNotificationMutation<TVars, TResult = void>(fn: (vars: TVars) => Promise<TResult>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkNotificationRead() {
  return useNotificationMutation((notificationId: string) =>
    api<void>(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' }),
  )
}

export function useMarkAllNotificationsRead() {
  return useNotificationMutation(() => api<void>('/api/v1/notifications/read-all', { method: 'POST' }))
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: async () => {
      const res = await api<NotificationPreferenceDto | { data?: NotificationPreferenceDto }>(
        '/api/v1/users/me/notification-preferences',
      )
      const dto = (res as { data?: NotificationPreferenceDto }).data ?? (res as NotificationPreferenceDto)
      return dto
    },
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: NotificationPreferenceDto) =>
      api<NotificationPreferenceDto>('/api/v1/users/me/notification-preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.preferences }),
  })
}
