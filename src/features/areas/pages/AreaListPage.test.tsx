import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import AreaListPage from './AreaListPage'
import { AreaFormDialog } from './AreaFormDialog'
import { AreaAssignDialog } from './AreaAssignDialog'
import type { Season, WorkArea } from '@/types'

const mockSeasons: Season[] = [
  {
    id: 's0',
    parishId: 'p1',
    name: 'Mùa 2025',
    year: 2025,
    startDate: '2025-09-15',
    endDate: '2025-12-24',
    budget: 50_000_000,
    status: 'COMPLETED',
  },
  {
    id: 's1',
    parishId: 'p1',
    name: 'Mùa 2026',
    year: 2026,
    startDate: '2026-09-15',
    endDate: '2026-12-24',
    budget: 100_000_000,
    status: 'ACTIVE',
  },
]

const mockAreas: WorkArea[] = [
  {
    id: 'a1',
    seasonId: 's1',
    name: 'Hang đá Bê-lem',
    type: 'GROTTO',
    level: 'PARISH',
    leaderId: 'u3',
    officerId: 'u4',
    progress: 35,
    volunteerCount: 12,
    taskCount: 8,
    status: 'NEEDS_CORRECTION',
    deadline: '2026-12-20',
  },
  {
    id: 'a2',
    seasonId: 's1',
    name: 'Cây thông lớn',
    type: 'TREE',
    level: 'PARISH',
    leaderId: 'u3',
    officerId: 'u4',
    progress: 50,
    volunteerCount: 8,
    taskCount: 4,
    status: 'IN_PROGRESS',
    deadline: '2026-12-20',
  },
  {
    id: 'a3',
    seasonId: 's1',
    name: 'Ánh sáng & đèn',
    type: 'LIGHTING',
    level: 'PARISH',
    leaderId: 'u5',
    officerId: 'u8',
    progress: 20,
    volunteerCount: 5,
    taskCount: 6,
    status: 'IN_PROGRESS',
    deadline: '2026-12-20',
  },
  {
    id: 'a4',
    seasonId: 's1',
    name: 'Sân khấu',
    type: 'STAGE',
    level: 'COMMUNITY',
    communityId: 'c1',
    leaderId: 'u6',
    officerId: 'u4',
    progress: 10,
    volunteerCount: 4,
    taskCount: 2,
    status: 'IN_PROGRESS',
    deadline: '2026-12-20',
  },
  {
    id: 'a5',
    seasonId: 's1',
    name: 'Sân nhà thờ',
    type: 'YARD',
    level: 'PARISH',
    leaderId: 'u7',
    officerId: 'u8',
    progress: 80,
    volunteerCount: 15,
    taskCount: 10,
    status: 'IN_PROGRESS',
    deadline: '2026-12-20',
  },
]

const mockCommunities = [
  { id: 'c1', name: 'Giáo khu Thánh Tâm' },
  { id: 'c2', name: 'Giáo khu Mẹ Lên Trời' },
]

const mockUsers = [
  { id: 'u3', name: 'Gioan Baotixita Hoàng Nam', role: 'LEADER' },
  { id: 'u4', name: 'Maria Lê Thị Mai', role: 'MATERIAL_OFFICER' },
  { id: 'u5', name: 'Giuse Vũ Hải', role: 'LEADER' },
  { id: 'u6', name: 'Phêrô Đỗ Văn Tuấn', role: 'LEADER' },
  { id: 'u7', name: 'Tôma Nguyễn Văn Đức', role: 'LEADER' },
  { id: 'u8', name: 'Phêrô Quang', role: 'MATERIAL_OFFICER' },
]

vi.mock('@/lib/auth', () => ({
  useAuth: () => {
    const token = localStorage.getItem('grotto-token')
    if (token === 'demo-u2') {
      return {
        user: { id: 'u2', name: 'Giuse Bình', role: 'COMMUNITY', communityId: 'c1' },
        isPending: false,
      }
    }
    if (token === 'demo-u1') {
      return {
        user: { id: 'u1', name: 'LM. Phaolô', role: 'PARISH' },
        isPending: false,
      }
    }
    return { user: null, isPending: false }
  },
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: (seasonIds?: string[]) => {
    if (!seasonIds || seasonIds.length === 0) {
      return { data: mockAreas, isPending: false }
    }
    return {
      data: mockAreas.filter((a) => a.seasonId && seasonIds.includes(a.seasonId)),
      isPending: false,
    }
  },
  useSeasons: () => ({ data: mockSeasons, isPending: false }),
  useCommunities: () => ({ data: mockCommunities, isPending: false }),
  useUsers: () => ({ data: mockUsers, isPending: false }),
  useCreateArea: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'a-new' }), isPending: false }),
  useUpdateArea: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'a1' }), isPending: false }),
  useDeleteArea: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useArea: (id?: string) => ({ data: mockAreas.find((a) => a.id === id), isPending: false }),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({ data: mockSeasons, isPending: false }),
}))

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({ data: mockCommunities, isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: mockUsers, isPending: false }),
}))

