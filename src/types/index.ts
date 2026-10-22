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

export interface Task {
  id: string; areaId: string; title: string; description: string; skills: string[];
  estimateHours: number; volunteersNeeded: number; assignees: string[]; materialIds: string[];
  status: 'TODO' | 'DOING' | 'REVIEW' | 'DONE' | 'REVISE'; dueDate: string;
  submittedPhotos: number; submittedNotes?: string;
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

export interface Donation {
  id: string; materialId?: string; monetary?: number; donorName: string;
  status: 'PLEDGED' | 'RECEIVED_FULL' | 'RECEIVED_PARTIAL' | 'UNUSABLE' | 'CANCELED';
  promisedQty?: number; receivedQty?: number; note?: string;
}

export interface BorrowedItem {
  id: string; name: string; owner: string; expectedReturn: string;
  returnedCondition?: 'GOOD' | 'DAMAGED' | 'LOST'; areaId: string;
}

/** Phân bổ vật tư đã nhận cho nhiệm vụ/khu (đích: task hoặc khu khác). */
export interface Allocation {
  id: string; materialId: string; targetTaskId?: string; targetAreaId?: string;
  qty: number; date: string; byUserId: string;
}

export interface Timesheet {
  id: string; volunteerId: string; date: string; checkIn: string; checkOut?: string;
  hours: number; correctionRequest?: string; status: 'OPEN' | 'CLOSED' | 'PENDING_FIX';
}

/** Mức đáp ứng nhân lực: 0 người → OPEN; < cần → PARTIAL; ≥ cần → FULFILLED. */
export type SupportFulfill = 'OPEN' | 'PARTIAL' | 'FULFILLED';

export interface SupportRequest {
  id: string; areaId: string; kind: 'PEOPLE' | 'SKILL' | 'MATERIAL';
  detail: string; status: 'OPEN' | 'COORDINATED' | 'RESOLVED'; assigneeId?: string;
  /** Cộng đoàn của khu cần hỗ trợ — TNV cộng đoàn KHÁC thấy để đăng ký. */
  communityId?: string;
  /** Số TNV cần huy động (0 với kind MATERIAL). */
  volunteersNeeded?: number;
  /** Kỹ năng cần có (kind SKILL) — lọc TNV phù hợp. */
  skills?: string[];
  /** Thời gian hỗ trợ dự kiến (label tự do). */
  supportTime?: string;
  /** Khu nhiệm vụ đích để gán TNV được duyệt (thường trùng areaId). */
  taskAreaId?: string;
  /** Mức đáp ứng theo số người đã xác nhận. */
  fulfill?: SupportFulfill;
}

/** Đơn TNV (cộng đoàn khác) đăng ký tham gia yêu cầu hỗ trợ. */
export interface SupportReg {
  id: string; requestId: string; volunteerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note?: string; rejectReason?: string; at?: string;
}

export interface ChecklistItem { id: string; areaId: string; label: string; done: boolean; note?: string }

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
