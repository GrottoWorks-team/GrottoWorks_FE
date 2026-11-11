import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ParishOverview from './ParishOverview'
import type { SeasonDashboardDto, SupportSummaryDto } from '@/types'

const mockDashboard: SeasonDashboardDto = {
  seasonId: 'season-1',
  parishId: 'parish-1',
  generatedAt: '2026-11-10T00:00:00Z',
  summary: {
    workAreas: 2,
    workAreasByStatus: { PLANNED: 1, READY: 1 },
    tasks: {
      total: 10,
      byStatus: { COMPLETED: 8, DOING: 2 },
      unassigned: 0,
      overdue: 0,
      revisionRequired: 0,
      completed: 8,
      progressPercent: 80,
    },
    materials: {
      lines: 5,
      linesWithShortage: 1,
      pledgedLines: 2,
    },
    purchases: {
      pendingApproval: 2,
      inProgress: 1,
      completed: 3,
      rejected: 0,
      estimatedApproved: 10000000,
      actualCost: 8500000,
    },
    donations: {
      openPledges: 4,
      openPledgedMoney: 5000000,
      receivedMoney: 12000000,
      receivedUsableQuantity: 50,
      receivedUnusableQuantity: 0,
    },
    volunteers: {
      assigned: 15,
      withApprovedHours: 12,
      approvedHours: 120,
      participationPercent: 80,
    },
    readiness: {
      ready: 1,
      needsCorrection: 1,
      reopened: 0,
      withoutResult: 0,
      failedMandatoryItems: 0,
    },
    notAvailable: [],
  },
  communities: [
    {
      communityId: 'comm-1',
      workAreas: 2,
      tasks: 10,
      completed: 8,
      progressPercent: 80,
    },
  ],
  workAreas: [
    {
      workAreaId: 'area-1',
      name: 'Khu Hang Đá',
      status: 'READY',
      tasks: 6,
      completed: 6,
      progressPercent: 100,
      readiness: 'READY',
    },
    {
      workAreaId: 'area-2',
      name: 'Khu Sân Khấu',
      status: 'IN_PROGRESS',
      tasks: 4,
      completed: 2,
      progressPercent: 50,
      readiness: 'NEEDS_CORRECTION',
    },
  ],
}

const mockSupportSummary: SupportSummaryDto = {
  seasonId: 'season-1',
  totalRequests: 3,
  requests: [{ status: 'PUBLISHED', count: 3 }],
  communities: [],
  calculatedAt: '2026-11-10T00:00:00Z',
}

const mockUseSeasonDashboard = vi.fn()
const mockUseSeasonSupportSummary = vi.fn()

vi.mock('./api', async () => {
  const actual = await vi.importActual<any>('./api')
  return {
    ...actual,
    useSeasonDashboard: () => mockUseSeasonDashboard(),
  }
})

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({
    data: [
      {
        id: 'season-1',
        name: 'Mùa Giáng Sinh 2026',
        year: 2026,
        status: 'ACTIVE',
        startDate: '2026-11-01',
        endDate: '2026-12-31',
        budget: 50000000,
      },
    ],
    isPending: false,
  }),
  useSeasonSupportSummary: () => mockUseSeasonSupportSummary(),
}))

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({
    data: [{ id: 'comm-1', name: 'Giới Trẻ' }],
  }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({
    data: [{ id: 'u-1', name: 'Admin User' }],
  }),
}))

vi.mock('@/features/parish/api', () => ({
  useParish: () => ({
    data: { id: 'p-1', name: 'Giáo xứ Bến Hải' },
  }),
}))

describe('ParishOverview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseSeasonDashboard.mockReturnValue({
      data: mockDashboard,
      isPending: false,
    })
    mockUseSeasonSupportSummary.mockReturnValue({
      data: mockSupportSummary,
      isPending: false,
    })
  })

  it('renders parish header and season dashboard indicators', () => {
    render(
      <MemoryRouter>
        <ParishOverview />
      </MemoryRouter>,
    )

    // Header sub
    expect(screen.getByText('Giáo xứ Bến Hải')).toBeDefined()

    // Dashboard indicators
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0)
    expect(screen.getByText('/ 2 khu')).toBeDefined()
    expect(screen.getByText('3 yêu cầu hỗ trợ liên cộng đoàn')).toBeDefined()

    // Work area progress table
    expect(screen.getByText('Khu Hang Đá')).toBeDefined()
    expect(screen.getByText('Khu Sân Khấu')).toBeDefined()
    expect(screen.getByText('6 / 6')).toBeDefined()
    expect(screen.getByText('2 / 4')).toBeDefined()

    // Community progress table
    expect(screen.getByText('Giới Trẻ')).toBeDefined()
  })
})
