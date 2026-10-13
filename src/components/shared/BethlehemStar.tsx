// BethlehemStar — Ngôi sao Bê-lem Giáng sinh thuần SVG animation (không dùng emoji).
// Tỏa ánh sáng vàng Champagne (#EEB902) dịu dàng, tự tắt chuyển động khi bật prefers-reduced-motion.

interface BethlehemStarProps {
  className?: string
  size?: number
}

export function BethlehemStar({ className = '', size = 28 }: BethlehemStarProps) {
  return (
    <div
      aria-hidden="true"
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Vầng hào quang nền */}
      <div className="star-pulse absolute inset-0 rounded-full bg-brand-gold/25 blur-md" />
      
      {/* Ngôi sao Bê-lem vector SVG */}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="star-pulse relative z-10 w-full h-full text-brand-gold drop-shadow-[0_0_10px_rgba(238,185,2,0.8)]"
      >
        {/* Tia sáng phụ chéo */}
        <path
          d="M24 10L27 21L38 24L27 27L24 38L21 27L10 24L21 21L24 10Z"
          fill="#FEF9C3"
          opacity="0.9"
        />
        {/* Tia sáng chính dài dọc/ngang */}
        <path
          d="M24 2L26.5 19L44 24L26.5 29L24 46L21.5 29L4 24L21.5 19L24 2Z"
          fill="url(#star-gold-gradient)"
        />
        {/* Lõi tâm ngọc sáng */}
        <circle cx="24" cy="24" r="3" fill="#FFFFFF" />
        
        <defs>
          <linearGradient id="star-gold-gradient" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF9C4" />
            <stop offset="0.45" stopColor="#EEB902" />
            <stop offset="1" stopColor="#B48200" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
