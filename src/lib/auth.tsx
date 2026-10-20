// Auth context: login qua /api/v1/auth/login, lưu token & refresh-token,
// boot lại phiên bằng /api/v1/users/me. Chặn route theo role: xem src/routes/RequireRole.tsx.
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Role, User } from '../types'
import type { TokenPair } from '../types/identity'

export function normalizeRole(roleStr?: string): Role {
  if (!roleStr) return 'COMMUNITY'
  const upper = roleStr.toUpperCase()
  if (upper.includes('PARISH') || upper.includes('ADMIN')) return 'PARISH'
  if (upper.includes('MATERIAL') || upper.includes('OFFICER') || upper === 'MO') return 'MATERIAL_OFFICER'
  if (upper.includes('LEADER')) return 'LEADER'
  if (upper.includes('COMMUNITY')) return 'COMMUNITY'
  return 'COMMUNITY'
}

interface AuthContextValue {
  user: User | null
  isPending: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Tải lại user từ /api/v1/users/me. */
  refresh: () => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isPending, setIsPending] = useState(() => Boolean(localStorage.getItem('grotto-token')))

  // BE thật là nguồn duy nhất — không còn fallback sang lớp mock. Lỗi ở đây
  // nghĩa là phiên hỏng thật, và useEffect bên dưới sẽ xoá token.
  const fetchProfile = async (): Promise<User> => {
    const p = await api<any>('/api/v1/users/me')
    const u: User = {
      id: p.id,
      name: p.displayName ?? p.name ?? 'Người dùng',
      email: p.email,
      role: normalizeRole(p.role),
      communityId: p.communityId,
      parishId: p.parishId,
      skills: p.skillIds ?? p.skills ?? [],
      points: p.points ?? 0,
      avatarHue: 45,
    }
    setUser(u)
    return u
  }

  useEffect(() => {
    if (!localStorage.getItem('grotto-token')) return
    fetchProfile()
      .catch(() => {
        localStorage.removeItem('grotto-token')
        localStorage.removeItem('grotto-refresh-token')
      })
      .finally(() => setIsPending(false))
  }, [])

  const login = async (email: string, password: string) => {
    // Đăng nhập chỉ đi Identity service thật. Sai mật khẩu → 401 nổi lên cho
    // Login page hiện lỗi; không nuốt lỗi rồi thử đường khác.
    const tokenPair = await api<TokenPair>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    localStorage.setItem('grotto-token', tokenPair.accessToken)
    localStorage.setItem('grotto-refresh-token', tokenPair.refreshToken)

    return await fetchProfile()
  }

  const refresh = async () => {
    return await fetchProfile()
  }

  const logout = async () => {
    const refreshToken = localStorage.getItem('grotto-refresh-token')
    try {
      if (refreshToken) {
        await api('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        })
      }
    } catch {
      // Thu hồi refresh token thất bại (mạng, token đã hết hạn) không được
      // chặn việc đăng xuất ở client — vẫn xoá phiên bên dưới.
    }
    localStorage.removeItem('grotto-token')
    localStorage.removeItem('grotto-refresh-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isPending, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

const DEFAULT_AUTH: AuthContextValue = {
  user: null,
  isPending: false,
  login: async () => { throw new Error('AuthProvider missing') },
  logout: async () => {},
  refresh: async () => { throw new Error('AuthProvider missing') },
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  return ctx ?? DEFAULT_AUTH
}
