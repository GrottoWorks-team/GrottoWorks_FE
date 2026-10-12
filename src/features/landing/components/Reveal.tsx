import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Reveal — bọc nội dung, trượt + mờ dần khi cuộn tới (scroll-reveal).
 * Trang trọng cho landing nhưng vẫn tôn trọng prefers-reduced-motion:
 *  - CSS (.landing-reveal) tự bỏ ẩn dưới reduced-motion.
 *  - Khi môi trường không có IntersectionObserver (jsdom, trình duyệt cũ)
 *    thì hiện ngay, không giấu nội dung.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  /** Độ trễ so le (ms). */
  delay?: number
  as?: ElementType
}) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            io.disconnect()
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      className={cn('landing-reveal', shown && 'is-in', className)}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
