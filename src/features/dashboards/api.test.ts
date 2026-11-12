import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  getSeasonDashboard,
  getWorkAreaDashboard,
  getMaterialsDashboard,
} from './api'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('Dashboards API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSeasonDashboard calls /api/v1/dashboards/season with seasonId', async () => {
    const mockData = { seasonId: 's-1', summary: { tasks: { total: 10 } } }
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getSeasonDashboard('s-1')

    expect(api).toHaveBeenCalledWith('/api/v1/dashboards/season?seasonId=s-1')
    expect(result).toEqual(mockData)
  })

  it('getWorkAreaDashboard calls /api/v1/dashboards/work-area with workAreaId', async () => {
    const mockData = { workAreaId: 'wa-1', summary: { tasks: { total: 5 } } }
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getWorkAreaDashboard('wa-1')

    expect(api).toHaveBeenCalledWith('/api/v1/dashboards/work-area?workAreaId=wa-1')
    expect(result).toEqual(mockData)
  })

  it('getMaterialsDashboard calls /api/v1/dashboards/materials without params', async () => {
    const mockData = { lines: [] }
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getMaterialsDashboard()

    expect(api).toHaveBeenCalledWith('/api/v1/dashboards/materials')
    expect(result).toEqual(mockData)
  })

  it('getMaterialsDashboard calls /api/v1/dashboards/materials with seasonId and workAreaId', async () => {
    const mockData = { lines: [] }
    vi.mocked(api).mockResolvedValue(mockData)

    const result = await getMaterialsDashboard({
      seasonId: 's-1',
      workAreaId: 'wa-1',
    })

    expect(api).toHaveBeenCalledWith('/api/v1/dashboards/materials?workAreaId=wa-1&seasonId=s-1')
    expect(result).toEqual(mockData)
  })
})
