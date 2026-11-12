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
  locked?: boolean; skills: string[]; points: number; avatarHue: number;
  /** Role gốc BE trả từ Identity service, ví dụ 'VOLUNTEER'. */
  rawRole?: string;
  /** [fe-api-gap-2] Trạng thái tài khoản BE Identity: 'Active' | 'Locked' | 'Inactive' | string. */
  status?: string;
  /** [fe-api-gap-2] Version dùng cho If-Match (optimistic concurrency) khi lock/unlock/update/assignRole. */
  version?: number;
  /** Khung giờ rảnh — BE `UserProfileDto.Availability`. Chỉ TNV mới có. */
  availability?: { availableFrom: string; availableTo: string; note?: string | null }[];
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
  /** BE không lưu cộng đoàn trên mùa — suy ra từ WorkArea.CommunityId. */
  communityIds?: string[]
  /** Dùng cho If-Match khi PATCH/activate/complete — BE chặn ghi đè bằng 412. */
  version?: number
  createdAt?: string
}

export type AreaType = 'GROTTO' | 'TREE' | 'LIGHTING' | 'YARD' | 'STAGE'

export interface WorkArea {
  id: string
  name: string
  type: AreaType
  level: 'PARISH' | 'COMMUNITY'
  communityId?: string
  leaderId: string
  officerId: string
  progress: number
  volunteerCount: number
  taskCount: number
  status: WorkAreaStatus
  seasonId?: string
  categoryId?: string
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
  estimateHours: number; volunteersNeeded: number; assignees: string[]; materialIds: string[];
  status: 'TODO' | 'READY' | 'DOING' | 'REVIEW' | 'DONE' | 'REVISE'; dueDate: string;
  submittedPhotos: number; submittedNotes?: string;
  /** Ưu tiên từ TaskExecution (LOW|MEDIUM|HIGH|CRITICAL) — BE trả sẵn trong TaskDto. */
  priority?: TaskPriority;
  startAt?: string;
  version?: number;
  teamLeaderAssignmentId?: string | null;
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

export type DonationType = 'MONEY' | 'MATERIAL'
export type DonationStatus = 'PLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' | 'CANCELED'
export type DonationItemStatus = 'PLEDGED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'UNUSABLE' | 'CANCELLED'

export interface DonationItem {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  pledgedQuantity?: number | null
  receivedQuantity: number
  unusableQuantity: number
  usableQuantity: number
  status: DonationItemStatus
  note?: string | null
}

export interface DonationReceiptItem {
  id: string
  donationItemId: string
  materialId: string
  receivedQuantity: number
  unusableQuantity: number
  usableQuantity: number
}

export interface DonationReceipt {
  id: string
  receivedAt: string
  receivedBy: string
  receivedAmount?: { amount: number; currency: string } | null
  note?: string | null
  items: DonationReceiptItem[]
}

export interface Donation {
  id: string
  donorId: string
  donorName: string
  seasonId: string
  workAreaId?: string | null
  type: DonationType
  status: DonationStatus
  pledgedAmount?: { amount: number; currency: string } | null
  receivedAmount?: { amount: number; currency: string } | null
  donationDate: string
  items: DonationItem[]
  receipts?: DonationReceipt[] | null
  note?: string | null
  cancelReason?: string | null
  createdBy: string
  createdAt: string
  updatedAt?: string | null
  version: number

