// Vitest environment mặc định của dự án là jsdom → có localStorage thật.
// fetch của Node cần URL tuyệt đối: lấy origin của jsdom (localhost:3000);
// MSW match path-only handler đúng theo origin đó.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { setupServer } from 'msw/node'
import { resetDb } from '../lib/db'
import { handlers } from './handlers'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

test('login đúng trả về token + user', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'committee@grottoworks.vn', password: 'grotto' }),
  })
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.token).toBe('demo-u2')
  expect(data.user.email).toBe('committee@grottoworks.vn')
})

test('login sai mật khẩu → 401', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'committee@grottoworks.vn', password: 'sai' }),
  })
  expect(res.status).toBe(401)
})

test('/auth/me với token hợp lệ trả về user', async () => {
  const res = await fetch(`${base}/api/auth/me`, {
    headers: { authorization: 'Bearer demo-u3' },
  })
  expect(res.status).toBe(200)
  expect((await res.json()).id).toBe('u3')
})

test('POST task persist rồi GET thấy, kèm activity log', async () => {
  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify({ areaId: 'a1', title: 'Test Task 2', status: 'TODO' }),
  })
  expect(res.status).toBe(201)
  const created = await res.json()
  expect(created.id).toBe('t41')
  const list = await (await fetch(`${base}/api/tasks`)).json()
  expect(list.some((x: { title: string }) => x.title === 'Test Task 2')).toBe(true)
  const activity = await (await fetch(`${base}/api/activity`)).json()
  expect(
    activity.some(
      (l: { action: string; target: string }) => l.action === 'tạo nhiệm vụ' && l.target === 't41',
    ),
  ).toBe(true)
})

test('DELETE id không tồn tại → 404', async () => {
  const res = await fetch(`${base}/api/tasks/t999`, { method: 'DELETE' })
  expect(res.status).toBe(404)
})

test('PATCH material cập nhật số lượng + tính lại status', async () => {
  const res = await fetch(`${base}/api/materials/m5`, {
    method: 'PATCH',
    body: JSON.stringify({ purchased: 60 }),
  })
  expect(res.status).toBe(200)
  const m = await res.json()
  expect(m.received).toBe(60)
  expect(m.status).toBe('ENOUGH')
  const got = await (await fetch(`${base}/api/materials/m5`)).json()
  expect(got.received).toBe(60)
})
