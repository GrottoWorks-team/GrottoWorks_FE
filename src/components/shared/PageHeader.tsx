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
    <div className={cn('mb-[16px] flex flex-row items-center justify-between gap-[20px]', className)}>
      <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
        <h1 className="text-[25px] font-extrabold leading-[29px] tracking-[-0.7px] text-[#0B2E1F]">{title}</h1>
        {finding ? (
          <p className="max-w-[72ch] text-sm font-medium text-foreground">{finding}</p>
        ) : null}
        {sub ? (
          <p className="w-full max-w-[72ch] text-[11.5px] leading-[17px] text-[#7C9287]">{sub}</p>
        ) : null}
        {children}
      </div>
      {actions ? <div className="flex shrink-0 flex-row items-center gap-[8px]">{actions}</div> : null}
    </div>
  )
}
