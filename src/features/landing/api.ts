// Landing — đăng ký đồng hành công khai.
// BE CHƯA có endpoint `Registration` (`POST /registrations` không tồn tại) nên
// FE không gọi mạng nữa; mutation luôn trả lỗi mã REGISTRATION_API_MISSING để
// trang hiển thị thông báo rõ thay vì 404 im lặng.
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import type { Registration } from '@/types'

export type RegistrationInput = Omit<Registration, 'id' | 'createdAt' | 'status'>

export function useCreateRegistration() {
  return useMutation({
    mutationFn: async (_data: RegistrationInput): Promise<Registration> => {
      throw new ApiError(
        501,
        'BE chưa có API đăng ký đồng hành công khai (Registration).',
        'REGISTRATION_API_MISSING',
      )
    },
  })
}