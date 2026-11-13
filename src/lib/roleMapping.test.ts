import { describe, expect, it } from 'vitest'
import {
  BE_ROLES,
  BE_TO_WEB_ROLE,
  beRoleCanAccess,
  isBeRole,
  normalizeRole,
} from './roleMapping'

describe('roleMapping (Đợt 0: đồng nhất role FE ↔ BE)', () => {
  it('định nghĩa đúng danh sách 5 role BE thật và không đưa VOLUNTEER vào web role', () => {
    expect(BE_ROLES).toEqual(['ADMIN', 'PARISH', 'LEADER', 'MO', 'VOLUNTEER'])
    expect(isBeRole('ADMIN')).toBe(true)
    expect(isBeRole('PARISH')).toBe(true)
    expect(isBeRole('LEADER')).toBe(true)
    expect(isBeRole('MO')).toBe(true)
    expect(isBeRole('VOLUNTEER')).toBe(true)
    expect(isBeRole('UNKNOWN')).toBe(false)
  })

  it('bảng BE_TO_WEB_ROLE ánh xạ chính xác 4 role quản trị web', () => {
    expect(BE_TO_WEB_ROLE).toEqual({
      ADMIN: 'PARISH',
      PARISH: 'COMMUNITY',
      LEADER: 'LEADER',
      MO: 'MATERIAL_OFFICER',
    })
  })

  describe('normalizeRole', () => {
    it('khoá đúng 4 role BE sang 4 web role tương ứng', () => {
      expect(normalizeRole('ADMIN')).toBe('PARISH')
      expect(normalizeRole('PARISH')).toBe('COMMUNITY')
      expect(normalizeRole('LEADER')).toBe('LEADER')
      expect(normalizeRole('MO')).toBe('MATERIAL_OFFICER')
    })

    it('hỗ trợ không phân biệt hoa thường và khoảng trắng', () => {
      expect(normalizeRole(' admin ')).toBe('PARISH')
      expect(normalizeRole('parish')).toBe('COMMUNITY')
      expect(normalizeRole('Leader')).toBe('LEADER')
      expect(normalizeRole('mo')).toBe('MATERIAL_OFFICER')
    })

    it('giữ nguyên các web role đã chuẩn hóa không trùng mã BE', () => {
      expect(normalizeRole('MATERIAL_OFFICER')).toBe('MATERIAL_OFFICER')
      expect(normalizeRole('COMMUNITY')).toBe('COMMUNITY')
    })

    it('VOLUNTEER không trả role web hợp lệ để render', () => {
      const volunteerWebRole = normalizeRole('VOLUNTEER')
      expect(volunteerWebRole).toBeUndefined()
    })

    it('mã lạ hoặc rỗng không trả role web hợp lệ', () => {
      expect(normalizeRole('UNKNOWN')).toBeUndefined()
      expect(normalizeRole('GUEST')).toBeUndefined()
      expect(normalizeRole('')).toBeUndefined()
      expect(normalizeRole(undefined)).toBeUndefined()
    })
  })

  describe('beRoleCanAccess', () => {
    it('cho phép khi quyền khớp trực tiếp mã BE hoặc web role tương ứng', () => {
      expect(beRoleCanAccess('ADMIN', ['PARISH'])).toBe(true)
      expect(beRoleCanAccess('ADMIN', ['ADMIN'])).toBe(true)
      expect(beRoleCanAccess('PARISH', ['COMMUNITY'])).toBe(true)
      expect(beRoleCanAccess('LEADER', ['LEADER'])).toBe(true)
      expect(beRoleCanAccess('MO', ['MATERIAL_OFFICER'])).toBe(true)
      expect(beRoleCanAccess('MO', ['MO'])).toBe(true)
      expect(beRoleCanAccess('mo', ['material_officer'])).toBe(true)
    })

    it('từ chối khi role không nằm trong danh sách được phép', () => {
      expect(beRoleCanAccess('LEADER', ['PARISH', 'COMMUNITY'])).toBe(false)
      expect(beRoleCanAccess('MO', ['LEADER'])).toBe(false)
    })

    it('VOLUNTEER bị từ chối vào các route quản trị web', () => {
      expect(
        beRoleCanAccess('VOLUNTEER', [
          'PARISH',
          'COMMUNITY',
          'LEADER',
          'MATERIAL_OFFICER',
        ]),
      ).toBe(false)
    })

    it('mã lạ hoặc danh sách quyền rỗng đều trả về false', () => {
      expect(beRoleCanAccess('UNKNOWN', ['PARISH'])).toBe(false)
      expect(beRoleCanAccess('', ['PARISH'])).toBe(false)
      expect(beRoleCanAccess('ADMIN', [])).toBe(false)
    })
  })
})
