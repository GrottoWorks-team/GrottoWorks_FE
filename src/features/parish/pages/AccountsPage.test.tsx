// Render testAccountsPage: bảng 30 user từ seed + chip filter role; dialog
// tạo tài khoản validate email thiếu → lỗi zod hiển thị (zodResolver async).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import AccountsPage from './AccountsPage'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AccountsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}
test('hiện user seed và dialog tạo tài khoản validate email', async () => {
  mount()
  // 30 user seed, pageSize 8 — trang 1 chỉ có 8 user đầu (u1, u2…).
  expect(await screen.findByText('LM. Phaolô Nguyễn Văn Hạnh')).toBeDefined()
  expect(await screen.findByText('Giuse Trần Văn Bình')).toBeDefined()


  // Mở dialog tạo → submit rỗng → lỗi zod name + email.
  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
  fireEvent.submit(document.getElementById('account-form')!)
  expect(await screen.findByText('Vui lòng nhập tên')).toBeDefined()
  expect(await screen.findByText('Vui lòng nhập email')).toBeDefined()
})
