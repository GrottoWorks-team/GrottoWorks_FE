import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateNotificationRule,
  deleteNotificationRule,
} from './api'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('notifications rules & preferences API (Đợt I)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getNotificationPreferences calls GET /api/v1/users/me/notification-preferences', async () => {
    const mockPrefs = {
      inAppEnabled: true,
      pushEnabled: false,
      emailEnabled: true,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockPrefs)

    const res = await getNotificationPreferences()
    expect(res).toEqual(mockPrefs)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/users/me/notification-preferences')
  })

  it('updateNotificationPreferences calls PUT /api/v1/users/me/notification-preferences', async () => {
    const payload = {
      inAppEnabled: true,
      pushEnabled: true,
      emailEnabled: false,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(payload)

    const res = await updateNotificationPreferences(payload)
    expect(res).toEqual(payload)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/users/me/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  })

  it('updateNotificationRule calls PATCH /api/v1/notification-rules/{id} with If-Match', async () => {
    vi.mocked(apiModule.api).mockResolvedValueOnce(undefined)

    const payload = { inAppEnabled: false }
    await updateNotificationRule('rule-1', payload, 3)

    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/notification-rules/rule-1', {
      method: 'PATCH',
      headers: { 'If-Match': '"3"' },
      body: JSON.stringify(payload),
    })
  })

  it('deleteNotificationRule calls DELETE /api/v1/notification-rules/{id}', async () => {
    vi.mocked(apiModule.api).mockResolvedValueOnce(undefined)

    await deleteNotificationRule('rule-1')
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/notification-rules/rule-1', {
      method: 'DELETE',
    })
  })
})
