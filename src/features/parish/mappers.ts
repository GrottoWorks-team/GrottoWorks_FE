// Dịch DTO của ParishCoordination service sang domain type của FE.
// Một chỗ duy nhất — page/hook không tự map tay.
import type { Community, Parish, Season, WorkArea } from '@/types'
import type { CommunityDto, ParishDto, SeasonDto, WorkAreaDto } from '@/types/parish'

/** BE trả null cho field optional, domain type dùng undefined. */
const opt = (v: string | null | undefined): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : v

export function toParish(dto: ParishDto): Parish {
  return {
    id: dto.id,
    name: dto.name,
    address: opt(dto.address),
    description: opt(dto.description),
    status: dto.status,
    version: dto.version,
  }
}

export function toCommunity(dto: CommunityDto): Community {
  return {
    id: dto.id,
    parishId: dto.parishId,
    name: dto.name,
    description: opt(dto.description),
    status: dto.status,
  }
}

export function toSeason(dto: SeasonDto): Season {
  return {
    id: dto.id,
    parishId: dto.parishId,
    name: dto.name,
    year: dto.seasonYear,
    startDate: dto.startDate,
    endDate: dto.endDate,
    status: dto.status,
    budget: dto.estimatedBudget ?? 0,
    description: opt(dto.description),
    // BE không lưu cộng đoàn trên mùa; trang Mùa suy ra từ work-areas.
    communityIds: [],
  }
}

export function toWorkArea(dto: WorkAreaDto): WorkArea {
  return {
    id: dto.id,
    seasonId: dto.seasonId,
    name: dto.name ? dto.name : `Khu vực #${dto.id.slice(0, 8)}`,
    description: opt(dto.description),
    communityId: opt(dto.communityId),
    leaderId: dto.leaderId ?? '',
    officerId: dto.materialOfficerId ?? '',
    startDate: opt(dto.startDate),
    deadline: opt(dto.deadline),
    status: dto.status,
    // ponytail: BE chưa trả type/level/progress/volunteerCount/taskCount
    // (những số này thuộc service Task/Volunteer, chưa gắn). Mặc định để UI
    // render được; gắn service tương ứng thì bỏ các dòng này.
    type: 'GROTTO',
    level: 'PARISH',
    progress: 0,
    volunteerCount: 0,
    taskCount: 0,
  }
}