  // Legacy optional fields for backward compatibility
  materialId?: string
  monetary?: number
  promisedQty?: number
  receivedQty?: number
}

export type BorrowedItemStatus = 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'ISSUED' | 'IN_USE' | 'RETURNED'
export type ReturnCondition = 'GOOD' | 'DAMAGED' | 'LOST'

export interface BorrowTransaction {
  id: string
  borrowDate: string
  returnDate?: string | null
  condition?: ReturnCondition | null
  quantity?: number | null
  kind: string
  recordedBy?: string | null
  note?: string | null
}

export interface BorrowedItem {
  id: string
  seasonId: string
  workAreaId?: string | null
  taskId?: string | null
  offeredBy: string
  acceptedBy?: string | null
  ownerName: string
  ownerPhone?: string | null
  ownerAddress?: string | null
  ownerNote?: string | null
  itemName: string
  quantity: number
  description?: string | null
  initialCondition?: string | null
  expectedReturnDate: string
  status: BorrowedItemStatus
  overdue: boolean
  rejectionReason?: string | null
  acceptedAt?: string | null
  createdAt: string
  transactions?: BorrowTransaction[]
  version: number

  // Legacy optional fields for backward compatibility
  name?: string
  owner?: string
  expectedReturn?: string
  returnedCondition?: ReturnCondition
  areaId?: string
}

export interface MaterialAllocationItem {
  id: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  allocatedQuantity: number
}

/** Phân bổ vật tư cho khu vực hoặc nhiệm vụ (F-RES-15). */
export interface Allocation {
  id: string
  workAreaId: string
  workAreaName: string
  taskId?: string | null
  taskName?: string | null
  allocatedBy: string
  allocationDate: string
  note?: string | null
  items: MaterialAllocationItem[]

  // Legacy optional fields for backward compatibility
  materialId?: string
  targetTaskId?: string
  targetAreaId?: string
  qty?: number
  date?: string
  byUserId?: string
}

export type MaterialAllocation = Allocation

export type AttendanceStatus = 'OPEN' | 'CLOSED' | 'CORRECTED'

export interface AttendanceDto {
  id: string
  assignmentId: string
  checkInAt: string
  checkOutAt?: string | null
  approvedMinutes: number
  status: AttendanceStatus
  version: number
}

export interface WorkingHourSummary {
  volunteerId: string
  approvedMinutes: number
  approvedHours: number
}

export interface Timesheet {
  id: string
  volunteerId: string
  date: string
  checkIn: string
  checkOut?: string
  hours: number
  approvedMinutes?: number
  correctionRequest?: string
  status: 'OPEN' | 'CLOSED' | 'PENDING_FIX' | 'CORRECTED'
}

/** Mức đáp ứng nhân lực: 0 người → OPEN; < cần → PARTIAL; ≥ cần → FULFILLED. */
export type SupportFulfill = 'OPEN' | 'PARTIAL' | 'FULFILLED';

export type SupportType = 'STAFFING' | 'MATERIAL' | 'MIXED'
export type SupportRequestStatus = 'PLANNING' | 'PUBLISHED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CLOSED' | 'CANCELLED'

export interface SupportSkill {
  skillId: string
  requiredSkillLevel?: string | null
}

export interface SupportPosition {
  id: string
  name: string
  requiredVolunteerCount: number
  note?: string | null
  skills: SupportSkill[]
}

export interface SupportMaterial {
  id: string
  materialId: string
  requiredQuantity: number
  note?: string | null
}

export interface SupportRequest {
  id: string
  seasonId: string
  workAreaId: string
  requestedBy: string
  supportType: SupportType
  description?: string | null
  deadline?: string | null
  status: SupportRequestStatus | 'OPEN' | 'COORDINATED' | 'RESOLVED'
  createdAt: string
  updatedAt?: string | null
  version: number
  positions: SupportPosition[]
  materials: SupportMaterial[]
  responses?: unknown[]

