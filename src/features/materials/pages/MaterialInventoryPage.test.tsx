import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import MaterialInventoryPage from './MaterialInventoryPage'
import { OpeningStockDialog } from './OpeningStockDialog'
import { MaterialHistoryDrawer } from './MaterialHistoryDrawer'

const mockInventoryData = [
  {
    workAreaId: 'area-1',
    workAreaName: 'Khu Hang Đá Bê-lem',
    seasonId: 'season-1',
    materialId: 'mat-1',
    materialCode: 'LED-WARM-10M',
    materialName: 'Dây LED vàng 10m',
    unit: 'cuộn',
    required: 10,
    confirmedAvailable: 5,
    allocated: 0,
    unallocated: 5,
    shortage: 5,
  },
  {
    workAreaId: 'area-1',
    workAreaName: 'Khu Hang Đá Bê-lem',
    seasonId: 'season-1',
    materialId: 'mat-2',
    materialCode: 'WOOD-BEAM-3M',
    materialName: 'Cột gỗ 3m',
    unit: 'cây',
    required: 15,
    confirmedAvailable: 15,
    allocated: 5,
    unallocated: 10,
    shortage: 0,
  },
]

const mockHistoryData = [
  {
    id: 'tx-1',
    workAreaId: 'area-1',
    materialId: 'mat-1',
    transactionType: 'OPENING_STOCK',
    quantity: 5,
    transactionDate: '2026-10-21T06:00:00Z',
    referenceType: null,
    referenceId: null,
    createdByUserId: 'u-1',
    note: 'Kiểm kê đầu kỳ',
  },
]

const mockRecordMutation = vi.fn().mockResolvedValue({})

vi.mock('../api', () => ({
  useInventory: vi.fn(() => ({
    data: {
      data: mockInventoryData,
      page: { page: 1, size: 15, totalItems: 2, totalPages: 1 },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMaterialCatalog: vi.fn(() => ({
    data: {
      data: [
        { id: 'mat-1', code: 'LED-WARM-10M', name: 'Dây LED vàng 10m', unit: 'cuộn' },
        { id: 'mat-2', code: 'WOOD-BEAM-3M', name: 'Cột gỗ 3m', unit: 'cây' },
      ],
    },
  })),
  useMaterialHistory: vi.fn(() => ({
    data: mockHistoryData,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })),
  useRecordOpeningStock: vi.fn(() => ({
    mutateAsync: mockRecordMutation,
  })),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: vi.fn(() => ({
    data: [{ id: 'season-1', name: 'Mùa Giáng Sinh 2026', year: 2026 }],
  })),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: vi.fn(() => ({
    data: [{ id: 'area-1', name: 'Khu Hang Đá Bê-lem' }],
  })),
  useArea: vi.fn(() => ({
    data: { id: 'area-1', name: 'Khu Hang Đá Bê-lem', seasonId: 'season-1', type: 'GROTTO', status: 'IN_PROGRESS' },
    isPending: false,
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options?.materialName && options?.materialCode) {
        return `${options.materialName} (${options.materialCode})`
      }
      if (options?.count) {
        return `Thiếu ${options.count} ${options.unit || ''}`
      }
      return key
    },
  }),
}))

describe('Group D: Material Inventory & History', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('D2: Hiển thị bảng cân đối tồn kho với các cột và badge thiếu hụt', async () => {
    render(
      <ToastProvider>
        <MaterialInventoryPage />
      </ToastProvider>,
    )

    expect(await screen.findByText('features.inventory.title')).toBeDefined()
    expect(await screen.findAllByText('Khu Hang Đá Bê-lem')).toBeDefined()
    expect(await screen.findByText('Dây LED vàng 10m')).toBeDefined()
    expect(await screen.findByText('LED-WARM-10M')).toBeDefined()

    // Shortage row
    expect(await screen.findByText(/5 cuộn/i)).toBeDefined()
    // Sufficient row
    expect(await screen.findByText('features.inventory.sufficientBadge')).toBeDefined()
  })

  it('D1: OpeningStockDialog hiển thị đầy đủ các trường và nút submit', async () => {
    render(
      <ToastProvider>
        <OpeningStockDialog open={true} onClose={vi.fn()} />
      </ToastProvider>,
    )

    expect(await screen.findByText('features.inventory.dialog.title')).toBeDefined()
    expect(screen.getByLabelText(/features\.inventory\.dialog\.workArea/i)).toBeDefined()
    expect(screen.getByLabelText(/features\.inventory\.dialog\.material/i)).toBeDefined()
    expect(screen.getByLabelText(/features\.inventory\.dialog\.quantity/i)).toBeDefined()
    expect(screen.getByRole('button', { name: 'features.inventory.dialog.submit' })).toBeDefined()
  })

  it('D3: MaterialHistoryDrawer hiển thị lịch sử giao dịch và badge loại giao dịch', async () => {
    render(
      <ToastProvider>
        <MaterialHistoryDrawer
          open={true}
          onClose={vi.fn()}
          materialId="mat-1"
          materialCode="LED-WARM-10M"
          materialName="Dây LED vàng 10m"
          unit="cuộn"
        />
      </ToastProvider>,
    )

    expect(await screen.findByText('features.inventory.history.title')).toBeDefined()
    expect(await screen.findByText('features.inventory.history.typeOpeningStock')).toBeDefined()
    expect(await screen.findByText('Kiểm kê đầu kỳ')).toBeDefined()
    expect(await screen.findByText('+5')).toBeDefined()
  })
})
