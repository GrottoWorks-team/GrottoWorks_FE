import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import OfficerOverview from './OfficerOverview'
import type { MaterialDashboardDto } from '@/types'

const mockMaterialsDashboard: MaterialDashboardDto = {
  seasonId: 'season-1',
  generatedAt: '2026-11-10T00:00:00Z',
  workAreaIds: ['area-1'],
  lines: [
    {
      workAreaId: 'area-1',
      workAreaName: 'Khu Hang Đá',
      materialId: 'mat-1',
      materialCode: 'XI-MANG-PC40',
      materialName: 'Xi măng PC40',
      unit: 'bao',
      required: 100,
      confirmedAvailable: 60,
      shortage: 40,
      pledged: 10,
      donatedUsable: 50,
      purchasedUsable: 10,
    },
  ],
  purchases: {
    pendingApproval: 3,
    inProgress: 2,
    completed: 4,
    rejected: 0,
    estimatedApproved: 15000000,
    actualCost: 12500000,
  },
  donations: {
    openPledges: 2,
    openPledgedMoney: 2000000,
    receivedMoney: 8000000,
    receivedUsableQuantity: 50,
    receivedUnusableQuantity: 0,
  },
}

const mockUseMaterialsDashboard = vi.fn()

vi.mock('./api', async () => {
  const actual = await vi.importActual<any>('./api')
  return {
    ...actual,
    useDashboardData: () => ({
      areas: [{ id: 'area-1', name: 'Khu Hang Đá', status: 'IN_PROGRESS', leaderId: 'u-1', seasonId: 'season-1' }],
      coverage: { total: 1, missingLeader: 0, missingMaterialOfficer: 0, fullyStaffed: 1, byStatus: {} },
      userNameById: new Map([['u-1', 'Trưởng khu']]),
      isPending: false,
    }),
    useMaterialsDashboard: () => mockUseMaterialsDashboard(),
  }
})

describe('OfficerOverview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMaterialsDashboard.mockReturnValue({
      data: mockMaterialsDashboard,
      isPending: false,
    })
  })

  it('renders officer overview and materials dashboard table', () => {
    render(
      <MemoryRouter>
        <OfficerOverview />
      </MemoryRouter>,
    )

    // StatCards
    expect(screen.getByText('Mặt hàng thiếu')).toBeDefined()
    expect(screen.getByText('Đề nghị mua chờ duyệt')).toBeDefined()
    expect(screen.getByText('Chi phí mua sắm')).toBeDefined()

    // Material lines table
    expect(screen.getByText('Xi măng PC40')).toBeDefined()
    expect(screen.getByText('XI-MANG-PC40')).toBeDefined()
    expect(screen.getByText('100 bao')).toBeDefined()
    expect(screen.getByText('40 bao')).toBeDefined()
  })
})
