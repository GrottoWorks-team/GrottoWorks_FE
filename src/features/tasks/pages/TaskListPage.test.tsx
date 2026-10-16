import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import TaskListPage from './TaskListPage'
import type { Task } from '@/types'

const mockTasks: Task[] = [
  {
    id: 't1',
    areaId: 'a1',
    title: 'Xây nền hang đá',
    description: 'Xây nền hang đá',
    status: 'DONE',
    assignees: [],
    skills: [],
    materialIds: [],
    dueDate: '2026-12-20',
    volunteersNeeded: 2,
    estimateHours: 8,
    submittedPhotos: 0,
  },
  {
    id: 't14',
    areaId: 'a1',
    title: 'Kiểm tra dây đèn nháy',
    description: 'Kiểm tra dây đèn nháy',
    status: 'REVISE',
    assignees: [],
    skills: [],
    materialIds: [],
    dueDate: '2026-12-20',
    volunteersNeeded: 1,
    estimateHours: 2,
    submittedPhotos: 0,
  },
]

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'u3', role: 'LEADER', name: 'Leader Nam' },
    isPending: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../api', () => ({
  useTasks: () => ({ data: mockTasks, isPending: false }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSkills: () => ({ data: [], isPending: false }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: [{ id: 'a1', name: 'Hang đá Bê-lem', leaderId: 'u3' }], isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: [], isPending: false }),
}))

test('chip "Làm lại" lọc đúng việc REVISE', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/leader/tasks']}>
          <TaskListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()

  await userEvent.click(screen.getByRole('button', { name: 'Làm lại' }))

  expect(await screen.findByText('Kiểm tra dây đèn nháy')).toBeDefined()
  expect(screen.queryByText('Xây nền hang đá')).toBeNull()
})
