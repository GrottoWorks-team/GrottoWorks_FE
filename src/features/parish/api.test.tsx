// Task 12 kịch bản admin end-to-end (msw + renderHook):
//   1. Khoá tài khoản u5 (LEADER) → login u5 trả 401 (mock login lọc !locked).
//   2. Xoá kỹ năng đang được tham chiếu (u13 có 'Mộc') → 409, danh mục giữ nguyên.
//   3. Thêm kỹ năng mới không tham chiếu rồi xoá → mất khỏi danh mục.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { useDeleteSkill, useUpdateUser } from './api'
import type { User } from '@/types'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

async function login(email: string): Promise<Response> {
  return fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'grotto' }),
  })
}

test('khoá tài khoản u5 → login bị từ chối 401', async () => {
  // Trước khi khoá: login u5 thành công.
  expect((await login('u5@grottoworks.vn')).status).toBe(200)

  // PATCH users/u5 locked=true (hook admin).
  const { result } = renderHook(() => useUpdateUser(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ id: 'u5', locked: true })
  })

  const u = (await (await fetch(`${base}/api/users/u5`)).json()) as User
  expect(u.locked).toBe(true)

  // Login sau khoá → 401 (mock login lọc user bị khoá).
  const res = await login('u5@grottoworks.vn')
  expect(res.status).toBe(401)
})

test('xoá kỹ năng đang được dùng → 409, danh mục giữ nguyên', async () => {
  // seed: u13.skills có 'Mộc' → kỹ năng 'Mộc' đang tham chiếu.
  const skills = (await (await fetch(`${base}/api/skills`)).json()) as string[]
  const i = skills.indexOf('Mộc')
  expect(i).toBeGreaterThanOrEqual(0)

  const { result } = renderHook(() => useDeleteSkill(), { wrapper })
  await act(async () => {
    await expect(result.current.mutateAsync(i)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('không thể xoá'),
    })
  })

  // Danh mục nguyên vẹn — 'Mộc' vẫn còn.
  const after = (await (await fetch(`${base}/api/skills`)).json()) as string[]
  expect(after).toContain('Mộc')
})

test('thêm kỹ năng mới rồi xoá (không tham chiếu) → mất khỏi danh mục', async () => {
  // Thêm 'Nhiếp ảnh' — không user/task nào dùng.
  const create = await fetch(`${base}/api/skills`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Nhiếp ảnh' }),
  })
  expect(create.status).toBe(201)
  const created = (await create.json()) as string[]
  expect(created).toContain('Nhiếp ảnh')

  // Xoá 'Nhiếp ảnh' (index cuối) — được phép vì không tham chiếu.
  const { result } = renderHook(() => useDeleteSkill(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync(created.indexOf('Nhiếp ảnh'))
  })

  const after = (await (await fetch(`${base}/api/skills`)).json()) as string[]
  expect(after).not.toContain('Nhiếp ảnh')
})
