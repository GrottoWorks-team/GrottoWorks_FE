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
  if (upper.includes('MATERIAL') || upper.includes('OFFICER')) return 'MATERIAL_OFFICER'
  if (upper.includes('LEADER')) return 'LEADER'
  if (upper.includes('COMMUNITY')) return 'COMMUNITY'
  return 'COMMUNITY'
}

interface AuthContextValue {
  user: User | null
  isPending: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Tải lại user từ /api/v1/users/me hoặc /auth/me. */
  refresh: () => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isPending, setIsPending] = useState(() => Boolean(localStorage.getItem('grotto-token')))

  const fetchProfile = async (): Promise<User> => {
    try {
      const p = await api<any>('/api/v1/users/me')
      const u: User = {
        id: p.id,
        name: p.displayName ?? p.name ?? 'Người dùng',
        email: p.email,
        role: normalizeRole(p.role),
        communityId: p.communityId,
        skills: p.skillIds ?? p.skills ?? [],
        points: p.points ?? 0,
        avatarHue: 45,
      }
      setUser(u)
      return u
    } catch {
      // Fallback legacy /auth/me
      const u = await api<User>('/auth/me')
      setUser(u)
      return u
    }
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
    let tokenPair: TokenPair
    try {
      tokenPair = await api<TokenPair>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    } catch (err: any) {
      // Fallback legacy nếu endpoint v1 chưa sẵn sàng
      const legacy = await api<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      tokenPair = {
        accessToken: legacy.token,
        refreshToken: `refresh-${legacy.user.id}`,
        expiresIn: 900,
        tokenType: 'Bearer',
      }
      localStorage.setItem('grotto-token', tokenPair.accessToken)
      localStorage.setItem('grotto-refresh-token', tokenPair.refreshToken)
      setUser(legacy.user)
      return legacy.user
    }

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
      } else {
        await api('/auth/logout', { method: 'POST' })
      }
    } catch {
      // mock layer — bỏ qua lỗi khi logout
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