beforeEach(() => {
  localStorage.removeItem('grotto-token')
})

test('hiện 5 thẻ khu vực (grid mặc định) từ seed khi chưa đăng nhập', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AreaListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  for (const name of [
    'Hang đá Bê-lem',
    'Cây thông lớn',
    'Ánh sáng & đèn',
    'Sân khấu',
    'Sân nhà thờ',
  ]) {
    expect(await screen.findByText(name)).toBeDefined()
  }
  expect((await screen.findAllByText(/Mùa 2026/i)).length).toBeGreaterThan(0)
})

test('COMMUNITY chỉ thấy khu vực thuộc giáo khu của mình', async () => {
  localStorage.setItem('grotto-token', 'demo-u2')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AreaListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Sân khấu')).toBeDefined()
  expect(screen.queryByText('Hang đá Bê-lem')).toBeNull()
  expect(screen.queryByText('Cây thông lớn')).toBeNull()
  expect(screen.queryByText('Ánh sáng & đèn')).toBeNull()
  expect(screen.queryByText('Sân nhà thờ')).toBeNull()
})

test('Lọc khu vực theo mùa: chọn mùa 2025 thì không có khu nào, chọn mùa 2026 thì có 5 khu', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AreaListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  const seasonSelect = (await screen.findByLabelText(/Lọc theo mùa/i)) as HTMLSelectElement
  expect(seasonSelect).toBeDefined()

  await screen.findByRole('option', { name: /2025/i })

  await userEvent.selectOptions(seasonSelect, 's0')
  expect(await screen.findByText(/Chưa có khu vực nào/i)).toBeDefined()

  await userEvent.selectOptions(seasonSelect, 's1')
  expect(await screen.findByText('Hang đá Bê-lem')).toBeDefined()
})

test('AreaFormDialog: COMMUNITY khóa select communityId', async () => {
  localStorage.setItem('grotto-token', 'demo-u2')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AreaFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  const selectComm = (await screen.findByLabelText(/Giáo khu/i)) as HTMLSelectElement
  expect(selectComm.disabled).toBe(true)
  expect(selectComm.value).toBe('c1')
})

test('AreaFormDialog: PARISH được chọn giáo khu khác', async () => {
  localStorage.setItem('grotto-token', 'demo-u1')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AreaFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  const levelSelect = (await screen.findByLabelText(/^Cấp/i)) as HTMLSelectElement
  await userEvent.selectOptions(levelSelect, 'COMMUNITY')
  const parishCommSelect = (await screen.findByLabelText(/Giáo khu/i)) as HTMLSelectElement
  expect(parishCommSelect.disabled).toBe(false)
})

test('AreaFormDialog: validate deadline trước ngày bắt đầu mùa', async () => {
  localStorage.setItem('grotto-token', 'demo-u1')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AreaFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )

  const nameInput = await screen.findByLabelText(/Tên khu vực/i)
  await userEvent.type(nameInput, 'Khu thử nghiệm')

  const leaderSelect = await screen.findByLabelText(/^Trưởng khu/i)
  await userEvent.selectOptions(leaderSelect, 'u3')

  const officerSelect = await screen.findByLabelText(/^Trưởng ban hành giáo/i)
  await userEvent.selectOptions(officerSelect, 'u4')

  const deadlineInput = await screen.findByLabelText(/Hạn hoàn thành/i)
  await userEvent.type(deadlineInput, '2026-09-01')

  const saveBtn = screen.getByRole('button', { name: /Lưu/i })
  await userEvent.click(saveBtn)

  expect(await screen.findByText(/Hạn hoàn thành phải từ ngày bắt đầu mùa trở đi/i)).toBeDefined()
})

test('AreaAssignDialog: hiển thị thông tin thời hạn và phân công thành công', async () => {
  const dummyArea: WorkArea = {
    id: 'a1',
    seasonId: 's1',
    name: 'Hang đá Bê-lem',
    type: 'GROTTO',
    level: 'PARISH',
    leaderId: 'u3',
    officerId: 'u4',
    progress: 35,
    volunteerCount: 12,
    taskCount: 8,
    status: 'NEEDS_CORRECTION',
    deadline: '2026-12-20',
    description: 'Khu vực hang đá chính',
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let closed = false
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AreaAssignDialog area={dummyArea} onClose={() => { closed = true }} />
      </ToastProvider>
    </QueryClientProvider>,
  )

  expect(await screen.findByText(/Phân công khu vực Hang đá Bê-lem/i)).toBeDefined()
  expect(screen.getByText('20/12/2026')).toBeDefined()

  const officerSelect = (await screen.findByLabelText(/Trưởng ban hành giáo/i)) as HTMLSelectElement
  await screen.findByRole('option', { name: /Phêrô Quang/i })
  await userEvent.selectOptions(officerSelect, 'u8')

  const saveBtn = screen.getByRole('button', { name: /Lưu/i })
  await userEvent.click(saveBtn)

  await waitFor(() => expect(closed).toBe(true))
})
