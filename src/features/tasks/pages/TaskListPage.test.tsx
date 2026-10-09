// Chip lọc trạng thái của TaskListPage phải có REVISE: việc đang làm lại
// (t14 — Kiểm tra dây đèn nháy) lọc ra được, việc khác biến mất.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import TaskListPage from './TaskListPage'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

test('chip "Làm lại" lọc đúng việc REVISE', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/leader/tasks']}>
            <TaskListPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()

  await userEvent.click(screen.getByRole('button', { name: 'Làm lại' }))

  expect(await screen.findByText('Kiểm tra dây đèn nháy')).toBeDefined()
  expect(screen.queryByText('Xây nền hang đá')).toBeNull()
})
