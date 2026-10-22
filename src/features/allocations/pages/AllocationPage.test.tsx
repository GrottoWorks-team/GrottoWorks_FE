import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import AllocationPage from './AllocationPage'
import type { Allocation, Material, Task, WorkArea } from '@/types'

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

const mockMaterials: Material[] = [
  {
    id: 'm12',
    areaId: 'a3',
    name: 'Dây đèn LED 10m',
    unit: 'cuộn',
    required: 50,
    existing: 20,
    purchased: 20,
    donatedPledged: 0,
    donatedReceived: 0,
    received: 40,
    status: 'INCOMING',
    estUnitPrice: 100000,
  },
]

const mockAreas: WorkArea[] = [
  {
    id: 'a3',
    seasonId: 's1',
    name: 'Ánh sáng & đèn',
    type: 'LIGHTING',
    level: 'PARISH',
    leaderId: 'u5',
    officerId: 'u8',
    progress: 50,
    volunteerCount: 5,
    taskCount: 3,
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
  { id: 'al1', materialId: 'm1', qty: 10, targetTaskId: 't1', date: '2026-10-10', byUserId: 'u4' },
  { id: 'al2', materialId: 'm2', qty: 5, targetTaskId: 't2', date: '2026-10-10', byUserId: 'u4' },
  { id: 'al3', materialId: 'm3', qty: 2, targetTaskId: 't3', date: '2026-10-10', byUserId: 'u4' },
  { id: 'al4', materialId: 'm4', qty: 8, targetTaskId: 't4', date: '2026-10-10', byUserId: 'u4' },
  { id: 'al5', materialId: 'm5', qty: 4, targetTaskId: 't5', date: '2026-10-10', byUserId: 'u4' },
  { id: 'al6', materialId: 'm6', qty: 1, targetTaskId: 't6', date: '2026-10-10', byUserId: 'u4' },
]

const createAllocationMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser, isPending: false }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/materials/api', () => ({
  useMaterials: () => ({ data: mockMaterials, isPending: false }),
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
  availableMap: (materials: Material[], allocations: Allocation[]) => {
    const allocated: Record<string, number> = {}
    for (const a of allocations) allocated[a.materialId] = (allocated[a.materialId] ?? 0) + a.qty
    return Object.fromEntries(
      materials.map((m) => [m.id, Math.max(0, m.received - (allocated[m.id] ?? 0))]),
    )
  },
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

  const material = await screen.findByLabelText('Vật tư')
  fireEvent.change(material, { target: { value: 'm12' } })
  expect(await screen.findByText('Khả dụng: 40')).toBeDefined()

  fireEvent.change(screen.getByLabelText('Số lượng'), { target: { value: '41' } })
  fireEvent.change(screen.getByLabelText('Nhiệm vụ'), { target: { value: 't17' } })
  fireEvent.submit(document.getElementById('allocation-form')!)

  expect(await screen.findByText('Số lượng vượt mức khả dụng')).toBeDefined()
  expect(createAllocationMock).not.toHaveBeenCalled()
  expect(mockAllocations).toHaveLength(6)
})
