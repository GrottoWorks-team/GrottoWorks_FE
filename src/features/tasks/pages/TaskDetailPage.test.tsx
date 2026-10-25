import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import TaskDetailPage from './TaskDetailPage'

let taskStatus = 'REVISE'
let updateListeners: (() => void)[] = []

vi.mock('../api', () => ({
  useTask: (id: string) => {
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1)
      updateListeners.push(listener)
      return () => {
        updateListeners = updateListeners.filter((l) => l !== listener)
      }
    }, [])
    return {
      data: {
        id,
        areaId: 'a1',
        title: 'Gắn bạt che mưa phía sau hang',
        description: 'Gắn bạt che mưa',
        status: taskStatus,
        assignees: [],
        skills: [],
        materialIds: [],
        dueDate: '2026-12-20',
        volunteersNeeded: 2,
        estimateHours: 4,
      },
      isPending: false,
    }
  },
  useUpdateTask: () => ({
    mutateAsync: vi.fn(async (patch: { id: string; status?: string }) => {
      if (patch.status) {
        taskStatus = patch.status
        updateListeners.forEach((l) => l())
      }
      return { id: patch.id, status: taskStatus }
    }),
    isPending: false,
  }),
  useMarkTaskReady: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignVolunteer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnassign: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceCompletionCriteria: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceTaskSkills: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSkillsCatalog: () => ({ data: [{ id: 's1', code: 'MOC', name: 'Thợ mộc', status: 'ACTIVE' }], isPending: false }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: [{ id: 'a1', name: 'Hang đá Bê-lem' }], isPending: false }),
}))

vi.mock('@/features/materials/api', () => ({
  useMaterials: () => ({ data: [], isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: [], isPending: false }),
}))

beforeEach(() => {
  taskStatus = 'REVISE'
})

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

  expect((await screen.findAllByText('Đang làm')).length).toBeGreaterThan(0)
  expect(await screen.findByRole('button', { name: 'Gửi duyệt hoàn thành' })).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull()

  expect(taskStatus).toBe('DOING')
})

test('mount dưới /community/*: việc REVISE không có nút thao tác', async () => {
  renderDetail('/community/tasks/t6', '/community/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull()
})
