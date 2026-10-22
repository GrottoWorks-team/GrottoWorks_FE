// Identity types matching Backend v1.2 Identity Service schema

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

export interface UserDto {
  id: string
  email: string
  displayName: string
  phone?: string | null
  status: 'Active' | 'Locked' | 'Inactive' | string
  parishId?: string | null
  role: string
}

export interface AvailabilitySlot {
  availableFrom: string
  availableTo: string
  note?: string | null
}

export interface UserProfileDto {
  id: string
  email: string
  displayName: string
  phone?: string | null
  status: string
  parishId?: string | null
  role: string
  communityId?: string | null
  introduction?: string | null
  skillIds: string[]
  availability: AvailabilitySlot[]
}

export interface SkillDto {
  id: string
  code: string
  name: string
  description?: string | null
  status: 'Active' | 'Inactive' | string
}

export interface RegisterRequest {
  displayName: string
  email: string
  password: string
  phone?: string | null
  parishId: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken: string
}

export interface UpdateProfileRequest {
  displayName?: string | null
  phone?: string | null
  introduction?: string | null
  communityId?: string | null
}

export interface CreateSkillRequest {
  code: string
  name: string
  description?: string | null
}

export interface UpdateSkillRequest {
  name?: string | null
  description?: string | null
  status?: 'Active' | 'Inactive'
}

export interface ApiResponse<T> {
  data: T
  meta?: {
    correlationId?: string
    timestamp?: string
  }
}


export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'SUSPENDED'

export interface AdminUserDto {
  id: string
  email: string
  displayName: string
  phone: string | null
  status: UserStatus
  parishId: string | null
  role: string
  communityId: string | null
  hasPassword: boolean
  createdAt: string
  updatedAt: string | null
  version: number
}

export interface RoleDto {
  id: string
  code: string
  name: string
  description: string | null
}

export interface CreateAdminUserRequest {
  email: string
  displayName: string
  phone?: string | null
  role: string
  parishId?: string | null
  password?: string | null
}

export interface UpdateAdminUserRequest {
  email?: string
  displayName?: string
  phone?: string | null
  parishId?: string | null
  status?: UserStatus
}

export interface ReasonCommandRequest {
  reason: string
}

export interface RoleAssignmentRequest {
  role: string
  parishId?: string | null
}
