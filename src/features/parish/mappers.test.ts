import { describe, expect, it } from 'vitest'
import { toCommunity, toParish, toSeason, toWorkArea } from './mappers'

describe('toParish', () => {
  it('giữ nguyên field có thật và bỏ null thành undefined', () => {
    const p = toParish({
      id: 'p1', name: 'Giáo xứ Tân Định', address: null, description: 'Mô tả',
      status: 'ACTIVE', createdAt: '2026-10-01T00:00:00Z', updatedAt: null, version: 3,
    })
    expect(p).toEqual({
      id: 'p1', name: 'Giáo xứ Tân Định', address: undefined,
      description: 'Mô tả', status: 'ACTIVE', version: 3,
    })
  })
})

describe('toCommunity', () => {
  it('giữ parishId và description null → undefined', () => {
    const c = toCommunity({
      id: 'c1', parishId: 'p1', name: 'Giáo khu Bắc', description: null,
      status: 'INACTIVE', createdAt: '2026-10-01T00:00:00Z', updatedAt: null, version: 1,
    })
    expect(c).toEqual({
      id: 'c1', parishId: 'p1', name: 'Giáo khu Bắc',
      description: undefined, status: 'INACTIVE', version: 1,
    })
  })
})

describe('toSeason', () => {
  it('đổi seasonYear → year, estimatedBudget null → 0, communityIds rỗng', () => {
    const s = toSeason({
      id: 's1', parishId: 'p1', name: 'Mùa Giáng sinh 2026', seasonYear: 2026,
      startDate: '2026-10-01', endDate: '2027-01-15', status: 'PLANNING',
      description: null, estimatedBudget: null,
      createdAt: '2026-10-01T00:00:00Z', updatedAt: null,
    })
    expect(s).toEqual({
      id: 's1', parishId: 'p1', name: 'Mùa Giáng sinh 2026', year: 2026,
      startDate: '2026-10-01', endDate: '2027-01-15', status: 'PLANNING',
      budget: 0, description: undefined, communityIds: [],
    })
  })

  it('giữ nguyên estimatedBudget khi có giá trị', () => {
    const s = toSeason({
      id: 's2', parishId: 'p1', name: 'M', seasonYear: 2027,
      startDate: '2027-10-01', endDate: '2028-01-15', status: 'ACTIVE',
      description: 'x', estimatedBudget: 100000000,
      createdAt: '2026-10-01T00:00:00Z', updatedAt: null,
    })
    expect(s.budget).toBe(100000000)
    expect(s.description).toBe('x')
  })
})

describe('toWorkArea', () => {
  it('map materialOfficerId → officerId, null leaderId/officerId → chuỗi rỗng', () => {
    const a = toWorkArea({
      id: 'a1', seasonId: 's1', communityId: null, leaderId: null,
      materialOfficerId: 'u9', name: 'Khu hang đá', description: 'Trước nhà thờ',
      startDate: '2026-10-01', deadline: '2026-12-20', status: 'PLANNED',
    })
    expect(a).toEqual({
      id: 'a1', seasonId: 's1', name: 'Khu hang đá', description: 'Trước nhà thờ',
      communityId: undefined, leaderId: '', officerId: 'u9',
      startDate: '2026-10-01', deadline: '2026-12-20', status: 'PLANNED',
      // BE chưa trả các field dưới — giá trị mặc định để UI không vỡ.
      type: 'GROTTO', level: 'PARISH', progress: 0, volunteerCount: 0, taskCount: 0,
    })
  })

  it('fallback tên khi BE không trả name', () => {
    const a = toWorkArea({
      id: '66666666-6666-6666-6666-666666666666', seasonId: 's1', communityId: null, leaderId: null,
      materialOfficerId: null, status: 'PLANNED',
    })
    expect(a.name).toBe('Khu vực #66666666')
  })

  it('giữ communityId khi có', () => {
    const a = toWorkArea({
      id: 'a2', seasonId: 's1', communityId: 'c1', leaderId: 'u1',
      materialOfficerId: null, name: 'Khu sân', description: null,
      startDate: null, deadline: null, status: 'READINESS_REVIEW',
    })
    expect(a.communityId).toBe('c1')
    expect(a.leaderId).toBe('u1')
    expect(a.officerId).toBe('')
    expect(a.description).toBeUndefined()
    expect(a.status).toBe('READINESS_REVIEW')
  })
})
