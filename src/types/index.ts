import type { ParishStatus, SeasonStatus, WorkAreaStatus } from './parish'

export type Role = 'PARISH' | 'COMMUNITY' | 'LEADER' | 'MATERIAL_OFFICER'

export interface Parish {
  id: string
  name: string
  address?: string
  description?: string
  status: ParishStatus
  /** Dùng cho If-Match khi PATCH — BE chặn ghi đè bằng 412. */
  version: number
}

export interface Community {
  id: string
  name: string
  parishId: string
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
  /** Dùng cho If-Match khi PATCH — BE chặn ghi đè bằng 412. */
  version?: number
}

export interface User {
  id: string; name: string; email: string; role: Role; communityId?: string;
  /** Giáo xứ của user — BE dùng để chặn truy cập chéo giáo xứ (403). */
  parishId?: string;
  locked?: boolean;
  /** Tên kỹ năng để hiển thị (dịch từ `skillIds` qua danh mục /api/v1/skills). */
  skills: string[];
  /** GUID kỹ năng — dùng khi gửi PUT /users/me/skills (BE nhận `skillIds`). */
  skillIds?: string[];
  points: number; avatarHue: number;
  /** Role gốc BE trả từ Identity service, ví dụ 'VOLUNTEER'. */
  rawRole?: string;
}

export interface Season {
  id: string
  parishId: string
  name: string
  year: number
  startDate: string
  endDate: string
  status: SeasonStatus
  budget: number
  description?: string
  /** Dùng cho If-Match khi PATCH/activate/complete — BE chặn ghi đè bằng 412. */
  version?: number
  createdAt?: string
}

export type AreaType = 'GROTTO' | 'TREE' | 'LIGHTING' | 'YARD' | 'STAGE'

export interface WorkArea {
  id: string
  name: string
  /**
   * `type` / `level` / `progress` / `volunteerCount` / `taskCount` KHÔNG có trong
   * `WorkAreaDto` của BE (thuộc service Task/Volunteer chưa gắn) → optional, UI
   * phải hiển thị "—" thay vì bịa giá trị.
   */
  type?: AreaType
  level?: 'PARISH' | 'COMMUNITY'
  /** Hạng mục khu vực (`work-area-categories`) — BE trả `categoryId`. */
  categoryId?: string
  communityId?: string
  leaderId: string
  officerId: string
  progress?: number
  volunteerCount?: number
  taskCount?: number
  status: WorkAreaStatus
  seasonId?: string
  startDate?: string
  deadline?: string
  description?: string
  mapX?: number
  mapY?: number
  /** Dùng cho If-Match khi PATCH/PUT — BE chặn ghi đè bằng 412. */
  version?: number
}

/**
 * Bản đồ mặt bằng giáo xứ — ảnh nền để ban hành giáo (COMMUNITY) phân bổ khu
 * vực công tác. Ảnh nằm ở IndexedDB phía client (lib/blobStore) giai đoạn mock;
 * chỉ metadata + toạ độ khu đi qua MSW.
 */
