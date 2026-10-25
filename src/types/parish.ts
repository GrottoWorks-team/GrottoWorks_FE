// Kiểu DTO khớp 1-1 với ParishCoordination service (API Contract v1.3).
// Enum BE serialize snake_case UPPER — giữ nguyên chuỗi, không đổi hoa/thường.
export type ParishStatus = 'ACTIVE' | 'INACTIVE'
export type CommunityStatus = 'ACTIVE' | 'INACTIVE'
export type SeasonStatus = 'PLANNING' | 'ACTIVE' | 'READY' | 'COMPLETED' | 'ARCHIVED'
export type WorkAreaStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'READINESS_REVIEW'
  | 'NEEDS_CORRECTION'
  | 'READY'
  | 'COMPLETED'

export interface ParishDto {
  id: string
  name: string
  address: string | null
  description: string | null
  status: ParishStatus
  createdAt: string
  updatedAt: string | null
  version: number
}

export interface CommunityDto {
  id: string
  parishId: string
  name: string
  description: string | null
  status: CommunityStatus
  createdAt: string
  updatedAt: string | null
  version: number
}

export interface SeasonDto {
  id: string
  parishId: string
  name: string
  seasonYear: number
  startDate: string
  endDate: string
  status: SeasonStatus
  description: string | null
  estimatedBudget: number | null
  createdAt: string
  updatedAt: string | null
  /** Optimistic concurrency — BE bắt buộc gửi lại qua header If-Match khi PATCH. */
  version?: number
}

export interface WorkAreaDto {
  id: string
  seasonId: string
  communityId: string | null
  leaderId: string | null
  materialOfficerId: string | null
  name?: string | null
  description?: string | null
  categoryId?: string | null
  startDate?: string | null
  deadline?: string | null
  status: WorkAreaStatus
  /** Optimistic concurrency — BE bắt buộc gửi lại qua header If-Match khi PATCH/PUT. */
  version?: number
}

export interface CreateParishRequest {
  name: string
  address?: string | null
  description?: string | null
}

export interface UpdateParishRequest {
  name?: string
  address?: string | null
  description?: string | null
  status?: ParishStatus
}

export interface CreateCommunityRequest {
  name: string
  description?: string | null
}

export interface CreateSeasonRequest {
  parishId: string
  name: string
  seasonYear: number
  startDate: string
  endDate: string
  description?: string | null
  estimatedBudget?: number | null
}

export interface CreateWorkAreaRequest {
  name: string
  description?: string | null
  categoryId?: string | null
  communityId?: string | null
  startDate?: string | null
  deadline?: string | null
}

export interface WorkAreaCategoryDto {
  id: string
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
}

export interface CreateWorkAreaCategoryRequest {
  code: string
  name: string
  description?: string | null
}

export interface UpdateWorkAreaCategoryRequest {
  name?: string
  description?: string | null
  status?: 'ACTIVE' | 'INACTIVE'
}

