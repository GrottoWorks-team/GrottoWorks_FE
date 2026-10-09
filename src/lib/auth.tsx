// Auth context: login qua /api/auth/login, lưu token vào localStorage
// 'grotto-token', boot lại phiên bằng /auth/me khi đã có token.
// Chặn route theo role: xem src/routes/RequireRole.tsx.
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isPending: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  /** Tải lại user từ /auth/me (Profile tự sửa qua PATCH /users/:id). */
  refresh: () => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isPending, setIsPending] = useState(() => Boolean(localStorage.getItem('grotto-token')))

  useEffect(() => {
    if (!localStorage.getItem('grotto-token')) return
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('grotto-token'))
      .finally(() => setIsPending(false))
  }, [])

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('grotto-token', data.token)
    setUser(data.user)
    return data.user
  }

  const refresh = async () => {
    const u = await api<User>('/auth/me')
    setUser(u)
    return u
  }

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // mock layer — bỏ qua lỗi khi logout
    }
    localStorage.removeItem('grotto-token')
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
