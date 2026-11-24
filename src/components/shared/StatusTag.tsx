import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { STATUS_TONE, TONE_STYLE, type StatusTone } from './statusMeta'

/**
 * Nhãn trạng thái: chỉ dùng tone từ `statusMeta` (không tự đặt mã màu), **không**
 * đặt icon trong ô màu — icon miền (`DOMAIN_ICON`) đứng ngoài, truyền qua `icon`.
 */
export function StatusTag({
  status,
  scope,
  glyph,
  tone,
  icon,
  className,
}: {
  status: string
  /** Ngữ cảnh hẹp hơn — hiện chỉ 'task' cần tách nhãn khỏi khu vực. */
  scope?: 'task'
  /** Override glyph khi ngữ cảnh cần (vd mức ưu tiên của góp ý thiết kế). */
  glyph?: string
  tone?: StatusTone
  /** Icon miền đứng ngoài ô màu trạng thái. */
  icon?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const activeTone = tone ?? STATUS_TONE[status] ?? 'soft'
  const key = scope === 'task' ? `status.TASK_${status}` : `status.${status}`
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {icon ? (
        <span className="text-muted-foreground [&_svg]:size-3.5" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide',
          TONE_STYLE[activeTone],
        )}
      >
        {glyph ? <span aria-hidden>{glyph}</span> : null}
        {t(key, { defaultValue: t(`status.${status}`, { defaultValue: status }) })}
      </span>
    </span>
  )
}
