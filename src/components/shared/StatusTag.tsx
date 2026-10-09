import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// Map status → tone; nhóm ngoài brief mặc định ◇ soft (label vẫn dịch đúng).
const TONE: Record<string, 'ok' | 'warn' | 'alert' | 'soft'> = {
  DONE: 'ok', ENOUGH: 'ok', APPROVED: 'ok', RESOLVED: 'ok', CLOSED: 'ok',
  ON_TRACK: 'ok', RECEIVED_FULL: 'ok',
  DOING: 'warn', INCOMING: 'warn', PENDING: 'warn', REVIEW: 'warn',
  COORDINATED: 'warn', PENDING_FIX: 'warn', RECEIVED_PARTIAL: 'warn', ACTIVE: 'warn',
  PLEDGED: 'warn',
  LATE: 'alert', REVISE: 'alert', REJECTED: 'alert', SHORTAGE: 'alert',
  AT_RISK: 'alert', UNUSABLE: 'alert', DAMAGED: 'alert', LOST: 'alert',
  OPEN: 'warn', // yêu cầu hỗ trợ đang chờ điều phối
  NOT_RETURNED: 'soft', // đồ mượn chưa trả
}

// DESIGN_SYSTEM.md mục 12 — Status Badge: pastel background + dark text.
const STYLE = {
  ok: 'bg-status-successBg text-status-successText',
  warn: 'bg-status-pendingBg text-status-pendingText',
  alert: 'bg-status-dangerBg text-status-dangerText',
  soft: 'bg-status-neutralBg text-status-neutralText',
} as const

const GLYPH = { ok: '✓', warn: '◐', alert: '✕', soft: '◇' } as const

export function StatusTag({
  status,
  glyph,
  tone,
  className,
}: {
  status: string
  /** Override glyph/tone theo ngữ cảnh (vd TimesheetPage) — mặc định lấy map theo status. */
  glyph?: string
  tone?: keyof typeof STYLE
  className?: string
}) {
  const { t } = useTranslation()
  const activeTone = tone ?? TONE[status] ?? 'soft'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide',
        STYLE[activeTone],
        className,
      )}
    >
      <span aria-hidden>{glyph ?? GLYPH[activeTone]}</span>
      {t(`status.${status}`, { defaultValue: status })}
    </span>
  )
}

