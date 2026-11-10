import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createReportExport,
  getReportExportJob,
  getReportExportFileUrl,
  createSystemDataExport,
} from './api'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('reports exports API client (Đợt H)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createReportExport calls POST /api/v1/report-exports', async () => {
    const mockJob = {
      id: 'job-1',
      reportType: 'Tasks',
      format: 'Xlsx',
      status: 'Queued',
      createdAt: '2026-12-01T00:00:00Z',
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockJob)

    const payload = {
      reportType: 'Tasks',
      format: 'Xlsx' as const,
      seasonId: 'season-1',
    }

    const res = await createReportExport(payload)
    expect(res).toEqual(mockJob)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/report-exports', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('getReportExportJob calls GET /api/v1/report-exports/{id}', async () => {
    const mockJob = {
      id: 'job-1',
      reportType: 'Tasks',
      format: 'Xlsx',
      status: 'Succeeded',
      fileName: 'tasks.xlsx',
      downloadUrl: '/api/v1/report-exports/job-1/file',
      createdAt: '2026-12-01T00:00:00Z',
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockJob)

    const res = await getReportExportJob('job-1')
    expect(res).toEqual(mockJob)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/report-exports/job-1')
  })

  it('getReportExportFileUrl formats correct URL', () => {
    expect(getReportExportFileUrl('job-abc')).toBe('/api/v1/report-exports/job-abc/file')
  })

  it('createSystemDataExport calls POST /api/v1/system-data-exports', async () => {
    const mockSystemJob = {
      jobId: 'sys-1',
      status: 'Queued',
      services: ['Identity', 'TaskExecution'],
      createdAt: '2026-12-01T00:00:00Z',
      attempts: 0,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockSystemJob)

    const payload = { services: ['Identity', 'TaskExecution'] }
    const res = await createSystemDataExport(payload)
    expect(res).toEqual(mockSystemJob)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/system-data-exports', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
})
