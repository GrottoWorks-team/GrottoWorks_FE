import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import TaskDetailPage from './TaskDetailPage'

let backendStatus = 'OPEN'
let readyCalls: { taskId: string; version?: number }[] = []

vi.mock('../api', () => ({
  // TaskExecution: TaskDto không có assignees/skills/materialIds nên mapper trả
  // mảng rỗng; `backendStatus` là field quyết định nút thao tác nào được hiện.
  useTask: (id: string) => ({
    data: {
      id,
      areaId: 'a1',
      title: 'Gắn bạt che mưa phía sau hang',
      description: 'Gắn bạt che mưa',
      status: 'TODO',
      backendStatus,
      assignees: [],
      skills: [],
      materialIds: [],
      dueDate: '2026-12-20',
      volunteersNeeded: 2,
      estimateHours: 4,
      version: 3,
    },
    isPending: false,
  }),
  useReadyTask: () => ({
    mutateAsync: vi.fn(async (vars: { taskId: string; version?: number }) => {
      readyCalls.push(vars)
      backendStatus = 'NOT_STARTED'
      return vars
    }),
    isPending: false,
  }),
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
  backendStatus = 'OPEN'
  readyCalls = []
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

test('việc OPEN: bấm "Phát hành việc" → gọi POST /tasks/{id}/ready với version thật', async () => {
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  await userEvent.click(screen.getByRole('button', { name: 'Phát hành việc' }))

  expect(readyCalls).toEqual([{ taskId: 't6', version: 3 }])
})

test('không còn nút chuyển trạng thái chưa có API (Bắt đầu / Mở lại)', async () => {
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  expect(screen.queryByRole('button', { name: 'Mở lại' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Bắt đầu làm' })).toBeNull()
})

test('mount dưới /community/*: không có nút thao tác', async () => {
  renderDetail('/community/tasks/t6', '/community/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Phát hành việc' })).toBeNull()
})
