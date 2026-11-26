import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DistributionListPage from './DistributionListPage'

let currentRole = 'COMMUNITY'

vi.mock('../api', () => ({
  useParishDistributions: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'd-1',
          parishId: 'p-1',
          seasonId: 'season-1',
          targetWorkAreaId: 'area-1',
          targetWorkAreaName: 'Hang đá Bê-lem',
          status: 'IN_TRANSIT',
          origin: 'MANUAL',
          issuedBy: 'u-1',
          issuedAt: '2026-11-20T03:00:00Z',
          receivedConfirmedBy: null,
          receivedConfirmedAt: null,
          note: null,
          cancelReason: null,
          version: 1,
          items: [
            {
              id: 'i-1',
              materialId: 'mat-1',
              materialCode: 'CABLE',
              materialName: 'Dây điện',
              unit: 'm',
              issuedQuantity: 10,
              receivedUsableQuantity: null,
              receivedUnusableQuantity: null,
            },
          ],
        },
      ],
      page: { page: 1, size: 15, totalItems: 1, totalPages: 1 },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useParishInventory: vi.fn(() => ({ data: { data: [] } })),
  useCreateParishDistribution: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useConfirmParishDistribution: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useCancelParishDistribution: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: currentRole } }),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({ data: [{ id: 'season-1', name: 'Mùa Giáng Sinh 2026', year: 2026 }] }),
}))

vi.mock('@/features/season/season-context', () => ({
  useSeasonContext: () => ({ seasonId: 'season-1' }),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: [] }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('DistributionListPage', () => {
  beforeEach(() => {
    currentRole = 'COMMUNITY'
  })

  it('Ban hành giáo tạo và huỷ được phiếu đang chuyển', async () => {
    render(<DistributionListPage />)

    expect(await screen.findByText('features.warehouse.distributionTitle')).toBeDefined()
    expect(await screen.findByText('Hang đá Bê-lem')).toBeDefined()
    expect(await screen.findByText('features.warehouse.createDistribution')).toBeDefined()
    expect(await screen.findByText('features.warehouse.cancel')).toBeDefined()
    expect(screen.queryByText('features.warehouse.receive')).toBeNull()
  })

  it('MO chỉ thấy nút nhận phiếu đang chuyển', async () => {
    currentRole = 'MATERIAL_OFFICER'
    render(<DistributionListPage />)

    expect(await screen.findByText('features.warehouse.receive')).toBeDefined()
    expect(screen.queryByText('features.warehouse.createDistribution')).toBeNull()
  })
})
