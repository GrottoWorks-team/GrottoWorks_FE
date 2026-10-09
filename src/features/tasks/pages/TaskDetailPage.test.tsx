// Trạng thái REVISE: leader có nút "Mở lại" đưa việc về DOING (PATCH qua msw),
// mount dưới /community/* thì read-only nên không có nút.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import type { Task } from '@/types'
import TaskDetailPage from './TaskDetailPage'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

function renderDetail(path: string, route: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={<TaskDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('việc REVISE: bấm "Mở lại" → việc chuyển sang DOING', async () => {
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  await userEvent.click(screen.getByRole('button', { name: 'Mở lại' }))

  // Query invalidate sau mutation → trang nạp lại, status thành DOING và
  // panel thao tác đổi sang bước gửi duyệt.
  expect((await screen.findAllByText('Đang làm')).length).toBeGreaterThan(0)
  expect(await screen.findByRole('button', { name: 'Gửi duyệt hoàn thành' })).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull()

  const after = (await (
    await fetch(`${location.origin}/api/tasks/t6`)
  ).json()) as Task
  expect(after.status).toBe('DOING')
})

test('mount dưới /community/*: việc REVISE không có nút thao tác', async () => {
  renderDetail('/community/tasks/t6', '/community/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull()
})
