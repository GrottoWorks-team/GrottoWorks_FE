import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkAreaProgress } from './progressApi'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('areas progress API (Đợt I)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getWorkAreaProgress calls GET /api/v1/work-areas/{id}/progress', async () => {
    const mockProgress = {
      workAreaId: 'area-1',
      seasonId: 'season-1',
      progressPercentage: 75,
      tasksTotal: 8,
      tasksCompleted: 6,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockProgress)

    const res = await getWorkAreaProgress('area-1')
    expect(res).toEqual(mockProgress)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/work-areas/area-1/progress')
  })
})
