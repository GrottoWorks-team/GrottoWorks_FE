// Prefix route theo role — một nguồn duy nhất.
// `MATERIAL_OFFICER` dùng dấu gạch ngang (`material-officer`), các role khác
// chỉ cần lowercase. Trước đây mỗi nơi tự viết `role.toLowerCase()` nên
// MATERIAL_OFFICER bị `material_officer` → sidebar không set `end` cho
// Dashboard và tab Dashboard sáng cùng tab con.
import type { Role } from '@/types'

export function rolePrefix(role: Role): string {
  return role === 'MATERIAL_OFFICER' ? 'material-officer' : role.toLowerCase()
}

/** Trang chủ (dashboard) của role, kèm dấu `/`. */
export function roleHomePath(role: Role): string {
  return `/${rolePrefix(role)}`
}
