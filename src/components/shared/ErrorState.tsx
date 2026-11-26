import { CircleAlert, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Trạng thái lỗi của một khối: nói rõ lỗi gì, có nút thử lại. Dùng cho DataTable,
 * dashboard và các khối tải riêng — một khối lỗi không được làm trắng cả trang.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  className,
  compact,
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      className={cn(
        'grid place-items-center gap-2 text-center',
        compact ? 'px-4 py-6' : 'px-4 py-12',
        className,
      )}
    >
      <CircleAlert className="size-7 text-destructive" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{title ?? t('common.loadError')}</p>
      {message ? <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RefreshCw className="size-3.5" aria-hidden />
          {retryLabel ?? t('common.retry')}
        </Button>
      ) : null}
    </div>
  )
}
