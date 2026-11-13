import type { Role } from '@/types'

/** Danh sách 5 role code chính thức từ Identity service của BE. */
export const BE_ROLES = ['ADMIN', 'PARISH', 'LEADER', 'MO', 'VOLUNTEER'] as const

export type BeRole = (typeof BE_ROLES)[number]

/** Kiểm tra xem một chuỗi có phải mã role hợp lệ của BE hay không. */
export function isBeRole(role?: string): role is BeRole {
  if (!role) return false
  return BE_ROLES.includes(role.trim().toUpperCase() as BeRole)
}

/**
 * Role code BE → role giao diện web. Xem docs/plans/2026-11-10-gan-api-con-thieu.md §1.
 * Web chỉ có 4 nhánh giao diện quản trị:
 *   ADMIN   → PARISH            (/parish/*  — quản trị hệ thống + giáo xứ)
 *   PARISH  → COMMUNITY         (/community/* — ban điều phối / ban hành giáo)
 *   LEADER  → LEADER            (/leader/* — trưởng khu công tác)
 *   MO      → MATERIAL_OFFICER  (/material-officer/* — trưởng ban vật tư)
 *
 * Lưu ý: VOLUNTEER chỉ sử dụng app mobile, không có role giao diện web.
 */
export const BE_TO_WEB_ROLE = {
  ADMIN: 'PARISH',
  PARISH: 'COMMUNITY',
  LEADER: 'LEADER',
  MO: 'MATERIAL_OFFICER',
} as const satisfies Record<string, Role>

/**
 * Chuẩn hóa role code (BE hoặc alias) sang Web Role.
 * Trả về undefined nếu là VOLUNTEER hoặc mã lạ không có giao diện web để render.
 */
export function normalizeRole(roleStr?: string): Role | undefined {
  if (!roleStr) return undefined
  const code = roleStr.trim().toUpperCase()

  // VOLUNTEER chỉ dùng app mobile — không trả role web hợp lệ để render
  if (code === 'VOLUNTEER') return undefined

  // Ánh xạ trực tiếp từ BE role code sang web role
  if (code in BE_TO_WEB_ROLE) {
    return BE_TO_WEB_ROLE[code as keyof typeof BE_TO_WEB_ROLE]
  }

  // Tương thích ngược với các định dạng tên hiển thị / alias cũ
  if (code === 'MATERIAL_OFFICER' || code.includes('MATERIAL') || code.includes('OFFICER')) {
    return 'MATERIAL_OFFICER'
  }
  if (code.includes('COMMUNITY')) {
    return 'COMMUNITY'
  }
  if (code.includes('LEADER')) {
    return 'LEADER'
  }

  return undefined
}

/**
 * BE role gửi lên quyền cho route / chức năng này không? (dùng khi ẩn/hiện nút, phân quyền UI).
 */
export function beRoleCanAccess(beRole: string, allowed: readonly string[]): boolean {
  if (!beRole || !allowed || allowed.length === 0) return false
  const code = beRole.trim().toUpperCase()
  const webRole = normalizeRole(code)

  return allowed.some((item) => {
    const target = item.trim().toUpperCase()
    if (target === code) return true
    if (webRole && target === webRole) return true
    if (code in BE_TO_WEB_ROLE && BE_TO_WEB_ROLE[code as keyof typeof BE_TO_WEB_ROLE] === target) {
      return true
    }
    return false
  })
}
