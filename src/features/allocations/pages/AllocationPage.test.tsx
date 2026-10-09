// Validate qty ≤ available (msw + render page thật với officer u8 — khu a3):
// m12 received 40, chưa phân bổ → khả dụng 40. Nhập 41 → lỗi zod hiển thị,
// KHÔNG POST (danh sách phân bổ không đổi).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import AllocationPage from './AllocationPage'
import type { Allocation } from '@/types'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.setItem('grotto-token', 'demo-u8') // officer u8 → khu a3
})
afterAll(() => server.close())

test('qty vượt khả dụng → lỗi zod, không POST', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <AllocationPage />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )

  // Chờ form load (vật tư khu a3: m11–m15).
  const material = await screen.findByLabelText('Vật tư')
  fireEvent.change(material, { target: { value: 'm12' } })
  // m12: received 40 (tồn 20 + mua 20 + quyên góp 0), chưa phân bổ.
  expect(await screen.findByText('Khả dụng: 40')).toBeDefined()

  fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '41' } })
  fireEvent.change(screen.getByLabelText('Nhiệm vụ'), { target: { value: 't17' } })
  fireEvent.submit(document.getElementById('allocation-form')!)

  // zodResolver validate async → findByText.
  expect(await screen.findByText('Số lượng vượt mức khả dụng')).toBeDefined()

  const list = await (await fetch(`${base}/api/allocations`)).json() as Allocation[]
  expect(list).toHaveLength(6) // seed nguyên vẹn — không có POST nào
})
