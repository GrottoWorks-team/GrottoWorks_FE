// Profile domain â€” F-IDN-05: Láº¥y & Cáº­p nháº­t há»“ sÆ¡ cÃ¡ nhÃ¢n
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'
import type { UserProfileDto, UpdateProfileRequest, AvailabilitySlot } from '@/types/identity'

/** F-IDN-05: Xem thÃ´ng tin há»“ sÆ¡ cá»§a ngÆ°á»i dÃ¹ng hiá»‡n táº¡i */
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api<UserProfileDto>('/api/v1/users/me'),
  })
}

/** F-IDN-05: Cáº­p nháº­t thÃ´ng tin há»“ sÆ¡ cÃ¡ nhÃ¢n */
export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) =>
      api<UserProfileDto>('/api/v1/users/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-profile'] })
      void qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/** Legacy helper */
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Omit<User, 'id'>> & { id: string }) =>
      api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
/** F-IDN-07: Cập nhật danh sách kỹ năng của tình nguyện viên */
export function useReplaceMySkills() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (skillIds: string[]) =>
      api<UserProfileDto>('/api/v1/users/me/skills', {
        method: 'PUT',
        body: JSON.stringify({ skillIds }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-profile'] })
    },
  })
}

/** F-IDN-07: Cập nhật khung thời gian rảnh của tình nguyện viên */
export function useReplaceMyAvailability() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slots: AvailabilitySlot[]) =>
      api<UserProfileDto>('/api/v1/users/me/availability', {
        method: 'PUT',
        body: JSON.stringify(slots),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-profile'] })
    },
  })
}
