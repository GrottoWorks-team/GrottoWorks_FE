import React from 'react'
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import TaskDetailPage from './TaskDetailPage'

let taskStatus = 'REVISE'
let updateListeners: (() => void)[] = []

const mockApproveApp = vi.fn().mockResolvedValue({})
const mockRejectApp = vi.fn().mockResolvedValue({})
const mockSetTeamLeader = vi.fn().mockResolvedValue({})
const mockClearTeamLeader = vi.fn().mockResolvedValue({})
const mockCancelTask = vi.fn().mockResolvedValue({})
const mockApproveCompletion = vi.fn().mockResolvedValue({})
const mockRequestRevision = vi.fn().mockResolvedValue({})

let mockApplications: any[] = []
let mockAssignments: any[] = []
let mockReviewPackage: any = null
let mockMaterialReports: any[] = []

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
        assignees: ['u1'],
        skills: [],
        materialIds: [],
        dueDate: '2026-12-20',
        volunteersNeeded: 2,
        estimateHours: 4,
        version: 1,
        teamLeaderAssignmentId: null,
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
  useAssignVolunteerDirect: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnassign: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceCompletionCriteria: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceTaskSkills: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSkillsCatalog: () => ({
    data: [{ id: 's1', code: 'MOC', name: 'Thợ mộc', status: 'ACTIVE' }],
    isPending: false,
  }),
  useTaskApplications: () => ({ data: mockApplications, isPending: false }),
  useTaskAssignments: () => ({ data: mockAssignments, isPending: false }),
  useTaskReviewPackage: () => ({ data: mockReviewPackage, isPending: false }),
  useTaskMaterialReports: () => ({ data: mockMaterialReports, isPending: false }),
  useApproveTaskApplication: () => ({ mutateAsync: mockApproveApp, isPending: false }),
  useRejectTaskApplication: () => ({ mutateAsync: mockRejectApp, isPending: false }),
  useSetTaskTeamLeader: () => ({ mutateAsync: mockSetTeamLeader, isPending: false }),
  useClearTaskTeamLeader: () => ({ mutateAsync: mockClearTeamLeader, isPending: false }),
  useCancelTask: () => ({ mutateAsync: mockCancelTask, isPending: false }),
  useApproveTaskCompletion: () => ({ mutateAsync: mockApproveCompletion, isPending: false }),
  useRequestTaskRevision: () => ({ mutateAsync: mockRequestRevision, isPending: false }),
  useVolunteerMatches: () => ({ data: [], isPending: false }),
  useTaskEvidenceDownloadUrl: () => ({ data: null, isPending: false }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: [{ id: 'a1', name: 'Hang đá Bê-lem' }], isPending: false }),
}))

vi.mock('@/features/materials/api', () => ({
  useMaterials: () => ({ data: [], isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({
    data: [
      { id: 'u1', name: 'Nguyễn Văn A', email: 'a@local', role: 'COMMUNITY', skills: [], points: 10, avatarHue: 20 },
      { id: 'u2', name: 'Trần Thị B', email: 'b@local', role: 'COMMUNITY', skills: [], points: 5, avatarHue: 40 },
    ],
    isPending: false,
  }),
}))

beforeEach(() => {
  taskStatus = 'REVISE'
  mockApplications = []
  mockAssignments = []
  mockReviewPackage = null
  mockMaterialReports = []
  vi.clearAllMocks()
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

test('Đợt A: hiển thị ứng viên và duyệt đơn ứng tuyển', async () => {
  mockApplications = [
    {
      id: 'app-1',
      taskId: 't6',
      volunteerId: 'u2',
      status: 'PENDING',
      note: 'Em có kinh nghiệm phụ việc',
      version: 1,
    },
  ]

  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Ứng viên đăng ký (1)')).toBeDefined()
  expect(screen.getByText('Trần Thị B')).toBeDefined()
  expect(screen.getByText('Em có kinh nghiệm phụ việc')).toBeDefined()

  const approveBtn = screen.getByRole('button', { name: /Duyệt/i })
  await userEvent.click(approveBtn)
  expect(mockApproveApp).toHaveBeenCalledWith({
    applicationId: 'app-1',
    version: 1,
  })
})

test('Đợt A: hiển thị phân công và chỉ định trưởng nhóm', async () => {
  mockAssignments = [
    {
      id: 'as-1',
      taskId: 't6',
      volunteerId: 'u1',
      assignmentType: 'DIRECT',
      status: 'ACCEPTED',
      version: 1,
      warnings: [],
    },
  ]

  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Chỉ định trưởng nhóm')).toBeDefined()

  const setLeaderBtn = screen.getByRole('button', { name: /Chỉ định trưởng nhóm/i })
  await userEvent.click(setLeaderBtn)
  expect(mockSetTeamLeader).toHaveBeenCalledWith({
    taskId: 't6',
    teamLeaderAssignmentId: 'as-1',
    version: 1,
  })
})

test('Đợt A: việc REVIEW có gói nghiệm thu, duyệt hoàn thành thành công', async () => {
  taskStatus = 'REVIEW'
  mockReviewPackage = {
    task: { id: 't6', version: 2 },
    completionCriteria: 'Hoàn thành căng bạt phẳng',
    approvedHours: 4.5,
    progress: [
      {
        id: 'p-1',
        taskId: 't6',
        submittedByUserId: 'u1',
        percentComplete: 100,
        note: 'Đã hoàn tất toàn bộ',
        submittedAt: '2026-12-19T10:00:00Z',
        isSubmission: true,
        evidence: [],
      },
    ],
    reviews: [],
  }

  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  expect(await screen.findByText('Hồ sơ nghiệm thu hoàn thành')).toBeDefined()
  expect(screen.getByText('Số giờ công đã duyệt: 4.5h')).toBeDefined()
  expect(screen.getByText(/100%/)).toBeDefined()

  const approveBtn = screen.getByRole('button', { name: /Duyệt hoàn thành/i })
  await userEvent.click(approveBtn)

  // Dialog mở ra, bấm nút xác nhận Duyệt trong dialog
  const dialog = await screen.findByRole('dialog', { name: /Duyệt hoàn thành/i })
  const confirmBtn = within(dialog).getByRole('button', { name: /Duyệt hoàn thành/i })
  await userEvent.click(confirmBtn)
  expect(mockApproveCompletion).toHaveBeenCalledWith({
    taskId: 't6',
    reason: null,
    version: 1,
  })
})

test('Đợt A: bấm Huỷ nhiệm vụ mở dialog và gửi lý do', async () => {
  renderDetail('/leader/tasks/t6', '/leader/tasks/:id')
  const cancelBtn = await screen.findByRole('button', { name: /Huỷ nhiệm vụ/i })
  await userEvent.click(cancelBtn)

  const dialog = await screen.findByRole('dialog', { name: /Huỷ nhiệm vụ/i })
  expect(within(dialog).getByText('Lý do huỷ')).toBeDefined()
  const textarea = within(dialog).getByPlaceholderText('Nhập lý do huỷ nhiệm vụ...')
  fireEvent.change(textarea, { target: { value: 'Khu vực chuyển đổi công năng' } })

  const confirmCancelBtn = within(dialog).getByRole('button', { name: /Huỷ nhiệm vụ/i })
  await userEvent.click(confirmCancelBtn)

  await waitFor(() => {
    expect(mockCancelTask).toHaveBeenCalledWith({
      taskId: 't6',
      reason: 'Khu vực chuyển đổi công năng',
      version: 1,
    })
  })
})
