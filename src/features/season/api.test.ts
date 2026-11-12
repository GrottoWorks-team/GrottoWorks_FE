import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getSeasonSupportSummary,
} from './api'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('Season API - Support Summary and Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSeasonSupportSummary calls /api/v1/seasons/{seasonId}/support-summary', async () => {
    const mockData = {
      seasonId: 'season-1',
      totalRequests: 2,
      requests: [{ status: 'PUBLISHED', count: 2 }],
      communities: [],
      calculatedAt: '2026-11-10T00:00:00Z',
    }
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getSeasonSupportSummary('season-1')

    expect(api).toHaveBeenCalledWith('/api/v1/seasons/season-1/support-summary')
    expect(result).toEqual(mockData)
  })
})
