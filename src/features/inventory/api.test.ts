import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInventoryAdjustment } from './api'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('inventory API client (Đợt I)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createInventoryAdjustment calls POST /api/v1/inventory-adjustments', async () => {
    vi.mocked(apiModule.api).mockResolvedValueOnce(undefined)

    const payload = {
      materialId: 'mat-101',
      workAreaId: 'area-202',
      reason: 'DAMAGED',
      quantity: 5,
      notes: 'Bị hư hỏng do mưa',
    }

    await createInventoryAdjustment(payload)

    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/inventory-adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })
})
