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

  it('POST /api/v1/skills creates a new skill', async () => {
    const created = await api<SkillDto>('/api/v1/skills', {
      method: 'POST',
      body: JSON.stringify({ code: 'TEST_SKILL', name: 'Kỹ năng thử nghiệm', description: 'Mô tả test' }),
    })
    expect(created.name).toBe('Kỹ năng thử nghiệm')
    expect(created.code).toBe('TEST_SKILL')
    expect(created.status).toBe('Active')
  })

  it('PATCH /api/v1/skills/:skillId updates an existing skill', async () => {
    const list = await api<SkillDto[]>('/api/v1/skills')
    const firstSkill = list[0]

    const updated = await api<SkillDto>(`/api/v1/skills/${firstSkill.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Kỹ năng đã đổi tên',
        description: 'Mô tả mới sau cập nhật',
        status: 'Inactive',
      }),
    })

    expect(updated.id).toBe(firstSkill.id)
    expect(updated.name).toBe('Kỹ năng đã đổi tên')
    expect(updated.description).toBe('Mô tả mới sau cập nhật')
    expect(updated.status).toBe('Inactive')
  })
})
