import { cn } from '@/lib/utils'

/**
 * Khung xương khi đang tải. Không phải animation trang trí: chỉ hiện khi chờ dữ
 * liệu và tự tắt dưới `prefers-reduced-motion` (rule toàn cục trong index.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-muted', className)} />
}
