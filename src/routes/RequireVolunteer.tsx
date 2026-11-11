// Chặn route dành riêng cho tài khoản tình nguyện viên (VOLUNTEER).
// Khác `RequireRole`: role web đã normalize của VOLUNTEER vẫn là 'COMMUNITY'
// (xem normalizeRole), nên phải so `rawRole` thay vì `role`.
// Dùng cho trang ghi nhận mua hàng trên web (`/volunteer/purchases`, F-RES-09).
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { roleHomePath } from '@/lib/roles'

export function RequireVolunteer({ children }: { children: ReactNode }) {
  const { user, isPending } = useAuth()
  if (isPending) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.rawRole !== 'VOLUNTEER') return <Navigate to={roleHomePath(user.role)} replace />
  return <>{children}</>
}
