import type { ReactNode } from 'react'
import { Inbox, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Trạng thái rỗng: nêu **lý do** (`text`) và **bước tiếp theo** (`hint`), kèm hành
 * động hoặc nút thử lại. Không dùng câu chung chung "Chưa có gì ở đây" khi biết lý do.
 */
export function EmptyState({
  title,
  text,
  hint,
  action,
  onRetry,
  retryLabel,
  icon,
  className,
}: {
  title?: string
  text: string
  hint?: string
  action?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  /** Icon thay cho hộp thư mặc định (tuỳ ngữ cảnh: đã đọc hết, chưa có dữ liệu…). */
  icon?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={cn('grid place-items-center gap-2 px-4 py-12 text-center', className)}>
      {icon ? (
        <span className="text-muted-foreground [&_svg]:size-8" aria-hidden>
          {icon}
        </span>
      ) : (
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
      )}
      {title ? <p className="text-sm font-semibold text-foreground">{title}</p> : null}
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {hint ? <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {action}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="size-3.5" aria-hidden />
          {retryLabel ?? t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
