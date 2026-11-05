import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import TaskDetailPage from './TaskDetailPage'

let backendStatus = 'OPEN'
let readyCalls: { taskId: string; version?: number }[] = []
let currentUserId = 'u1'
let applicationsMock: Array<{
  id: string
  taskId: string
  volunteerId: string
  status: string
  version: number
  requestedAt?: string | null
  note?: string | null
}> = []
let approvedApplications: { applicationId: string; taskId: string; version: number }[] = []

vi.mock('../api', () => ({
  // TaskExecution: TaskDto có skills/materials nhưng test mock trả rỗng;
  // `backendStatus` là field quyết định nút thao tác nào được hiện.
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
      startAt: null,
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
  useApproveTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRequestTaskRevision: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTaskProgress: () => ({ data: [], isPending: false }),
  useTaskReviewPackage: () => ({ data: undefined, isPending: false }),
  useTaskAssignments: () => ({ data: [], isPending: false }),
  useTaskApplications: () => ({ data: applicationsMock, isPending: false }),
  useApproveApplication: () => ({
    mutateAsync: vi.fn(async (vars: { applicationId: string; taskId: string; version: number }) => {
      approvedApplications.push(vars)
      return vars
    }),
    isPending: false,
  }),
  useRejectApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAssignVolunteer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCancelTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceTaskMaterials: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVolunteerMatches: () => ({ data: [], isPending: false }),
  getTaskEvidenceUrl: vi.fn(),
  useSkillsCatalog: () => ({ data: [{ id: 's1', code: 'MOC', name: 'Thợ mộc', status: 'ACTIVE' }], isPending: false }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({
    data: [{ id: 'a1', name: 'Hang đá Bê-lem', leaderId: 'u1' }],
    isPending: false,
  }),
}))

// BE chỉ cho LEADER phụ trách khu vực thao tác (403 WORK_AREA_ACCESS_DENIED).
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: currentUserId, name: 'Trưởng khu', email: 'leader@test.vn', role: 'LEADER' },
    isPending: false,
  }),
}))

vi.mock('@/features/materials/api', () => ({
  useMaterials: () => ({ data: [], isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: [], isPending: false }),
}))

// Vật tư MO đã cấp cho việc (`GET /material-allocations?taskId=…`).
vi.mock('@/features/allocations/api', () => ({
  useAllocations: () => ({
    data: [
      {
        id: 'al1',
        workAreaId: 'a1',
        workAreaName: 'Hang đá Bê-lem',
        taskId: 't6',
        allocatedBy: 'mo',
        allocationDate: '2026-11-05',
        items: [
          {
            materialId: 'm1',
            materialCode: 'VAT-1',
            materialName: 'Bóng đèn LED 9W',
            unit: 'bóng',
            allocatedQuantity: 5,
          },
        ],
      },
    ],
    isPending: false,
  }),
}))

beforeEach(() => {
  backendStatus = 'OPEN'
  readyCalls = []
  currentUserId = 'u1'
  applicationsMock = []
  approvedApplications = []
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

test('hiện vật tư MO đã cấp cho việc', async () => {
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  expect(screen.getByText('Đã cấp')).toBeDefined()
  expect(screen.getByText('Bóng đèn LED 9W')).toBeDefined()
  expect(screen.getByText('×5')).toBeDefined()
})

test('mount dưới /community/*: không có nút thao tác', async () => {
  renderDetail('/community/tasks/t6', '/community/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()
  expect(screen.queryByRole('button', { name: 'Phát hành việc' })).toBeNull()
})

test('trưởng khu không phụ trách khu vực: ẩn nút sửa kỹ năng/vật tư và báo rõ lý do', async () => {
  currentUserId = 'u2'
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  expect(
    screen.getAllByText('Chỉ trưởng khu phụ trách khu vực này mới sửa được.').length,
  ).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: 'Gán vật tư' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
})

test('đơn đăng ký PENDING: duyệt được ngay trong chi tiết việc', async () => {
  applicationsMock = [
    {
      id: 'ap1',
      taskId: 't6',
      volunteerId: 'v1',
      status: 'PENDING',
      version: 2,
      requestedAt: '2026-11-04T01:00:00+00:00',
    },
  ]
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  expect(screen.getByText('Đơn đăng ký chờ duyệt (1)')).toBeDefined()
  // Chưa ai nhận việc nhưng có đơn chờ duyệt → gợi ý rõ ràng.
  expect(
    screen.getByText('Chưa có ai nhận việc — 1 đơn đăng ký đang chờ bạn duyệt.'),
  ).toBeDefined()

  await userEvent.click(screen.getByRole('button', { name: 'Duyệt' }))

  expect(approvedApplications).toEqual([{ applicationId: 'ap1', taskId: 't6', version: 2 }])
})

test('việc đã phát hành (không còn OPEN): ẩn nút sửa và hiện gợi ý trạng thái', async () => {
  backendStatus = 'NOT_STARTED'
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeDefined()

  expect(
    screen.getAllByText('Chỉ sửa được khi việc còn ở trạng thái OPEN (trước khi chuyển Sẵn sàng).')
      .length,
  ).toBeGreaterThan(0)
  expect(screen.queryByRole('button', { name: 'Gán vật tư' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull()
})
