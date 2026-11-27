import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Đầu trang chuẩn: một `h1` đúng vai + **một câu finding có số** (trả lời câu hỏi
 * của màn) + vùng hành động chính. Không eyebrow, không badge trang trí.
 */
export function PageHeader({
  title,
  finding,
  sub,
  actions,
  children,
  className,
}: {
  title: string
  /** Câu finding của màn, phải có số liệu thật (vd "3/12 khu còn thiếu trưởng khu"). */
  finding?: ReactNode
  /** Dòng phụ (phạm vi, mùa) — không thay cho `finding`. */
  sub?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[25px] font-extrabold leading-[29px] tracking-[-0.7px] text-foreground">{title}</h1>
        {finding ? (
          <p className="mt-1 max-w-[72ch] text-sm font-medium text-foreground">{finding}</p>
        ) : null}
        {sub ? (
          <p className="mt-1 max-w-[72ch] text-[11.5px] leading-relaxed text-[#7C9287]">{sub}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
