// Landing domain — đăng ký đồng hành công khai (POST /api/registrations).
// Khác VolunteerReg/SupportReg: đây là form mở cho khách chưa có tài khoản,
// chỉ để lại thông tin liên hệ; mock tự gắn createdAt + status PENDING.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Registration } from '@/types'

export const landingKeys = {
  registrations: ['registrations'] as const,
}

/** Payload client gửi lên — server sinh id/createdAt/status. */
export type RegistrationInput = Omit<Registration, 'id' | 'createdAt' | 'status'>

export function useCreateRegistration() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: RegistrationInput) =>
      api<Registration>('/registrations', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: landingKeys.registrations }),
  })
}