export interface ParishMap {
  id: string;
  /** Khoá blob ảnh mặt bằng (IndexedDB `grotto-blobs-v1`). */
  imageKey: string;
  fileName?: string;
  updatedAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Task {
  id: string; areaId: string; title: string; description: string; skills: string[];
  /** Kỹ năng yêu cầu dạng GUID (`TaskDto.skills` của TaskExecution) — hiển thị qua danh mục `/api/v1/skills`. */
  skillIds?: string[];
  /** Nhu cầu vật tư chi tiết (`TaskDto.materials`) — dùng để prefill dialog gán vật tư. */
  materialRequirements?: Array<{ materialId: string; requiredQuantity: number; note?: string | null }>;
  estimateHours: number; volunteersNeeded: number; assignees: string[]; materialIds: string[];
  status: 'TODO' | 'READY' | 'DOING' | 'REVIEW' | 'DONE' | 'REVISE'; dueDate: string;
  /** Ngày bắt đầu dự kiến (`TaskDto.startAt`) — việc chuyển IN_PROGRESS khi leader duyệt check-in. */
  startAt?: string | null;
  /**
   * Trạng thái gốc của TaskExecution (OPEN | NOT_STARTED | IN_PROGRESS | …).
   * Cần để biết có gọi được POST /tasks/{id}/ready (chỉ OPEN → NOT_STARTED) hay không.
   */
  backendStatus?: 'OPEN' | 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVISION_REQUIRED' | 'COMPLETED' | 'CANCELLED';
  submittedPhotos: number; submittedNotes?: string;
  /** Ưu tiên từ TaskExecution (LOW|MEDIUM|HIGH|CRITICAL) — BE trả sẵn trong TaskDto. */
  priority?: TaskPriority;
  version?: number;
}

export interface VolunteerReg { id: string; taskId: string; volunteerId: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' }

export interface Material {
  id: string; areaId: string; name: string; unit: string;
  required: number; existing: number; purchased: number;
  donatedPledged: number; donatedReceived: number; received: number;
  buyerId?: string; status: 'SHORTAGE' | 'INCOMING' | 'ENOUGH';
  /** Đơn giá dự kiến (VNĐ) — tính tổng đề nghị mua = qty × estUnitPrice. */
  estUnitPrice: number;
}

/** Thiếu hụt = nhu cầu - đã về kho (existing + purchased + donatedReceived). */
export function shortage(m: Pick<Material, 'required' | 'received'>): number {
  return m.required - m.received;
}

export interface PurchaseRequest {
  id: string; materialIds: string[]; total: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'; createdBy: string; note?: string;
  /** Lý do committee từ chối — tách riêng, không đè note gốc. */
  rejectReason?: string;
  /** Số lượng đề nghị mua từng vật tư (key = materialId) — default lúc xác nhận. */
  qtys?: Record<string, number>;
}

export interface PurchaseRecord {
  id: string; requestId: string; materialId: string; qty: number; cost: number;
  supplier: string; date: string; receiptPhoto?: string; confirmed: boolean; buyerId: string;
}

/** Một dòng vật tư của đơn quyên góp (`DonationItemDto`). */
export interface DonationItem {
  id: string; materialId: string; materialCode: string; materialName: string; unit: string;
  pledgedQuantity: number; receivedQuantity: number; unusableQuantity: number; usableQuantity: number;
  /** Trạng thái suy ra của dòng (BE: PLEDGED | PARTIALLY_RECEIVED | RECEIVED | OVER_RECEIVED). */
  status: string; note?: string;
}

/** Đơn quyên góp (`DonationDto`, API Contract v1.3.2). */
export interface Donation {
  id: string; donorId: string; donorName: string; seasonId: string; workAreaId?: string;
  type: 'MONEY' | 'MATERIAL';
  status: 'PLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  pledgedAmount?: number; receivedAmount?: number;
  donationDate: string; items: DonationItem[]; note?: string; cancelReason?: string;
  version: number;
}

/** Người quyên góp (`DonorDto`). */
export interface Donor {
  id: string; donorName: string; phone?: string; email?: string; address?: string; note?: string;
}

export type BorrowedItemStatus = 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'ISSUED' | 'IN_USE' | 'RETURNED'
export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'LOST'

export interface BorrowTransaction {
  id: string
  borrowDate: string
  returnDate?: string
  condition?: ReturnCondition
  quantity?: number
  kind: 'ISSUE' | 'RETURN' | 'INCIDENT' | string
  recordedBy?: string
  note?: string
}

/** Đồ mượn / chào cho mượn (`BorrowedItemDto`). */
export interface BorrowedItem {
  id: string
  seasonId: string
  workAreaId?: string
  taskId?: string
  offeredBy: string
  acceptedBy?: string
  ownerName: string
  ownerPhone?: string
  ownerAddress?: string
  ownerNote?: string
  itemName: string
  quantity: number
  description?: string
  initialCondition?: string
  expectedReturnDate: string
  status: BorrowedItemStatus
  overdue: boolean
  rejectionReason?: string
  acceptedAt?: string
  createdAt: string
  transactions: BorrowTransaction[]
  version: number
}

/** Một dòng vật tư của phiếu cấp phát (`MaterialAllocationItemDto`). */
export interface AllocationItem {
  materialId: string; materialCode: string; materialName: string; unit: string;
  /** Số lượng đã cấp — BE giữ nguyên lịch sử, không sửa ngược. */
  allocatedQuantity: number;
}

/** Phiếu cấp phát từ kho của một Work Area (`MaterialAllocationDto`). */
export interface Allocation {
  id: string; workAreaId: string; workAreaName: string;
  taskId?: string; taskName?: string;
  allocatedBy: string; allocationDate: string; note?: string;
  items: AllocationItem[];
}

export type AttendanceRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type AttendanceCorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Đơn xin check-in của TNV (`AttendanceRequestDto`). */
export interface AttendanceRequest {
  id: string
  assignmentId: string
  type: string
  requestedAt: string
  status: AttendanceRequestStatus
  note?: string
  attendanceId?: string
  reviewedBy?: string
  reviewNote?: string
  reviewedAt?: string
  version: number
}

/** Đơn xin sửa giờ sau khi phiên công đã đóng (`AttendanceCorrectionDto`). */
export interface AttendanceCorrection {
  id: string
  attendanceId: string
  requestedBy: string
  reviewedBy?: string
  originalCheckInAt: string
  originalCheckOutAt?: string
  requestedCheckInAt: string
  requestedCheckOutAt: string
  reason: string
  status: AttendanceCorrectionStatus
  reviewNote?: string
  createdAt: string
  reviewedAt?: string
  version: number
}

export interface WorkingHourSummary {
  volunteerId: string
  approvedMinutes: number
  approvedHours: number
}

export interface Timesheet {
  id: string; volunteerId: string; date: string; checkIn: string; checkOut?: string;
  hours: number; correctionRequest?: string; status: 'OPEN' | 'CLOSED' | 'PENDING_FIX';
}

export type SupportType = 'STAFFING' | 'MATERIAL' | 'MIXED'
export type SupportStatus =
  | 'PLANNING' | 'PUBLISHED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CLOSED' | 'CANCELLED'

export interface SupportPositionSkill {
  skillId: string
  requiredSkillLevel?: string
}

export interface SupportPosition {
  id: string
  name: string
  requiredVolunteerCount: number
  note?: string
  skills: SupportPositionSkill[]
}

export interface SupportMaterial {
  id: string
  materialId: string
  requiredQuantity: number
  note?: string
}

/** Yêu cầu hỗ trợ chéo cộng đoàn (`SupportRequestDto`). */
export interface SupportRequest {
  id: string
  seasonId: string
  workAreaId: string
  requestedBy: string
  supportType: SupportType
  description?: string
  deadline?: string
  status: SupportStatus
  createdAt: string
  updatedAt?: string
  version: number
  positions: SupportPosition[]
  materials: SupportMaterial[]
  responses?: SupportResponse[]
}

export interface SupportResponseMember {
  id: string
  positionId: string
  volunteerId: string
  status: string
  assignmentId?: string | null
  version: number
  reviewedBy?: string | null
  reviewedAt?: string | null
  reason?: string | null
}

export interface SupportResponseMaterial {
  id: string
  requestMaterialId: string
  sourceWorkAreaId: string
  materialId: string
  offeredQuantity: number
  approvedQuantity?: number | null
  receivedUsableQuantity?: number | null
  receivedUnusableQuantity?: number | null
  status: string
  version: number
  note?: string | null
  reviewReason?: string | null
}

export interface SupportResponse {
  id: string
  requestId: string
  volunteerId?: string | null
  respondingCommunityId?: string | null
  status: string
  responseQuantity: number
  note?: string | null
  createdAt: string
  version: number
  members: SupportResponseMember[]
  materials: SupportResponseMaterial[]
}

export type ReadinessCheckStatus =
  | 'PLANNING' | 'IN_REVIEW' | 'NEEDS_CORRECTION' | 'READY' | 'REOPENED'
export type ReadinessItemStatus =
  | 'PENDING' | 'PASSED' | 'FAILED' | 'CORRECTIVE_ACTION' | 'RECHECK'

export interface ReadinessItem {
  id: string
  name: string
  description?: string
  mandatory: boolean
  status: ReadinessItemStatus
  correctiveTaskId?: string
  checkedBy?: string
  checkedAt?: string
  note?: string
  evidenceFileIds: string[]
  /** Version của cả phiếu sau thay đổi — dùng cho If-Match lần tiếp theo. */
  checkVersion: number
}

export interface ReadinessCheck {
  id: string
  workAreaId: string
  workAreaName: string
  seasonId: string
  name: string
  status: ReadinessCheckStatus
  reopenReason?: string
  completedBy?: string
  completedAt?: string
  items: ReadinessItem[]
  version: number
}

export interface WorkAreaReadiness {
  workAreaId: string
  workAreaName: string
  workAreaStatus: string
  readinessCheckId?: string
  checklistStatus?: ReadinessCheckStatus
  totalItems: number
  mandatoryItems: number
  passedItems: number
  failedItems: number
  pendingItems: number
  ready: boolean
}

export interface SeasonReadiness {
  seasonId: string
  workAreas: number
  readyWorkAreas: number
  areas: WorkAreaReadiness[]
}

export interface ActivityLog { id: string; at: string; actor: string; action: string; target: string }

/** Hình thức đồng hành đăng ký từ trang landing công khai (chưa có tài khoản). */
export type RegistrationKind = 'VOLUNTEER' | 'MATERIAL' | 'MONETARY';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * Đăng ký đồng hành công khai (form trên trang /join) — KHÁC với
 * VolunteerReg/SupportReg (đăng ký vào một nhiệm vụ/yêu cầu cụ thể, cần đăng
 * nhập). Bản ghi này để ban điều hành liên hệ lại; `createdAt`/`status` do
 * server/mock sinh khi POST.
 */
export interface Registration {
  id: string;
  name: string;
  phone: string;
  email?: string;
  /** Giáo khu người đăng ký sinh hoạt (không bắt buộc với khách ngoài giáo xứ). */
  communityId?: string;
  /** Khu vực muốn đồng hành — 5 loại khu vực công tác. */
  areaType?: AreaType;
  kind: RegistrationKind;
  /** Kỹ năng có thể hỗ trợ (khớp danh mục /api/skills). */
  skills?: string[];
  note?: string;
  createdAt: string;
  status: RegistrationStatus;
}

// ── Design Review (2D/3D) ──────────────────────────────────────────────────
// Hồ sơ thiết kế của một khu vực + phiên bản file + yêu cầu chỉnh sửa.
// KHÁC với các luồng mua/quyên góp: đây là không gian review bản vẽ/ảnh/mô
// hình đã có sẵn (không tạo mô hình bằng AI).

export type DesignType = 'TWO_D' | 'THREE_D';
export type DesignVersionStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';
export type DesignCommentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
export type DesignCommentPriority = 'LOW' | 'MEDIUM' | 'HIGH';
/** Kiểu vị trí gắn kèm của một yêu cầu review. */
export type DesignPositionType = 'NONE' | 'IMAGE_2D' | 'MODEL_3D';

export interface Design {
  id: string;
  /** Khu vực công tác (WorkArea.id) mà hồ sơ thiết kế thuộc về. */
  areaId: string;
  title: string;
  description?: string;
  designType: DesignType;
  /** Phiên bản đang xem mặc định (DesignVersion.id). */
  currentVersionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignVersion {
  id: string;
  designId: string;
  versionNumber: number;
  /**
   * Khoá blob phía client (IndexedDB `grotto-blobs-v1`) trong giai đoạn mock.
   * Production: thay bằng storage key/URL của hệ thống file thật.
   */
  fileKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  changeNote?: string;
  status: DesignVersionStatus;
  uploadedBy: string;
  uploadedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface DesignComment {
  id: string;
  /** Yêu cầu luôn gắn với MỘT phiên bản — không chỉ với hồ sơ thiết kế. */
  designVersionId: string;
  title: string;
  description?: string;
  priority: DesignCommentPriority;
  status: DesignCommentStatus;
  positionType: DesignPositionType;
  /** Toạ độ CHUẨN HOÁ 0..1 theo ảnh gốc (chỉ khi positionType = IMAGE_2D). */
  position2D?: { x: number; y: number };
  /** Toạ độ theo hệ toạ độ model (chỉ khi positionType = MODEL_3D) — L3. */
  position3D?: { x: number; y: number; z: number };
  /** Tên mesh/object nếu xác định được (chỉ khi MODEL_3D). */
  objectName?: string;
  createdBy: string;
  assignedTo?: string;
  /** Task.id nếu yêu cầu đã được chuyển thành nhiệm vụ. */
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

// Danh mục kỹ năng dùng chung (Admin — Task 12 quản trị danh mục).
export const SKILLS = ['Điện', 'Mộc', 'Hàn', 'Trang trí', 'Vận chuyển', 'Logistics', 'Sơn'] as const;
