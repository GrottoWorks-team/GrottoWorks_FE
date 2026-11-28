import { useEffect, useState } from 'react'

/**
 * CountUp — đếm số tăng dần (rAF, ease-out) cho các con số thống kê của
 * landing. Dưới prefers-reduced-motion đặt giá trị ngay (không nhấp nháy).
 */
export function CountUp({
  to,
  duration = 1200,
  suffix = '',
  pad = false,
  className,
}: {
  to: number
  duration?: number
  suffix?: string
  /** Đệm 0 đằng trước cho số < 10 (bản thiết kế Pen: "05", "04", "07"). */
  pad?: boolean
  className?: string
}) {
  const reduced =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [value, setValue] = useState(() => (reduced ? to : 0))

  useEffect(() => {
    if (reduced) {
      setValue(to)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, duration, reduced])

  return (
    <span className={className}>
      {pad && value < 10 ? `0${value}` : value}
      {suffix}
    </span>
  )
}
