// Chọn vị trí ghim khu vực ngay trong form tạo/sửa khu vực.
//
// Dùng chung ảnh sơ đồ của trang Bản đồ giáo xứ (`features/map`), nhưng KHÔNG
// cần zoom/pan: form chỉ cần một khung nhỏ để bấm 1 điểm. Toạ độ vẫn chuẩn hoá
// 0..1 theo khung ảnh (`designs/coords`) nên khớp với marker ở trang Bản đồ.
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toNormalizedPoint, toPercent } from '@/features/designs/coords'
import type { NormalizedPoint } from '@/features/designs/coords'

export function MapPinPicker({
  src,
  pin,
  onPick,
  className,
}: {
  src: string
  pin: NormalizedPoint | null
  onPick: (point: NormalizedPoint) => void
  className?: string
}) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLImageElement>(null)

  return (
    <div
      className={cn(
        'relative select-none overflow-hidden rounded-md border border-border bg-muted/30',
        className,
      )}
    >
      <img
        ref={imgRef}
        src={src}
        alt={t('features.map.title')}
        draggable={false}
        className="block max-h-[280px] w-full cursor-crosshair object-contain"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          onPick(toNormalizedPoint(rect, e.clientX, e.clientY))
        }}
      />
      {pin && (
        <span
          style={toPercent(pin)}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full drop-shadow"
          aria-hidden
        >
          <MapPin className="size-6 fill-primary text-primary-foreground" />
        </span>
      )}
    </div>
  )
}
