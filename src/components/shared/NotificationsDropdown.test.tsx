// NotificationsDropdown: mở panel → 10 activity mới nhất từ GET /api/activity
// (log31–log40 seed, log40 đứng đầu); dot unread tắt khi mở (lastSeenId = log40)
// và SÁNG LẠI khi có log mới (log41 sinh qua POST /api/tasks).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { NotificationsDropdown } from './NotificationsDropdown'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.removeItem('grotto-notif-read')
})
afterAll(() => server.close())

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <NotificationsDropdown />
    </QueryClientProvider>,
  )
  return client
}

test('mở panel → 10 hoạt động mới nhất; dot tắt sau mở, sáng lại khi có log mới', async () => {
  const client = mount()

  // Activity về sau (chưa có lastSeenId) → dot đỏ xuất hiện.
  expect(await screen.findByTestId('unread-dot')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  // 10 dòng mới nhất (log31–log40 seed); log40 = u2 xác nhận hóa đơn pc4.
  expect(await screen.findAllByRole('listitem')).toHaveLength(10)
  expect(screen.getByText('Giuse Trần Văn Bình')).toBeDefined() // actor u2
  expect(screen.getByText('xác nhận hóa đơn')).toBeDefined()
  expect(screen.getByText('pc4')).toBeDefined()
  // Mở panel = đánh dấu đã đọc (lastSeenId = log40) → dot biến mất.
  expect(screen.queryByTestId('unread-dot')).toBeNull()

  // Log mới (id log41, `at` = now < mốc seed tương lai — timestamp không so được,
  // phải so id) sinh qua mutation → dot sáng lại.
  const res = await fetch(`${location.origin}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify({ areaId: 'a1', title: 'Task dot test', status: 'TODO' }),
  })
  expect(res.status).toBe(201)
  await client.invalidateQueries({ queryKey: ['activity'] })
  expect(await screen.findByTestId('unread-dot')).toBeDefined()
})
