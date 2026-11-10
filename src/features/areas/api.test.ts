import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getWorkAreaProgress,
  updateWorkAreaProgress,
  getWorkAreaReadinessChecks,
} from './api'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('areas progress & readiness checks API (Đợt I)', () => {
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

  it('updateWorkAreaProgress calls PUT /api/v1/work-areas/{id}/progress', async () => {
    const mockProgress = {
      workAreaId: 'area-1',
      progressPercentage: 80,
      tasksTotal: 8,
      tasksCompleted: 6,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockProgress)

    const res = await updateWorkAreaProgress('area-1', 80)
    expect(res).toEqual(mockProgress)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/work-areas/area-1/progress', {
      method: 'PUT',
      body: JSON.stringify({ progressPercentage: 80 }),
    })
  })

  it('getWorkAreaReadinessChecks calls GET /api/v1/work-areas/{id}/readiness-checks', async () => {
    const mockChecks = [{ id: 'chk-1', title: 'Điện chiếu sáng', status: 'PASS' }]
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockChecks)

    const res = await getWorkAreaReadinessChecks('area-1')
    expect(res).toEqual(mockChecks)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/work-areas/area-1/readiness-checks')
  })
})
