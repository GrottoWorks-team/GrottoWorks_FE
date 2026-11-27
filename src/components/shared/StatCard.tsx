import { useEffect, useState } from 'react'
import i18n from '@/lib/i18n'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Count-up rAF ~700ms, cubic ease-out; reduced-motion → đặt giá trị luôn.
function useCountUp(target: number, duration = 700): number {
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [val, setVal] = useState(() => (reduced ? target : 0))
  useEffect(() => {
    if (reduced) {
      setVal(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])
  return val
}

const CHIP = {
  ok: 'bg-[#EDF4EA] text-[#0A5C36]',
  warn: 'bg-[#FDF6E3] text-[#C98A12]',
  alert: 'bg-[#FDE8E8] text-[#991B1B]',
} as const

export function StatCard({
  label,
  value,
  unit,
  delta,
  hint,
  tone = 'ok',
  icon: Icon,
  className,
}: {
  label: string
  /** Số → đếm động; chuỗi (vd "—") → hiển thị nguyên văn cho chỉ số chưa có API. */
  value: number | string
  unit?: string
  /** Dòng phụ dưới số (bản thiết kế: "Mùa đang diễn ra, 2026"). */
  hint?: string
  delta?: { dir: 'up' | 'down'; text: string }
  tone?: 'ok' | 'warn' | 'alert'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const numeric = typeof value === 'number'
  const v = useCountUp(numeric ? value : 0)
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  return (
    <Card
      className={cn(
        'col-span-1 flex flex-col items-start gap-[11px] rounded-[16px] border-[#E3EAE0] bg-white p-[16px] shadow-[0px_1px_2px_#06281B0A]',
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        {Icon ? (
          <span className={cn('grid size-7 shrink-0 place-items-center rounded-[9px]', CHIP[tone])}>
            <Icon className="size-3.5" />
          </span>
        ) : (
          <span className={cn('size-7 shrink-0 rounded-[9px]', CHIP[tone])} aria-hidden />
        )}
        <p className="min-w-0 truncate font-mono text-[10px] font-semibold uppercase tracking-[1.2px] text-[#97AB9E]">
          {label}
        </p>
      </div>
      <div className="flex w-full items-end gap-2">
        <p className="tabular text-[30px] font-extrabold leading-[30px] tracking-[-1px] text-[#0B2E1F]">
          {numeric ? v.toLocaleString(locale) : value}
        </p>
        {unit && (
          <span className="pb-[3px] text-[10.5px] font-normal text-[#8AA298]">{unit}</span>
        )}
      </div>
      {(hint || delta) && (
        <p
          className={cn(
            'text-[11px]',
            delta ? (delta.dir === 'up' ? 'text-brand-pine' : 'text-destructive') : 'text-[#8AA298]',
          )}
        >
          {delta ? `${delta.dir === 'up' ? '▲' : '▼'} ${delta.text}` : hint}
        </p>
      )}
    </Card>
  )
}
