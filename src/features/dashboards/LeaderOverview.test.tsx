import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LeaderOverview from './LeaderOverview'
import type { WorkAreaDashboardDto } from '@/types'

const mockWorkAreaDashboard: WorkAreaDashboardDto = {
  workAreaId: 'area-1',
  name: 'Khu Hang Đá',
  status: 'IN_PROGRESS',
  seasonId: 'season-1',
  generatedAt: '2026-11-10T00:00:00Z',
  summary: {
    workAreas: 1,
    workAreasByStatus: { IN_PROGRESS: 1 },
    tasks: {
      total: 8,
      byStatus: { COMPLETED: 6, DOING: 2 },
      unassigned: 0,
      overdue: 1,
      revisionRequired: 1,
      completed: 6,
      progressPercent: 75,
    },
    materials: {
      lines: 4,
      linesWithShortage: 2,
      pledgedLines: 1,
    },
    purchases: {
      pendingApproval: 1,
      inProgress: 1,
      completed: 2,
      rejected: 0,
      estimatedApproved: 5000000,
      actualCost: 4000000,
    },
    donations: {
      openPledges: 1,
      openPledgedMoney: 0,
      receivedMoney: 0,
      receivedUsableQuantity: 10,
      receivedUnusableQuantity: 0,
    },
    volunteers: {
      assigned: 5,
      withApprovedHours: 4,
      approvedHours: 45,
      participationPercent: 80,
    },
    readiness: {
      ready: 1,
      needsCorrection: 0,
      reopened: 0,
      withoutResult: 0,
      failedMandatoryItems: 0,
    },
    notAvailable: [],
  },
}

const mockUseWorkAreaDashboard = vi.fn()

vi.mock('./api', async () => {
  const actual = await vi.importActual<any>('./api')
  return {
    ...actual,
    useDashboardData: () => ({
      areas: [{ id: 'area-1', name: 'Khu Hang Đá', status: 'IN_PROGRESS', officerId: 'u-2' }],
      coverage: { total: 1, missingLeader: 0, missingMaterialOfficer: 0, fullyStaffed: 1, byStatus: {} },
      userNameById: new Map([['u-2', 'Vật tư officer']]),
      isPending: false,
    }),
    useWorkAreaDashboard: () => mockUseWorkAreaDashboard(),
  }
})

describe('LeaderOverview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWorkAreaDashboard.mockReturnValue({
      data: mockWorkAreaDashboard,
      isPending: false,
    })
  })

  it('renders leader overview and work area operational indicators', () => {
    render(
      <MemoryRouter>
        <LeaderOverview />
      </MemoryRouter>,
    )

    // Work area operational cards
    expect(screen.getByText('Tiến độ nhiệm vụ')).toBeDefined()
    expect(screen.getByText('Cần xử lý')).toBeDefined()
    expect(screen.getByText('Tình nguyện viên')).toBeDefined()
    expect(screen.getByText('Vật tư thiếu hụt')).toBeDefined()

    // Status breakdown badges
    expect(screen.getByText('Phân bố trạng thái nhiệm vụ')).toBeDefined()
  })
})
