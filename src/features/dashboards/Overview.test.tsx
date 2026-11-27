import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import i18n from '@/lib/i18n'
import { api } from '@/lib/api'
import { useSeasonDashboard } from './api'
import ParishOverview from './ParishOverview'
import CommitteeOverview from './CommitteeOverview'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { role: 'PARISH' } }) }))
vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({ data: [{
    id: 'season-a', name: 'Mùa hiện tại', status: 'ACTIVE', year: 2026,
    startDate: '2026-11-01', endDate: '2026-12-31',
  }] }),
}))
vi.mock('@/features/season/season-context', () => ({
  useSeasonContext: () => ({ season: { id: 'season-a', name: 'Mùa hiện tại' } }),
}))
vi.mock('@/features/areas/api', () => ({ useAreas: () => ({ data: [] }) }))
vi.mock('@/features/communities/api', () => ({ useCommunities: () => ({ data: [] }) }))
vi.mock('@/features/users/api', () => ({ useUsers: () => ({ data: [] }) }))
vi.mock('@/features/parish/api', () => ({ useParish: () => ({ data: { id: 'parish-a', name: 'Giáo xứ A' } }) }))
vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return {
    ...actual,
    useSeasonDashboard: vi.fn(actual.useSeasonDashboard),
    useDashboardData: () => ({
      areas: [], communities: [], userNameById: new Map(), isPending: false,
      coverage: { total: 0, missingLeader: 0, missingMaterialOfficer: 0, fullyStaffed: 0 },
    }),
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('vi')
  vi.mocked(api).mockResolvedValue({ workAreas: [] })
})

function mount(view: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter>{view}</MemoryRouter></QueryClientProvider>)
}

it('Admin shows the overview with readiness computed locally, without the season dashboard API', () => {
  mount(<ParishOverview />)
  // 27/11/2026: bản thiết kế mới hiện tên mùa ở CẢ ô chọn mùa và bảng mùa.
  expect(screen.getAllByText('Mùa hiện tại').length).toBeGreaterThan(0)
  expect(screen.getByText(i18n.t('features.dashboards.accountCount'))).toBeDefined()
  // 26/11/2026: `GET /dashboards/season` chỉ cho role PARISH (ADMIN bị 403) nên màn ADMIN
  // tự tính độ sẵn sàng từ danh sách khu vực — thẻ readiness vẫn hiển thị, không gọi API.
  expect(screen.getByText(i18n.t('features.dashboards.readinessTitle'))).toBeDefined()
  expect(screen.queryByText(/khu đã sẵn sàng/)).toBeNull()
  expect(useSeasonDashboard).not.toHaveBeenCalled()
  expect(api).not.toHaveBeenCalled()
})

it('the committee still requests the dashboard with the selected seasonId', async () => {
  mount(<CommitteeOverview />)
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/v1/dashboards/season?seasonId=season-a'))
})
