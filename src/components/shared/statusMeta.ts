// Ngữ nghĩa trạng thái & biểu tượng theo miền — một nguồn duy nhất.
//   STATUS_TONE: status → tone màu (không tự đặt màu trong feature)
//   DOMAIN_ICON: miền nghiệp vụ → icon (icon đứng NGOÀI ô màu trạng thái)
import {
  Bell,
  Boxes,
  Calendar,
  ClipboardList,
  Clock,
  FileImage,
  Gift,
  LifeBuoy,
  ListChecks,
  MapPin,
  ShoppingCart,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type StatusTone = 'ok' | 'warn' | 'alert' | 'soft'

export const STATUS_TONE: Record<string, StatusTone> = {
  DONE: 'ok', ENOUGH: 'ok', APPROVED: 'ok', RESOLVED: 'ok', CLOSED: 'ok',
  ACCEPTED: 'ok',
  ON_TRACK: 'ok', RECEIVED_FULL: 'ok', RECEIVED: 'ok',
  IN_TRANSIT: 'warn',
  DOING: 'warn', INCOMING: 'warn', PENDING: 'warn', REVIEW: 'warn',
  COORDINATED: 'warn', PENDING_FIX: 'warn', RECEIVED_PARTIAL: 'warn', ACTIVE: 'warn',
  PLEDGED: 'warn',
  LATE: 'alert', REVISE: 'alert', REJECTED: 'alert', SHORTAGE: 'alert',
  AT_RISK: 'alert', UNUSABLE: 'alert', DAMAGED: 'alert', LOST: 'alert',
  OPEN: 'warn',
  NOT_RETURNED: 'soft',
  IN_REVIEW: 'warn',
  IN_PROGRESS: 'warn',
  CHANGES_REQUESTED: 'alert',
  PLANNING: 'soft', PLANNED: 'soft', COMPLETED: 'ok', ARCHIVED: 'soft',
  READINESS_REVIEW: 'warn', NEEDS_CORRECTION: 'alert', INACTIVE: 'soft',
  DRAFT: 'soft',
  NOT_STARTED: 'soft', READY: 'soft', SUBMITTED: 'warn', REVISION_REQUIRED: 'alert',
  PENDING_APPROVAL: 'warn',
  BUYER_ASSIGNED: 'warn',
  PURCHASED: 'warn',
  PARTIALLY_RECEIVED: 'warn',
  CANCELLED: 'alert',
  OFFERED: 'warn',
  ISSUED: 'warn',
  IN_USE: 'warn',
  RETURNED: 'ok',
}

// Status Badge: pastel background + dark text (DESIGN_SYSTEM.md mục 12).
export const TONE_STYLE: Record<StatusTone, string> = {
  ok: 'bg-status-successBg text-status-successText',
  warn: 'bg-status-pendingBg text-status-pendingText',
  alert: 'bg-status-dangerBg text-status-dangerText',
  soft: 'bg-status-neutralBg text-status-neutralText',
}

export type Domain =
  | 'task'
  | 'purchase'
  | 'material'
  | 'donation'
  | 'readiness'
  | 'attendance'
  | 'support'
  | 'season'
  | 'area'
  | 'account'
  | 'design'
  | 'notification'

export const DOMAIN_ICON: Record<Domain, LucideIcon> = {
  task: ClipboardList,
  purchase: ShoppingCart,
  material: Boxes,
  donation: Gift,
  readiness: ListChecks,
  attendance: Clock,
  support: LifeBuoy,
  season: Calendar,
  area: MapPin,
  account: UserCog,
  design: FileImage,
  notification: Bell,
}

const EVENT_DOMAIN: ReadonlyArray<readonly [string, Domain]> = [
  ['task.', 'task'],
  ['purchase.', 'purchase'],
  ['resource.', 'material'],
  ['attendance.', 'attendance'],
  ['planning.season.', 'season'],
  ['planning.work-area.', 'area'],
  ['readiness.', 'readiness'],
  ['support.', 'support'],
  ['contribution.', 'donation'],
  ['recognition.', 'donation'],
  ['design.', 'design'],
]

/** `eventType` của NotificationAudit (`task.assigned`, `readiness.failed`…) → miền. */
export function domainOfEventType(eventType: string): Domain {
  const hit = EVENT_DOMAIN.find(([prefix]) => eventType.startsWith(prefix))
  return hit ? hit[1] : 'notification'
}

/** Tone cho một status BE; mặc định `soft` để không lộ màu tuỳ tiện. */
export function toneOf(status: string | null | undefined): StatusTone {
  if (!status) return 'soft'
  return STATUS_TONE[status.toUpperCase()] ?? 'soft'
}
