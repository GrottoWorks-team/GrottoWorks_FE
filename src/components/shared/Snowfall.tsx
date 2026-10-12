// Snowfall — tuyết rơi liên tục cho nền trang Login (DESIGN_SYSTEM.md mục 36).
// Thuần CSS transform (.g-snow ở index.css); tự tắt khi người dùng bật
// "giảm chuyển động" (prefers-reduced-motion). Trang trí nên aria-hidden.
import { useMemo } from 'react'
import type { CSSProperties } from 'react'

interface Flake {
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
  drift: number
  blur: boolean
}

// LCG nhỏ với seed cố định → bố cục tuyết ổn định giữa các lần render và trong test
// (không dùng Math.random để tránh lệch giữa các lần chạy).
function makeFlakes(count: number): Flake[] {
  let seed = 20261224
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  return Array.from({ length: count }, (_, i) => {
    // depth: 0 = xa (nhỏ, mờ, chậm) … 1 = gần (to, rõ, nhanh) tạo chiều sâu.
    const depth = rand()
    return {
      left: rand() * 100,
      size: 2 + depth * 5,
      duration: 7 + (1 - depth) * 11,
      delay: -rand() * 18,
      opacity: 0.35 + depth * 0.55,
      drift: (rand() - 0.5) * 60 + (i % 2 ? 18 : -18),
      blur: depth < 0.35,
    }
  })
}

export function Snowfall({ count = 90 }: { count?: number }) {
  const flakes = useMemo(() => makeFlakes(count), [count])
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {flakes.map((f, i) => (
        <span
          key={i}
          className="g-snow absolute top-0 block rounded-full bg-white"
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              opacity: f.opacity,
              filter: f.blur ? 'blur(1px)' : undefined,
              '--g-drift': `${f.drift}px`,
              '--g-dur': `${f.duration}s`,
              '--g-delay': `${f.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
