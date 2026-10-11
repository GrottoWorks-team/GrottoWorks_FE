import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'
import { api } from '@/lib/api'

const server = setupServer(...handlers)

describe('Auth Identity Service APIs', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(() => {
    localStorage.clear()
    resetDb()
  })
  afterAll(() => server.close())

  it('POST /api/v1/auth/refresh returns new token pair', async () => {
    const res = await api<{ accessToken: string; refreshToken: string }>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'refresh-u1-12345' }),
    })

    expect(res.accessToken).toBe('demo-u1')
    expect(res.refreshToken).toContain('refresh-u1-')
  })

  it('POST /api/v1/auth/logout revokes session on server', async () => {
    localStorage.setItem('grotto-token', 'demo-u1')
    const res = await api<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: 'refresh-u1-12345' }),
    })

    expect(res).toBeUndefined()
  })

  it('GET /api/v1/users/me returns authenticated caller profile', async () => {
    localStorage.setItem('grotto-token', 'demo-u1')
    const profile = await api<{ id: string; email: string; displayName: string }>('/api/v1/users/me')
    expect(profile.id).toBe('u1')
    expect(profile.displayName).toBeDefined()
  })

  it('PATCH /api/v1/users/me updates current user profile', async () => {
    localStorage.setItem('grotto-token', 'demo-u1')
    const updated = await api<{ id: string; displayName: string }>('/api/v1/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Khoa Updated Name' }),
    })
    expect(updated.displayName).toBe('Khoa Updated Name')
  })
})
