import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({
  text,
  action,
  icon,
  className,
}: {
  text: string
  action?: ReactNode
  /** Icon thay cho hộp thư mặc định (tuỳ ngữ cảnh: đã đọc hết, chưa có dữ liệu…). */
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid place-items-center gap-3 px-4 py-12 text-center',
        className,
      )}
    >
      {icon ? (
        <span className="text-muted-foreground [&_svg]:size-8" aria-hidden>
          {icon}
        </span>
      ) : (
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
      )}
      <p className="text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}
