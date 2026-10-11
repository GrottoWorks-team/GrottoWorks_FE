import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'
import { api } from '@/lib/api'
import type { SkillDto } from '@/types/identity'

const server = setupServer(...handlers)

describe('Skills Catalog APIs (F-IDN-06)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(() => {
    localStorage.clear()
    resetDb()
  })
  afterAll(() => server.close())

  it('GET /api/v1/skills returns list of skills', async () => {
    const list = await api<SkillDto[]>('/api/v1/skills')
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('code')
    expect(list[0]).toHaveProperty('name')
    expect(list[0]).toHaveProperty('status', 'Active')
  })
})
