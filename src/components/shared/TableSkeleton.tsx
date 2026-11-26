import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Khung xương cho bảng đang tải — cùng số cột với bảng thật để không nhảy layout. */
export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-3">
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton
              key={col}
              className={cn('h-4 flex-1', col === 0 && 'max-w-[38%]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
