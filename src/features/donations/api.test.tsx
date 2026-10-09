// Ghi nhận quyên góp end-to-end qua hook (msw + renderHook): PATCH donation
// (receivedQty + status tự suy) rồi PATCH material.donatedReceived theo delta
// — handler refreshMaterial tính lại received/status (pattern 2 bước).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { useRecordReception, useUpdateDonation } from './api'
import type { Donation, Material } from '@/types'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const get = async <T,>(path: string) => (await (await fetch(`${base}/api${path}`)).json()) as T

// d8 seed: m12, promised 20, chưa nhận. m12: donatedReceived 0, received 40.
test('nhận đủ 20/20 → RECEIVED_FULL + donatedReceived +20', async () => {
  const { result } = renderHook(() => useRecordReception('d8'), { wrapper })
  await act(async () => {
    await result.current.mutateAsync(20)
  })

  const d = await get<Donation>('/donations/d8')
  expect(d.status).toBe('RECEIVED_FULL')
  expect(d.receivedQty).toBe(20)

  const m = await get<Material>('/materials/m12')
  expect(m.donatedReceived).toBe(20)
  expect(m.received).toBe(60) // existing 20 + purchased 20 + donated 20
})

test('nhận một phần 10/20 → RECEIVED_PARTIAL + donatedReceived +10', async () => {
  const { result } = renderHook(() => useRecordReception('d8'), { wrapper })
  await act(async () => {
    await result.current.mutateAsync(10)
  })

  const d = await get<Donation>('/donations/d8')
  expect(d.status).toBe('RECEIVED_PARTIAL')
  expect(d.receivedQty).toBe(10)

  const m = await get<Material>('/materials/m12')
  expect(m.donatedReceived).toBe(10)
})

// Ghi lại số cao hơn → chỉ cộng delta (không đếm trùng).
test('ghi tiếp 20 sau khi đã nhận 10 → cộng thêm đúng 10', async () => {
  const first = renderHook(() => useRecordReception('d8'), { wrapper })
  await act(async () => {
    await first.result.current.mutateAsync(10)
  })
  const second = renderHook(() => useRecordReception('d8'), { wrapper })
  await act(async () => {
    await second.result.current.mutateAsync(20)
  })

  const d = await get<Donation>('/donations/d8')
  expect(d.status).toBe('RECEIVED_FULL')
  const m = await get<Material>('/materials/m12')
  expect(m.donatedReceived).toBe(20)
})

// UNUSABLE: chỉ đổi status — material donatedReceived/donatedPledged giữ nguyên.
test('đánh dấu UNUSABLE → material không đổi donatedPledged/donatedReceived', async () => {
  const { result } = renderHook(() => useUpdateDonation(), { wrapper })
  // d8 seed: m12, promised 20, chưa nhận. m12: donatedPledged 20, donatedReceived 0.
  await act(async () => {
    await result.current.mutateAsync({ id: 'd8', status: 'UNUSABLE' })
  })

  const d = await get<Donation>('/donations/d8')
  expect(d.status).toBe('UNUSABLE')

  const m = await get<Material>('/materials/m12')
  expect(m.donatedPledged).toBe(20)
  expect(m.donatedReceived).toBe(0)
  expect(m.received).toBe(40)
})
