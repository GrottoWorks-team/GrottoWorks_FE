// Profile domain — F-IDN-05: Lấy & Cập nhật hồ sơ cá nhân
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'
import type { UserProfileDto, UpdateProfileRequest } from '@/types/identity'

/** F-IDN-05: Xem thông tin hồ sơ của người dùng hiện tại */
export function useMyProfile() {
  return useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api<UserProfileDto>('/api/v1/users/me'),
  })
}

/** F-IDN-05: Cập nhật thông tin hồ sơ cá nhân */
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