  // Legacy fields for backward compatibility
  areaId?: string
  kind?: 'PEOPLE' | 'SKILL' | 'MATERIAL'
  detail?: string
  assigneeId?: string
  communityId?: string
  volunteersNeeded?: number
  skills?: string[]
  supportTime?: string
  taskAreaId?: string
  fulfill?: SupportFulfill
}

/** Đơn TNV (cộng đoàn khác) đăng ký tham gia yêu cầu hỗ trợ. */
export interface SupportReg {
  id: string; requestId: string; volunteerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string; rejectReason?: string; at?: string;
}

export interface ChecklistItem { id: string; areaId: string; label: string; done: boolean; note?: string }

export interface ActivityLog {
  id: string
  at: string
  actor: string
  action: string
  target: string
  // Có khi BE trả kèm; ActivityPage dùng để mở tab lịch sử tài nguyên.
  entityType?: string | null
  entityId?: string | null
}

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

export interface NotificationDto {
  id: string;
  eventType: string;
  title: string;
  body: string;
  referenceType?: string | null;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface RecognitionRuleDto {
  id: string;
  contributionTypeId: string;
  contributionTypeCode: string;
  name: string;
  ruleVersion: number;
  points: number;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  version: number;
}


// ══════ [fe-api-gap] Đợt A–E ══════

export interface TaskApplicationDto {
  id: string;
  taskId: string;
  volunteerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  note?: string | null;
  version: number;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  reason?: string | null;
}

export interface AssignmentDto {
  id: string;
  taskId: string;
  volunteerId: string;
  assignmentType: 'DIRECT' | 'APPLICATION' | 'SUPPORT' | string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  note?: string | null;
  version: number;
  requestedAt?: string | null;
  assignedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  warnings: string[];
  responseReason?: string | null;
}

export interface TaskMaterialReportItemDto {
  id: string;
  materialAllocationItemId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  allocatedQuantity: number;
  reportedRemainingQuantity: number;
  reportedDamagedQuantity: number;
  reportedLostQuantity: number;
  verifiedRemainingQuantity?: number | null;
  verifiedDamagedQuantity?: number | null;
  verifiedLostQuantity?: number | null;
  usedQuantity?: number | null;
  note?: string | null;
}

export interface TaskMaterialReportDto {
  id: string;
  taskId: string;
  taskName: string;
  workAreaId: string;
  reportedBy: string;
  verifiedBy?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REVISION_REQUESTED' | string;
  note?: string | null;
  revisionReason?: string | null;
  reportedAt: string;
  verifiedAt?: string | null;
  items: TaskMaterialReportItemDto[];
  version: number;
}

export interface ProgressEvidence {
  id: string;
  progressId: string;
  fileId: string;
  caption?: string | null;
  uploadedAt: string;
}

export interface TaskProgressDto {
  id: string;
  taskId: string;
  submittedByUserId: string;
  percentComplete: number;
  note?: string | null;
  submittedAt: string;
  isSubmission: boolean;
  approvedByUserId?: string | null;
  approvedAt?: string | null;
  evidence: ProgressEvidence[];
}

export interface TaskCompletionReview {
  id: string;
  taskId: string;
  progressId: string;
  reviewedByUserId: string;
  approved: boolean;
  reason?: string | null;
  reviewedAt: string;
}

export interface TaskReviewPackage {
  task: any;
  completionCriteria?: string | null;
  progress: TaskProgressDto[];
  reviews: TaskCompletionReview[];
  approvedHours: number;
  materialSummary?: any;
}

export interface VolunteerMatchDto {
  volunteerId: string;
  displayName: string;
  communityId?: string | null;
  sameCommunity: boolean;
  availabilityMatched?: boolean | null;
  hasScheduleConflict: boolean;
  warnings: string[];
}

export interface FileDownload {
  downloadUrl: string;
  expiresAt: string;
}

// --- Readiness Checklists (Đợt B) ---
export type ChecklistStatus =
  | 'Planning'
  | 'InReview'
  | 'NeedsCorrection'
  | 'Ready'
  | 'Reopened'
  | 'PLANNING'
  | 'IN_REVIEW'
  | 'NEEDS_CORRECTION'
  | 'READY'
  | 'REOPENED';

export type ItemStatus =
  | 'Pending'
  | 'Passed'
  | 'Failed'
  | 'CorrectiveAction'
  | 'Recheck'
  | 'PENDING'
  | 'PASSED'
  | 'FAILED'
  | 'CORRECTIVE_ACTION'
  | 'RECHECK';

export type InspectionResult = 'Passed' | 'Failed' | 'PASSED' | 'FAILED';

export interface ReadinessItemDto {
  id: string;
  name: string;
  description?: string | null;
  mandatory: boolean;
  status: ItemStatus;
  correctiveTaskId?: string | null;
  checkedBy?: string | null;
  checkedAt?: string | null;
  note?: string | null;
  evidenceFileIds: string[];
  checkVersion: number;
}

export interface ReadinessCheckDto {
  id: string;
  workAreaId: string;
  workAreaName: string;
  seasonId: string;
  name: string;
  status: ChecklistStatus;
  reopenReason?: string | null;
  completedBy?: string | null;
  completedAt?: string | null;
  items: ReadinessItemDto[];
  version: number;
}

export interface WorkAreaReadinessDto {
  workAreaId: string;
  workAreaName: string;
  workAreaStatus: string;
  readinessCheckId?: string | null;
  checklistStatus?: ChecklistStatus | null;
  totalItems: number;
  mandatoryItems: number;
  passedItems: number;
  failedItems: number;
  pendingItems: number;
  ready: boolean;
}

export interface SeasonReadinessDto {
  seasonId: string;
  workAreas: number;
  readyWorkAreas: number;
  areas: WorkAreaReadinessDto[];
}

export interface ReadinessItemDefinitionRequest {
  name: string;
  description?: string | null;
  mandatory?: boolean;
}

export interface CreateReadinessCheckRequest {
  name: string;
  items: ReadinessItemDefinitionRequest[];
}

export interface ReadinessItemResultRequest {
  version?: number;
  result: InspectionResult;
  note?: string | null;
  evidenceFileIds?: string[];
}

export interface CorrectiveTaskLinkRequest {
  version?: number;
  taskId?: string | null;
  create?: {
    name: string;
    description?: string;
    priority?: string;
    deadline?: string;
  } | null;
}

export interface FileReferenceRequest {
  id: string;
}

export interface RecordFileDownload {
  downloadUrl: string;
  fileName: string;
  expiresAtUtc: string;
}

// ══════ Đợt C: Mùa & Bảng điều khiển DTOs ══════

export interface ContributionNeedDto {
  kind: string;
  workAreaId: string;
  workAreaName: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  required: number;
  shortage: number;
  pledgedOutstanding: number;
  remainingNeed: number;
}

export interface SupportRequestStateTotal {
  status: string;
  count: number;
}

export interface SupportMaterialTotal {
  sourceWorkAreaId: string;
  materialId: string;
  offeredQuantity: number;
  approvedQuantity: number;
  receivedUsableQuantity: number;
  receivedUnusableQuantity: number;
  pendingSyncItems: number;
}

export interface SupportCommunityTotal {
  respondingCommunityId: string | null;
  responses: number;
  offeredMembers: number;
  approvedMembers: number;
  awaitingConfirmationMembers: number;
  acceptedMembers: number;
  completedMembers: number;
  rejectedMembers: number;
  cancelledMembers: number;
  materials: SupportMaterialTotal[];
}

export interface SupportSummaryDto {
  seasonId: string;
  totalRequests: number;
  requests: SupportRequestStateTotal[];
  communities: SupportCommunityTotal[];
  calculatedAt: string;
}

export interface TaskSummaryDto {
  total: number;
  byStatus: Record<string, number>;
  unassigned: number;
  overdue: number;
  revisionRequired: number;
  completed: number;
  progressPercent: number;
}

export interface MaterialSummaryDto {
  lines: number;
  linesWithShortage: number;
  pledgedLines: number;
}

export interface PurchaseSummaryDto {
  pendingApproval: number;
  inProgress: number;
  completed: number;
  rejected: number;
  estimatedApproved: number;
  actualCost: number;
}

export interface DonationSummaryDto {
  openPledges: number;
  openPledgedMoney: number;
  receivedMoney: number;
  receivedUsableQuantity: number;
  receivedUnusableQuantity: number;
}

export interface VolunteerSummaryDto {
  assigned: number;
  withApprovedHours: number;
  approvedHours: number;
  participationPercent: number;
}

export interface ReadinessSummaryDto {
  ready: number;
  needsCorrection: number;
  reopened: number;
  withoutResult: number;
  failedMandatoryItems: number;
}

export interface AreaSummaryDto {
  workAreas: number;
  workAreasByStatus: Record<string, number>;
  tasks: TaskSummaryDto;
  materials: MaterialSummaryDto;
  purchases: PurchaseSummaryDto;
  donations: DonationSummaryDto;
  volunteers: VolunteerSummaryDto;
  readiness: ReadinessSummaryDto;
  notAvailable: string[];
}

export interface CommunityProgressDto {
  communityId: string | null;
  workAreas: number;
  tasks: number;
  completed: number;
  progressPercent: number;
}

export interface WorkAreaProgressDto {
  workAreaId: string;
  name: string;
  status: string;
  tasks: number;
  completed: number;
  progressPercent: number;
  readiness: string | null;
}

export interface SeasonDashboardDto {
  seasonId: string;
  parishId: string;
  generatedAt: string;
  summary: AreaSummaryDto;
  communities: CommunityProgressDto[];
  workAreas: WorkAreaProgressDto[];
}

export interface WorkAreaDashboardDto {
  workAreaId: string;
  name: string;
  status: string;
  seasonId: string;
  generatedAt: string;
  summary: AreaSummaryDto;
}

export interface MaterialLineDto {
  workAreaId: string;
  workAreaName: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  unit: string | null;
  required: number;
  confirmedAvailable: number;
  shortage: number;
  pledged: number;
  donatedUsable: number;
  purchasedUsable: number;
}

export interface MaterialDashboardDto {
  seasonId: string;
  generatedAt: string;
  workAreaIds: string[];
  lines: MaterialLineDto[];
  purchases: PurchaseSummaryDto;
  donations: DonationSummaryDto;
}

// ══════ [/fe-api-gap] ══════

// ══════ [fe-api-gap-2] Tiến độ khu vực (Đợt I) ══════
// Khớp nguyên văn ParishCoordination GetWorkAreaProgressResult.WorkAreaProgressDto
// (WorkAreaId, SeasonId, WorkAreaStatus, TotalTasks, CancelledTasks, EligibleTasks,
//  CompletedTasks, OverdueTasks, CalculatedAt). KHÔNG dùng chung tên với
// WorkAreaProgressDto của Reporting (/dashboards/season) — hai DTO khác hình dạng.
export interface WorkAreaProgressSummaryDto {
  workAreaId: string
  seasonId: string
  workAreaStatus: string
  totalTasks: number
  cancelledTasks: number
  eligibleTasks: number
  completedTasks: number
  overdueTasks: number
  calculatedAt: string
}

// ══════ [fe-api-gap-2] Đợt F–I ══════
export type AttendanceRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export interface AttendanceRequestDto {
  id: string
  assignmentId: string
  type: string
  requestedAt: string
  status: AttendanceRequestStatus | string
  note?: string | null
  attendanceId?: string | null
  reviewedBy?: string | null
  reviewNote?: string | null
  reviewedAt?: string | null
  version: number
}

export type AttendanceCorrectionStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'

export interface AttendanceCorrectionDto {
  id: string
  attendanceId: string
  requestedBy: string
  reviewedBy?: string | null
  originalCheckInAt: string
  originalCheckOutAt?: string | null
  requestedCheckInAt: string
  requestedCheckOutAt: string
  reason: string
  status: AttendanceCorrectionStatus | string
  reviewNote?: string | null
  createdAt: string
  reviewedAt?: string | null
  version: number
}

export interface ReviewAttendanceRequest {
  version?: number
  reviewNote?: string
}

export interface ReviewCorrectionRequest {
  version?: number
  reviewNote?: string
}

// File contracts (Đợt H)
export type FilePurpose = 'ProgressEvidence' | 'ReadinessEvidence' | 'PurchaseReceipt' | 'Other' | string

export interface CreateUploadRequestDto {
  fileName: string
  contentType: string
  sizeBytes: number
  purpose: FilePurpose
  checksum?: string | null
}

export interface UploadRequestDto {
  fileId: string
  uploadUrl: string
  method: string
  headers?: Record<string, string>
  expiresAt: string
}

export interface CompleteUploadRequestDto {
  checksum?: string | null
}

export interface FileReferenceDto {
  id: string
  fileName: string
  contentType: string
  sizeBytes: number
}

export interface FileDownloadDto {
  downloadUrl: string
  expiresAt: string
}

// Report and System Exports (Đợt H)
export type ReportExportFormat = 'Xlsx' | 'Pdf' | 'Csv' | 'XLSX' | 'PDF' | 'CSV'

export type ReportExportType =
  | 'Tasks'
  | 'Materials'
  | 'Purchases'
  | 'Contributions'
  | 'Attendance'
  | 'Readiness'
  | 'Recognition'
  | string

export interface CreateReportExportRequest {
  reportType: ReportExportType
  format?: ReportExportFormat
  seasonId: string
  workAreaId?: string | null
  communityId?: string | null
  from?: string | null
  to?: string | null
}

export type ExportJobStatus = 'Queued' | 'Running' | 'Succeeded' | 'Failed' | 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface ReportExportJobDto {
  id: string
  reportType: string
  format: string
  status: ExportJobStatus | string
  filters?: {
    seasonId?: string
    workAreaId?: string | null
    communityId?: string | null
    from?: string | null
    to?: string | null
  }
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
  downloadUrl?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
}

export interface SystemExportRequest {
  services?: string[] | null
}

export interface SystemJobDto {
  jobId: string
  status: string
  services: string[]
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  attempts: number
  fileId?: string | null
  expiresAt?: string | null
  errorCode?: string | null
  manifest?: unknown
}

// ══════ Đợt I — Phần lẻ ══════
export interface NotificationPreferenceDto {
  inAppEnabled: boolean
  pushEnabled: boolean
  emailEnabled: boolean
}

export interface UpdateNotificationPreferenceRequest {
  inAppEnabled?: boolean
  pushEnabled?: boolean
  emailEnabled?: boolean
}

export interface UpdateNotificationRuleRequest {
  inAppEnabled?: boolean
}

export interface ActivityLogDetailDto {
  id: string
  action: string
  entityType?: string
  entityId?: string
  actorUserId: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface StateChangeDto {
  fieldName: string
  oldValue?: string | null
  newValue?: string | null
  changedAt: string
  changedBy?: string | null
}

export interface UpdateDonorRequest {
  name?: string
  phone?: string | null
  email?: string | null
  note?: string | null
}

export interface RecordDonationReceiptRequest {
  receivedAt?: string
  note?: string | null
  monetaryAmount?: number | null
  items?: Array<{ materialId: string; quantity: number }>
}

export interface BorrowedItemIncidentRequest {
  condition: 'DAMAGED' | 'LOST' | string
  quantity?: number
  date?: string
  description: string
}

export interface UpdateContributionTypeRequest {
  name?: string
  description?: string
  status?: string
}

export interface DeactivateRecognitionRuleRequest {
  reason: string
}


export interface InventoryAdjustmentRequest {
  materialId: string
  workAreaId?: string
  reason: 'DAMAGED' | 'LOST' | 'DISPOSED' | string
  quantity: number
  notes?: string
}
// ══════ [/fe-api-gap-2] ══════
