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

const BAR = { ok: 'bg-brand-pine', warn: 'bg-brand-gold', alert: 'bg-destructive' } as const

export function StatCard({
  label,
  value,
  unit,
  delta,
  tone = 'ok',
  icon: Icon,
  className,
}: {
  label: string
  value: number
  unit?: string
  delta?: { dir: 'up' | 'down'; text: string }
  tone?: 'ok' | 'warn' | 'alert'
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const v = useCountUp(value)
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'
  return (
    <Card className={cn('relative overflow-hidden p-5 transition-shadow duration-200 hover:shadow-hover', className)}>
      <div className={cn('absolute inset-x-0 top-0 h-1.5', BAR[tone])} aria-hidden />
      <div className="flex items-start justify-between">
        <p className="lbl-mono">{label}</p>
        {Icon && <Icon className="size-5 text-muted-foreground/50 transition-colors group-hover:text-foreground" />}
      </div>
      <p className="tabular mt-2 text-3xl font-extrabold text-foreground">
        {v.toLocaleString(locale)}
        {unit && <span className="ml-1.5 text-sm font-semibold text-muted-foreground">{unit}</span>}
      </p>
      {delta && (
        <p
          className={cn(
            'mt-1 text-xs font-semibold',
            delta.dir === 'up' ? 'text-brand-pine' : 'text-destructive',
          )}
        >
          {delta.dir === 'up' ? '▲' : '▼'} {delta.text}
        </p>
      )}
    </Card>
  )
}
