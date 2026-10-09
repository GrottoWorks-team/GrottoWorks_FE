// Duyệt/từ chối yêu cầu chỉnh giờ end-to-end qua hook (msw + renderHook):
// PATCH hours + status CLOSED + xoá correctionRequest — mock PATCH là
// shallow-merge giữ key null nên null = xoá field (xem handlers.ts).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { useApproveCorrection, useRejectCorrection, useTimesheets } from './api'
import type { Timesheet } from '@/types'

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

test('approve correction: hours updated 3→5, status CLOSED, correctionRequest cleared', async () => {
  // ts31 seed: PENDING_FIX, hours 3, correctionRequest "Bấm giờ nhầm...".
  const { result } = renderHook(() => useApproveCorrection(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ id: 'ts31', correctedHours: 5 })
  })

  const ts = (await (await fetch(`${base}/api/timesheets/ts31`)).json()) as Timesheet
  expect(ts.hours).toBe(5)
  expect(ts.status).toBe('CLOSED')
  expect(ts.correctionRequest ?? null).toBe(null)
})

test('reject correction: correctionRequest cleared, status CLOSED (ca đóng không chỉnh)', async () => {
  const { result } = renderHook(() => useRejectCorrection(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync('ts31')
  })

  const ts = (await (await fetch(`${base}/api/timesheets/ts31`)).json()) as Timesheet
  expect(ts.status).toBe('CLOSED')
  expect(ts.correctionRequest ?? null).toBe(null)
})

test('useTimesheets(volunteerId) lọc client-side theo TNV', async () => {
  const { result } = renderHook(() => useTimesheets('u13'), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data?.length).toBeGreaterThan(0)
  expect(result.current.data?.every((x) => x.volunteerId === 'u13')).toBe(true)
})
