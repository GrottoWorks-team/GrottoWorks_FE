// Profile form: render stat + prefill từ seed (u27: 100 điểm, 28 giờ công,
// kỹ năng Hàn); submit → PATCH /api/users/:id persist (verify db) + toast.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import Profile from './Profile'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.setItem('grotto-token', 'demo-u27')
})
afterAll(() => server.close())

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <Profile />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('hiện điểm vinh danh, giờ công và prefilled tên theo seed (u27)', async () => {
  mount()

  expect(await screen.findByText('100')).toBeDefined() // điểm vinh danh
  expect(await screen.findByText('28')).toBeDefined() // giờ công: 4 ca × 7h
  const name = await screen.findByLabelText('Họ tên')
  expect((name as HTMLInputElement).value).toBe('Antôn Trương Minh Nhật')
})

test('submit → PATCH /api/users/u27 với tên + kỹ năng mới', async () => {
  mount()
  const user = userEvent.setup()

  const name = await screen.findByLabelText('Họ tên')
  await user.clear(name)
  await user.type(name, 'Antôn Tên Mới')
  fireEvent.click(screen.getByRole('button', { name: 'Sơn' })) // bật thêm kỹ năng Sơn

  await user.click(screen.getByRole('button', { name: 'Lưu' }))

  expect(await screen.findByText('Đã cập nhật hồ sơ')).toBeDefined()
  // Persist thật qua msw: PATCH users/:id shallow-merge rồi GET lại.
  const u = await (await fetch(`${location.origin}/api/users/u27`)).json()
  expect(u.name).toBe('Antôn Tên Mới')
  expect(u.skills).toEqual(['Hàn', 'Sơn'])
})
