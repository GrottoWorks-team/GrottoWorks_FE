import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import AllocationPage from './AllocationPage'
import type { Allocation, Task, WorkArea } from '@/types'

const mockUser = {
  id: 'u8',
  name: 'Officer U8',
  email: 'officer@grottoworks.vn',
  role: 'MATERIAL_OFFICER' as const,
  areaId: 'a3',
  skills: [],
  points: 0,
  avatarHue: 0,
}

const mockAreas: WorkArea[] = [
  {
    id: 'a3',
    seasonId: 's1',
    name: 'Ánh sáng & đèn',
    leaderId: 'u5',
    officerId: 'u8',
    status: 'IN_PROGRESS',
  },
]

const mockTasks: Task[] = [
  {
    id: 't17',
    areaId: 'a3',
    title: 'Giăng đèn đỉnh hang',
    description: 'Giăng đèn đỉnh hang',
    status: 'DOING',
    assignees: [],
    skills: [],
    materialIds: [],
    dueDate: '2026-12-20',
    volunteersNeeded: 2,
    estimateHours: 4,
    submittedPhotos: 0,
  },
]

const mockAllocations: Allocation[] = [
  {
    id: 'al1',
    workAreaId: 'a3',
    workAreaName: 'Ánh sáng & đèn',
    taskId: 't17',
    taskName: 'Giăng đèn đỉnh hang',
    allocatedBy: 'u4',
    allocationDate: '2026-10-10T00:00:00+00:00',
    items: [
      { materialId: 'm12', materialCode: 'LED-10M', materialName: 'Dây đèn LED 10m', unit: 'cuộn', allocatedQuantity: 10 },
    ],
  },
]

const mockInventory = {
  data: [
    {
      workAreaId: 'a3',
      workAreaName: 'Ánh sáng & đèn',
      seasonId: 's1',
      materialId: 'm12',
      materialCode: 'LED-10M',
      materialName: 'Dây đèn LED 10m',
      unit: 'cuộn',
      required: 50,
      confirmedAvailable: 40,
      allocated: 0,
      unallocated: 40,
      shortage: 10,
    },
  ],
  page: { page: 1, size: 200, totalItems: 1, totalPages: 1 },
}

const createAllocationMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser, isPending: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/materials/api', () => ({
  useInventory: () => ({ data: mockInventory, isPending: false }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: mockAreas, isPending: false }),
  useScopedAreas: () => ({ data: mockAreas, isPending: false }),
}))

vi.mock('@/features/tasks/api', () => ({
  useTasks: () => ({ data: mockTasks, isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: [], isPending: false }),
}))

vi.mock('../api', () => ({
  useAllocations: () => ({ data: mockAllocations, isPending: false }),
  useCreateAllocation: () => ({
    mutateAsync: createAllocationMock,
    isPending: false,
  }),
}))

test('qty vượt khả dụng → lỗi zod, không POST', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AllocationPage />
      </ToastProvider>
    </QueryClientProvider>,
  )

  fireEvent.change(await screen.findByLabelText('Khu vực'), { target: { value: 'a3' } })
  const material = await screen.findByLabelText('Vật tư')
  fireEvent.change(material, { target: { value: 'm12' } })
  expect(await screen.findByText('Khả dụng: 40')).toBeDefined()

  fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '41' } })
  fireEvent.change(screen.getByLabelText('Đích phân bổ'), { target: { value: 'TASK' } })
  fireEvent.change(await screen.findByLabelText('Nhiệm vụ'), { target: { value: 't17' } })
  fireEvent.submit(document.getElementById('allocation-form')!)

  expect(await screen.findByText('Số lượng vượt mức khả dụng')).toBeDefined()
  expect(createAllocationMock).not.toHaveBeenCalled()
})