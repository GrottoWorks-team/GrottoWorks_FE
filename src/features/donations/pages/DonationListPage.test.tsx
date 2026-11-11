import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import DonationListPage from './DonationListPage'
import type { Donation, ContributionNeedDto } from '@/types'

const mockDonations: Donation[] = [
  {
    id: 'don-1',
    donorId: 'donor-1',
    donorName: 'Nguyễn Văn A',
    seasonId: 'season-1',
    workAreaId: null,
    type: 'MONEY',
    status: 'RECEIVED',
    pledgedAmount: null,
    receivedAmount: { amount: 5000000, currency: 'VND' },
    donationDate: '2026-11-02T10:00:00Z',
    items: [],
    receipts: null,
    note: 'Ủng hộ mùa Giáng Sinh 2026',
    cancelReason: null,
    createdBy: 'user-1',
    createdAt: '2026-11-02T10:00:00Z',
    updatedAt: null,
    version: 1,
  },
  {
    id: 'don-2',
    donorId: 'donor-2',
    donorName: 'Trần Thị B',
    seasonId: 'season-1',
    workAreaId: 'area-1',
    type: 'MATERIAL',
    status: 'PLEDGED',
    pledgedAmount: null,
    receivedAmount: null,
    donationDate: '2026-11-02T11:00:00Z',
    items: [
      {
        id: 'item-1',
        materialId: 'mat-1',
        materialCode: 'LED-WARM-10M',
        materialName: 'Dây LED vàng 10m',
        unit: 'cuộn',
        pledgedQuantity: 20,
        receivedQuantity: 0,
        unusableQuantity: 0,
        usableQuantity: 0,
        status: 'PLEDGED',
        note: 'Hàng mới 100%',
      },
    ],
    receipts: null,
    note: 'Tặng đèn trang trí',
    cancelReason: null,
    createdBy: 'user-1',
    createdAt: '2026-11-02T11:00:00Z',
    updatedAt: null,
    version: 1,
  },
]

const mockNeeds: ContributionNeedDto[] = [
  {
    kind: 'Material',
    workAreaId: 'wa-1',
    workAreaName: 'Khu Bắc',
    materialId: 'mat-1',
    materialCode: 'XI-MANG-PC40',
    materialName: 'Xi măng PC40',
    unit: 'bao',
    required: 100,
    shortage: 40,
    pledgedOutstanding: 10,
    remainingNeed: 30,
  },
]

const mockUseDonations = vi.fn()
const mockUseContributionNeeds = vi.fn()

vi.mock('../api', () => ({
  useDonations: () => mockUseDonations(),
  useContributionNeeds: () => mockUseContributionNeeds(),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({
    data: [{ id: 'season-1', name: 'Mùa Giáng Sinh 2026', year: 2026, status: 'ACTIVE' }],
  }),
}))

const mockExportCsv = vi.fn()
vi.mock('@/lib/csv', () => ({
  exportCsv: (...args: unknown[]) => mockExportCsv(...args),
}))

describe('DonationListPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContributionNeeds.mockReturnValue({
      data: [],
      isPending: false,
    })
  })

  it('renders page header and stat cards with donation aggregates', () => {
    mockUseDonations.mockReturnValue({
      data: mockDonations,
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    // Header
    expect(screen.getByRole('heading', { name: /Quyên góp/i })).toBeDefined()

    // 4 StatCards
    expect(screen.getByText('Tổng lượt quyên góp')).toBeDefined()
    expect(screen.getAllByText('Đã tiếp nhận').length).toBeGreaterThan(0)
    expect(screen.getByText('Đang chờ')).toBeDefined()
    expect(screen.getByText('Tiền quyên góp')).toBeDefined()

    // Total count = 2
    expect(screen.getByText('2')).toBeDefined()
  })

  it('renders donation rows with donor names, type tags, details, and status', () => {
    mockUseDonations.mockReturnValue({
      data: mockDonations,
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    // Donors
    expect(screen.getByText('Nguyễn Văn A')).toBeDefined()
    expect(screen.getByText('Trần Thị B')).toBeDefined()

    // Money details
    expect(screen.getByText('5.000.000 ₫')).toBeDefined()

    // Material details
    expect(screen.getByText('Dây LED vàng 10m')).toBeDefined()
    expect(screen.getByText('(20 cuộn)')).toBeDefined()
    expect(screen.getByText('(Hàng mới 100%)')).toBeDefined()

    // Status tags
    expect(screen.getAllByText('Đã tiếp nhận').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hứa tặng').length).toBeGreaterThan(0)
  })

  it('handles CSV export when clicking the export button', () => {
    mockUseDonations.mockReturnValue({
      data: mockDonations,
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    const exportBtn = screen.getByRole('button', { name: /Xuất CSV/i }) as HTMLButtonElement
    expect(exportBtn.disabled).toBe(false)

    fireEvent.click(exportBtn)
    expect(mockExportCsv).toHaveBeenCalledTimes(1)
    expect(mockExportCsv).toHaveBeenCalledWith(
      'so-quyen-gop.csv',
      expect.arrayContaining([
        expect.objectContaining({
          'Người quyên góp': 'Nguyễn Văn A',
        }),
      ]),
    )
  })

  it('renders empty state when no donations exist', () => {
    mockUseDonations.mockReturnValue({
      data: [],
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    expect(screen.getByText('Chưa có quà tặng nào.')).toBeDefined()
    const exportBtn = screen.getByRole('button', { name: /Xuất CSV/i }) as HTMLButtonElement
    expect(exportBtn.disabled).toBe(true)
  })

  it('switches to contribution needs tab and displays contribution needs data', () => {
    mockUseDonations.mockReturnValue({
      data: mockDonations,
      isPending: false,
    })
    mockUseContributionNeeds.mockReturnValue({
      data: mockNeeds,
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    const needsTab = screen.getByRole('button', { name: /Nhu cầu đóng góp mùa vụ/i })
    fireEvent.click(needsTab)

    expect(screen.getByText('Mặt hàng cần quyên góp')).toBeDefined()
    expect(screen.getByText('Xi măng PC40')).toBeDefined()
    expect(screen.getByText('Khu Bắc')).toBeDefined()
    expect(screen.getByText('30 bao')).toBeDefined()
  })

  it('renders empty state when contribution needs is empty (BE returns empty array)', () => {
    mockUseDonations.mockReturnValue({
      data: mockDonations,
      isPending: false,
    })
    mockUseContributionNeeds.mockReturnValue({
      data: [],
      isPending: false,
    })

    render(
      <ToastProvider>
        <DonationListPage />
      </ToastProvider>,
    )

    const needsTab = screen.getByRole('button', { name: /Nhu cầu đóng góp mùa vụ/i })
    fireEvent.click(needsTab)

    expect(
      screen.getByText(/Hiện chưa có nhu cầu đóng góp nào cho mùa vụ/i),
    ).toBeDefined()
  })
})
