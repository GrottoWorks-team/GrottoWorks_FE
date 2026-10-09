// Profile domain — tự sửa hồ sơ (PATCH /users/:id, invalidate cache ['users']).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Omit<User, 'id'>> & { id: string }) =>
      api<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
