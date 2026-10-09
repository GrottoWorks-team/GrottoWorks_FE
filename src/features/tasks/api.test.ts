// Tasks flows qua msw: tạo việc → phân công TNV (assignees có volunteer mới),
// duyệt hoàn thành (REVIEW → DONE) + activity log tự ghi. Giống handlers.test.ts.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import type { Task } from '@/types'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

test('assign volunteer: POST việc mới → PATCH assignees → GET thấy volunteer', async () => {
  const created = await req<Task>('POST', '/tasks', {
    areaId: 'a1',
    title: 'Kiểm thử phân công',
    description: '',
    skills: ['Mộc'],
    estimateHours: 4,
    volunteersNeeded: 2,
    assignees: [],
    materialIds: [],
    status: 'TODO',
    dueDate: '2026-12-01',
    submittedPhotos: 0,
  })
  expect(created.id).toBe('t41') // nextId từ prefix t + max 40

  // Giống useAssignVolunteer: GET task rồi PATCH mảng assignees mới.
  const before = await req<Task>('GET', `/tasks/${created.id}`)
  const patched = await req<Task>('PATCH', `/tasks/${created.id}`, {
    assignees: [...before.assignees, 'u13'],
  })
  expect(patched.assignees).toContain('u13')

  const after = await req<Task>('GET', `/tasks/${created.id}`)
  expect(after.assignees).toEqual(['u13'])

  const logs = await req<{ action: string }[]>('GET', '/activity')
  expect(logs[0].action).toContain('cập nhật nhiệm vụ')
})

test('approve completion: PATCH status → DONE và ghi activity', async () => {
  // t8 đang REVIEW → duyệt hoàn thành.
  const patched = await req<Task>('PATCH', '/tasks/t8', { status: 'DONE' })
  expect(patched.status).toBe('DONE')

  const after = await req<Task>('GET', '/tasks/t8')
  expect(after.status).toBe('DONE')

  const logs = await req<{ action: string }[]>('GET', '/activity')
  expect(logs[0].action).toContain('cập nhật nhiệm vụ')
})
