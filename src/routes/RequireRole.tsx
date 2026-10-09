import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Forbidden } from '@/pages/Forbidden'
import type { Role } from '@/types'

// Chặn route theo role: chưa đăng nhập → /login; sai role → trang 403 thật.
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, isPending } = useAuth()
  if (isPending) return null
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Forbidden />
  return <>{children}</>
}
