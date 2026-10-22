// Users domain — query key ['users']. Feature khác cần chọn user theo role
// thì import hook từ đây, KHÔNG copy trùng key.
//
// BE (Identity):
//   GET /api/v1/users        → PARISH | LEADER | MO, user cùng giáo xứ, có phân trang
//   GET /api/v1/admin/users  → ADMIN (ADMIN không thuộc policy của endpoint trên → 403)
// Trước đây gọi `/api/users` của lớp MSW đã bị xoá nên luôn 404.
import { useQuery } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { normalizeRole } from '@/lib/auth'
import type { User } from '@/types'

interface UserSummaryDto {
  id: string
  displayName: string
  email: string
  phone?: string | null
  role: string
  status: string
  parishId?: string | null
  communityId?: string | null
  skillIds?: string[]
}

interface AdminUserDto {
  id: string
  displayName: string
  email: string
  phone?: string | null
  role: string
  status: string
  parishId?: string | null
  communityId?: string | null
}

interface SkillDto {
  id: string
  name: string
}

async function fetchUserDtos(): Promise<(UserSummaryDto & { skillIds?: string[] })[]> {
  try {
    return await api<UserSummaryDto[]>('/api/v1/users?size=100')
  } catch (error) {
    // ADMIN đăng nhập web (role PARISH ở FE) không nằm trong policy listParishUsers.
    if (error instanceof ApiError && error.status === 403) {
      const admins = await api<AdminUserDto[]>('/api/v1/admin/users?size=100')
      return admins.map((u) => ({ ...u, skillIds: [] }))
    }
    throw error
  }
}

/** Hue avatar ổn định theo id để UI không đổi màu mỗi lần load. */
function hueFrom(seed: string): number {
  let hue = 0
  for (let i = 0; i < seed.length; i += 1) hue = (hue * 31 + seed.charCodeAt(i)) % 360
  return hue
}

// Lưu ý: query bị `enabled: false` thì `isPending` vẫn là true → đừng gate UI
// đang tải theo kiểu này khi tắt query.
export function useUsers(options: { enabled?: boolean; withSkills?: boolean } = {}) {
  const withSkills = options.withSkills ?? true
  return useQuery({
    // 2 biến thể cache riêng để không đá nhau giữa "đủ field" và "chỉ tên".
    queryKey: withSkills ? ['users'] : ['users', 'names'],
    enabled: options.enabled ?? true,
    queryFn: async (): Promise<User[]> => {
      // BE trả skillId (GUID) — dịch sang tên để các trang hiển thị như trước.
      const [dtos, skills] = await Promise.all([
        fetchUserDtos(),
        withSkills
          ? api<SkillDto[]>('/api/v1/skills').catch(() => [] as SkillDto[])
          : Promise.resolve([] as SkillDto[]),
      ])
      const nameById = new Map(skills.map((skill) => [skill.id, skill.name]))
      return dtos.map((dto) => ({
        id: dto.id,
        name: dto.displayName || dto.email,
        email: dto.email,
        role: normalizeRole(dto.role),
        communityId: dto.communityId ?? undefined,
        parishId: dto.parishId ?? undefined,
        locked: dto.status?.toUpperCase() === 'LOCKED',
        skills: (dto.skillIds ?? [])
          .map((id) => nameById.get(id))
          .filter((name): name is string => Boolean(name)),
        // ponytail: điểm thưởng chưa có ở BE (service Volunteer/Reward chưa gắn).
        points: 0,
        avatarHue: hueFrom(dto.id || dto.email),
      }))
    },
  })
}
