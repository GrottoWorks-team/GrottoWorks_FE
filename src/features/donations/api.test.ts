import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getContributionNeeds } from './api'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('Donations API - Contribution Needs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls /api/v1/seasons/{seasonId}/contribution-needs without filter', async () => {
    const mockData = [
      {
        kind: 'Material',
        workAreaId: 'wa-1',
        materialId: 'mat-1',
        remainingNeed: 10,
      },
    ]
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getContributionNeeds('season-1')

    expect(api).toHaveBeenCalledWith('/api/v1/seasons/season-1/contribution-needs')
    expect(result).toEqual(mockData)
  })

  it('calls /api/v1/seasons/{seasonId}/contribution-needs with query parameters', async () => {
    const mockData = [
      {
        kind: 'Material',
        workAreaId: 'wa-1',
        materialId: 'mat-1',
        remainingNeed: 10,
      },
    ]
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getContributionNeeds('season-1', {
      page: 2,
      size: 15,
      workAreaId: 'wa-1',
      materialId: 'mat-1',
    })

    expect(api).toHaveBeenCalledWith(
      '/api/v1/seasons/season-1/contribution-needs?page=2&size=15&workAreaId=wa-1&materialId=mat-1',
    )
    expect(result).toEqual(mockData)
  })

  it('unwraps data array when response is wrapped in an object with data property', async () => {
    const mockData = [
      {
        kind: 'Material',
        workAreaId: 'wa-1',
        materialId: 'mat-1',
        remainingNeed: 10,
      },
    ]
    vi.mocked(api).mockResolvedValue({ data: mockData })

    const result = await getContributionNeeds('season-1')
    expect(result).toEqual(mockData)
  })
})
