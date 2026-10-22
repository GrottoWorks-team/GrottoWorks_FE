import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SeasonMaterialNeedsPage from './SeasonMaterialNeedsPage'

const mockNeedsData = [
  {
    workAreaId: 'area-1',
    workAreaName: 'Khu Hang Đá Bê-lem',
    materialId: 'mat-1',
    materialCode: 'LED-WARM-10M',
    materialName: 'Dây LED vàng 10m',
    unit: 'cuộn',
    required: 10,
    shortage: 5,
  },
  {
    workAreaId: 'area-2',
    workAreaName: 'Khu Đồi Cừu',
    materialId: 'mat-2',
    materialCode: 'WOOD-BEAM-3M',
    materialName: 'Cột gỗ 3m',
    unit: 'cây',
    required: 20,
    shortage: 8,
  },
]

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; n?: number; total?: number; current?: number; from?: number; to?: number }) => {
      if (opts?.defaultValue) {
        let val = opts.defaultValue
        if (opts.current !== undefined) val = val.replace('{{current}}', String(opts.current))
        if (opts.total !== undefined) val = val.replace('{{total}}', String(opts.total))
        return val
      }
      return key
    },
  }),
}))

vi.mock('../api', () => ({
  useSeasonMaterialNeeds: vi.fn(),
  useMaterialCatalog: vi.fn(),
}))

vi.mock('@/features/season/api', () => ({
  useSeasons: vi.fn(),
}))

vi.mock('@/features/areas/api', () => ({
  useAreas: vi.fn(),
}))

import { useSeasonMaterialNeeds, useMaterialCatalog } from '../api'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'

describe('SeasonMaterialNeedsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useSeasons).mockReturnValue({
      data: [{ id: 'season-1', name: 'Mùa Giáng Sinh 2026', status: 'ACTIVE' }],
    } as any)

    vi.mocked(useAreas).mockReturnValue({
      data: [
        { id: 'area-1', name: 'Khu Hang Đá Bê-lem', seasonId: 'season-1', status: 'IN_PROGRESS' },
        { id: 'area-2', name: 'Khu Đồi Cừu', seasonId: 'season-1', status: 'IN_PROGRESS' },
      ],
    } as any)

    vi.mocked(useMaterialCatalog).mockReturnValue({
      data: {
        data: [
          { id: 'mat-1', code: 'LED-WARM-10M', name: 'Dây LED vàng 10m', unit: 'cuộn' },
          { id: 'mat-2', code: 'WOOD-BEAM-3M', name: 'Cột gỗ 3m', unit: 'cây' },
        ],
        page: { page: 1, size: 100, totalItems: 2, totalPages: 1 },
      },
    } as any)

    vi.mocked(useSeasonMaterialNeeds).mockReturnValue({
      data: {
        data: mockNeedsData,
        page: { page: 1, size: 15, totalItems: 2, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    } as any)
  })

  it('renders material needs table with shortage quantities and units', async () => {
    render(<SeasonMaterialNeedsPage />)

    expect(screen.getByText('Tổng hợp nhu cầu mua vật tư mùa vụ')).toBeDefined()
    expect(screen.getByText('Dây LED vàng 10m')).toBeDefined()
    expect(screen.getAllByText('Khu Hang Đá Bê-lem').length).toBeGreaterThan(0)
    expect(screen.getByText('+5 cuộn')).toBeDefined()
    expect(screen.getByText('Cột gỗ 3m')).toBeDefined()
    expect(screen.getByText('+8 cây')).toBeDefined()
  })

  it('renders filter dropdowns for season, area, and material', () => {
    render(<SeasonMaterialNeedsPage />)

    expect(screen.getByRole('combobox', { name: /lọc theo mùa vụ/i })).toBeDefined()
    expect(screen.getByRole('combobox', { name: /lọc theo khu vực/i })).toBeDefined()
    expect(screen.getByRole('combobox', { name: /lọc theo vật tư/i })).toBeDefined()
  })
})
