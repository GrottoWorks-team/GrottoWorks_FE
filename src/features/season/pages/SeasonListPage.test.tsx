import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import SeasonListPage from './SeasonListPage'

const mockSeasons = [
  {
    id: 's1',
    parishId: 'p1',
    name: 'Mùa 2026',
    year: 2026,
    startDate: '2026-09-15',
    endDate: '2026-12-24',
    status: 'ACTIVE' as const,
    budget: 100_000_000,
    description: 'Mùa 2026',
  },
  {
    id: 's-planned',
    parishId: 'p1',
    name: 'Mùa dự kiến 2027',
    year: 2027,
    startDate: '2027-09-15',
    endDate: '2027-12-24',
    status: 'PLANNING' as const,
    budget: 80_000_000,
    description: 'Mùa dự kiến 2027',
  },
]

const mockCommunities = [
  { id: 'c1', name: 'Giáo khu Thánh Tâm' },
  { id: 'c2', name: 'Giáo khu Mẹ Lên Trời' },
  { id: 'c3', name: 'Giáo khu Gioan' },
]

vi.mock('../api', () => ({
  useSeasons: () => ({ data: mockSeasons, isPending: false }),
  useSeason: () => ({ data: undefined, isPending: false }),
  useCloseSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompleteSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useActivateSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSeason: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({ data: mockCommunities, isPending: false }),
}))

const mockAreas = [
  { id: 'a1', seasonId: 's1', communityId: 'c1' },
  { id: 'a2', seasonId: 's1', communityId: 'c2' },
  { id: 'a3', seasonId: 's1', communityId: 'c3' },
]

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: mockAreas, isPending: false }),
}))

const mockAuthUser = {
  current: { id: 'u2', role: 'COMMUNITY', parishId: 'p1', name: 'Ban hành giáo' },
}
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: mockAuthUser.current,
  }),
}))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <SeasonListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('SeasonListPage (Flow 4 + Flow 6)', () => {
  it('hiển thị danh sách mùa kèm cột Mô tả và cột Cộng đoàn (suy ra từ khu vực)', async () => {
    setup()
    const elements2026 = await screen.findAllByText(/2026/)
    expect(elements2026.length).toBeGreaterThan(0)
    expect(screen.getByText('Mô tả')).toBeDefined()
    // BE không lưu cộng đoàn trên mùa, cột này suy ra từ khu vực của mùa.
    expect(screen.getByText('Cộng đoàn')).toBeDefined()
  })

  it('mùa PLANNED có nút Kích hoạt (Rocket); bấm Kích hoạt mở dialog kiểm tra điều kiện', async () => {
    setup()
    const elements2027 = await screen.findAllByText(/2027/)
    expect(elements2027.length).toBeGreaterThan(0)

    const activateBtn = await screen.findByRole('button', { name: 'Kích hoạt' })
    expect(activateBtn).toBeDefined()

    fireEvent.click(activateBtn)
    expect(await screen.findByText('Kiểm tra điều kiện kích hoạt')).toBeDefined()
    expect(await screen.findByText('Chưa đủ điều kiện kích hoạt mùa')).toBeDefined()
  })

  it('ADMIN hệ thống chỉ xem: ẩn nút Tạo mùa và cột thao tác (12/11/2026)', async () => {
    mockAuthUser.current = { id: 'u1', role: 'PARISH', parishId: 'p1', name: 'Admin hệ thống' }
    setup()
    expect(screen.queryByRole('button', { name: 'Tạo mùa' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Tạo mùa mới từ mùa cũ' })).toBeNull()
    expect(screen.queryByText('Thao tác')).toBeNull()
    mockAuthUser.current = {
      id: 'u2',
      role: 'COMMUNITY',
      parishId: 'p1',
      name: 'Ban hành giáo',
    }
  })
})
