// Purchase flow end-to-end qua hook thật + msw (pattern handlers.test.ts,
// thêm renderHook để chạy đúng code của useCreatePurchaseRecord /
// useRejectRequest chứ không chỉ mock layer).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import type { Material, PurchaseRecord, PurchaseRequest } from '@/types'
import { useCreatePurchaseRecord, useRejectRequest } from './api'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

function setupHook<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
}

const get = async <T,>(path: string) => (await (await fetch(`${base}/api${path}`)).json()) as T

test('tạo hồ sơ mua: POST record qty N → received tăng N, đủ thì status ENOUGH', async () => {
  // m13 (a3): required 200, purchased 0, donatedReceived 30, existing 50 → received 80.
  const { result } = setupHook(() => useCreatePurchaseRecord())
  await result.current.mutateAsync({
    requestId: 'pr5',
    materialId: 'm13',
    qty: 120,
    cost: 1_800_000,
    supplier: 'Điện Quang',
    date: '2026-11-02',
    confirmed: false,
    buyerId: 'u8',
  })

  const recs = await get<PurchaseRecord[]>('/purchaseRecords')
  const rec = recs.find((r) => r.materialId === 'm13')
  expect(rec?.id).toBe('pc5') // nextId prefix pc + max 4
  expect(rec?.qty).toBe(120)
  expect(rec?.confirmed).toBe(false)

  const m = await get<Material>('/materials/m13')
  expect(m.purchased).toBe(120)
  expect(m.received).toBe(200) // 80 + 120 — handler tính lại từ purchased
  expect(m.status).toBe('ENOUGH') // received ≥ required
})

test('committee từ chối: REJECTED + rejectReason riêng, note gốc và vật tư giữ nguyên', async () => {
  const m13Before = await get<Material>('/materials/m13')
  const m14Before = await get<Material>('/materials/m14')

  const { result } = setupHook(() => useRejectRequest())
  await result.current.mutateAsync({ id: 'pr5', reason: 'Vượt ngân sách mùa' })

  const pr = await get<PurchaseRequest>('/purchaseRequests/pr5')
  expect(pr.status).toBe('REJECTED')
  // pr5 có note gốc 'Bóng đèn còn thiếu 120 cái' — phải còn nguyên.
  expect(pr.note).toBe('Bóng đèn còn thiếu 120 cái')
  expect(pr.rejectReason).toBe('Vượt ngân sách mùa')

  expect(await get<Material>('/materials/m13')).toEqual(m13Before)
  expect(await get<Material>('/materials/m14')).toEqual(m14Before)
})
