import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ParishInventoryPage from './ParishInventoryPage'

const openingRecordMutation = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../api', () => {
  const previousSeasonRows = [
    { materialId: 'mat-old', materialCode: 'CABLE', materialName: 'Dây điện cũ', unit: 'm', confirmedAvailable: 20 },
  ]
  const currentSeasonRows = [
    { materialId: 'mat-1', materialCode: 'CABLE', materialName: 'Dây điện', unit: 'm', confirmedAvailable: 20 },
  ]

  return {
    useParishInventory: vi.fn(({ seasonId }: { seasonId: string }) => ({
      data: {
        data: seasonId === 'season-2025' ? previousSeasonRows : currentSeasonRows,
        page: { page: 1, size: 100, totalItems: 1, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    })),
    useParishMaterialHistory: vi.fn(() => ({ data: [], isPending: false })),
    useRecordParishOpeningStock: vi.fn(() => ({ mutateAsync: openingRecordMutation, isPending: false })),
    useAdjustParishInventory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  }
})

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u-1', role: 'COMMUNITY' } }),
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => vi.fn(),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({ data: [
    { id: 'season-1', name: 'Mùa Giáng Sinh 2026', year: 2026, status: 'ACTIVE' },
    { id: 'season-2025', name: 'Mùa Giáng Sinh 2025', year: 2025, status: 'COMPLETED' },
  ] }),
}))

vi.mock('@/features/season/season-context', () => ({
  useSeasonContext: () => ({ seasonId: 'season-1' }),
}))

vi.mock('@/features/materials/api', () => ({
  useMaterialCatalog: () => ({ data: { data: [
    { id: 'mat-new', code: 'NEW', name: 'Vật tư mới', unit: 'cái' },
  ] } }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('ParishInventoryPage', () => {
  beforeEach(() => openingRecordMutation.mockClear())

  it('hiển thị tồn kho tổng và nút nhập tồn cho Ban hành giáo', async () => {
    render(<ParishInventoryPage />)

    expect(await screen.findByText('features.warehouse.title')).toBeDefined()
    expect(await screen.findByText('Dây điện')).toBeDefined()
    expect(await screen.findByText('CABLE')).toBeDefined()
    expect(await screen.findByText('features.warehouse.openingBtn')).toBeDefined()
    expect(await screen.findByText('features.warehouse.adjustBtn')).toBeDefined()
  })

  it('loads previous-season materials and allows adding a new material', async () => {
    render(<ParishInventoryPage />)

    fireEvent.click(await screen.findByText('features.warehouse.openingBtn'))

    expect(await screen.findByText('Dây điện cũ')).toBeDefined()
    expect(await screen.findByText('20 m')).toBeDefined()

    fireEvent.change(screen.getByLabelText('features.warehouse.addNewMaterial'), { target: { value: 'mat-new' } })
    fireEvent.click(screen.getByText('features.warehouse.addMaterial'))

    expect(await screen.findByText('Vật tư mới')).toBeDefined()
    fireEvent.click(screen.getAllByLabelText('features.warehouse.removeMaterial')[0])
    fireEvent.change(screen.getByLabelText('features.warehouse.remainingFor'), { target: { value: '3' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(openingRecordMutation).toHaveBeenCalledWith({
      seasonId: 'season-1',
      materialId: 'mat-new',
      quantity: 3,
      note: null,
    }))
  })

  it('records the remaining quantity and variance reason for a previous-season material', async () => {
    render(<ParishInventoryPage />)

    fireEvent.click(await screen.findByText('features.warehouse.openingBtn'))
    fireEvent.change(await screen.findByLabelText('features.warehouse.remainingFor'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('features.warehouse.reasonFor'), { target: { value: 'Đã sử dụng trong mùa trước' } })
    fireEvent.click(screen.getByText('common.save'))

    await waitFor(() => expect(openingRecordMutation).toHaveBeenCalledWith({
      seasonId: 'season-1',
      materialId: 'mat-old',
      quantity: 12,
      note: 'Đã sử dụng trong mùa trước',
    }))
  })
})
