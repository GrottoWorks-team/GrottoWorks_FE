import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

const TONES = {
  info: { cls: 'border-border bg-muted/40 text-foreground', Icon: Info },
  ok: { cls: 'border-status-successText/25 bg-status-successBg text-status-successText', Icon: CircleCheck },
  warn: { cls: 'border-status-pendingText/25 bg-status-pendingBg text-status-pendingText', Icon: TriangleAlert },
  alert: { cls: 'border-status-dangerText/25 bg-status-dangerBg text-status-dangerText', Icon: CircleAlert },
} as const

export type InlineAlertTone = keyof typeof TONES

/**
 * Thông báo trong một khối (không phải toast): dùng khi lỗi/thiếu điều kiện phải
 * còn nhìn thấy sau khi toast tắt — vd. "chưa kiểm tra được", danh sách khu thiếu.
 */
export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: InlineAlertTone
  title?: ReactNode
  children?: ReactNode
  className?: string
  role?: 'alert' | 'status'
}) {
  const { cls, Icon } = TONES[tone]
  return (
    <div
      role={role ?? (tone === 'alert' ? 'alert' : 'status')}
      className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm', cls, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-[13px] leading-relaxed">{children}</div> : null}
      </div>
    </div>
  )
}
