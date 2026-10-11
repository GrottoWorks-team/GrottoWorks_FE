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
})
