import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RegisterRequest, UserDto, TokenPair, LoginRequest, LogoutRequest, RefreshTokenRequest } from '@/types/identity'

/** F-IDN-02: Đăng ký tài khoản người dùng mới */
export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterRequest) =>
      api<UserDto>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

/** F-IDN-02: Đăng nhập hệ thống trả về TokenPair */
export function useLoginMutation() {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      api<TokenPair>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

/** F-IDN-03: Cấp mới Access Token bằng Refresh Token */
export function useRefreshTokenMutation() {
  return useMutation({
    mutationFn: (data: RefreshTokenRequest) =>
      api<TokenPair>('/api/v1/auth/refresh', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

/** F-IDN-03: Đăng xuất & thu hồi Refresh Token */
export function useLogoutMutation() {
  return useMutation({
    mutationFn: (data: LogoutRequest) =>
      api<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}


/** F-IDN-04: Yêu cầu đặt lại mật khẩu */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api<void>('/api/v1/auth/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  })
}

/** F-IDN-04: Đặt lại mật khẩu với token */
export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      api<void>('/api/v1/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}
