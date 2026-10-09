// Validation TaskFormDialog: submit thiếu title (và khu) → lỗi zod hiển thị.
// Dialog dùng useAreas/useSkills/useMaterials → cần msw server; zodResolver
// validate async nên phải findByText.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { TaskFormDialog } from './TaskFormDialog'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

test('submit thiếu title → hiện lỗi zod "Vui lòng nhập tên việc"', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TaskFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  fireEvent.submit(document.getElementById('task-form')!)
  expect(await screen.findByText('Vui lòng nhập tên việc')).toBeDefined()
})
