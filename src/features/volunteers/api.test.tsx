// Duyệt/từ chối đăng ký TNV end-to-end qua hook (msw + renderHook, không
// replay fetch tay): duyệt = PATCH reg APPROVED + GET task rồi PATCH
// assignees chứa volunteerId (đúng 2 bước trong useApproveReg); từ chối =
// PATCH REJECTED. Cả hai đều ghi activity log.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { useApproveReg, useRejectReg } from './api'
import type { ActivityLog, Task, VolunteerReg } from '@/types'

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

async function get<T>(path: string): Promise<T> {
  return (await (await fetch(`${base}/api${path}`)).json()) as T
}

test('duyệt reg: status APPROVED + volunteer vào assignees của task', async () => {
  const { result } = renderHook(() => useApproveReg(), { wrapper })
  // vr1 seed: PENDING, task t3 chưa có assignee, volunteer u26.
  await act(async () => {
    await result.current.mutateAsync({ id: 'vr1', taskId: 't3', volunteerId: 'u26', status: 'PENDING' })
  })

  const reg = await get<VolunteerReg>('/volunteerRegs/vr1')
  expect(reg.status).toBe('APPROVED')

  const task = await get<Task>('/tasks/t3')
  expect(task.assignees).toContain('u26')

  const logs = await get<ActivityLog[]>('/activity')
  expect(logs.some((l) => l.action.includes('cập nhật đăng ký tình nguyện'))).toBe(true)
})

test('từ chối reg: status REJECTED, assignees không đổi', async () => {
  const { result } = renderHook(() => useRejectReg(), { wrapper })
  // vr4 seed: PENDING, task t13 chưa có assignee.
  await act(async () => {
    await result.current.mutateAsync({ id: 'vr4', taskId: 't13', volunteerId: 'u18', status: 'PENDING' })
  })

  const reg = await get<VolunteerReg>('/volunteerRegs/vr4')
  expect(reg.status).toBe('REJECTED')

  const task = await get<Task>('/tasks/t13')
  expect(task.assignees).not.toContain('u18')
})
