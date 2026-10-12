// Khung xem ảnh 2D cho Design Review: fit / zoom / pan + marker theo toạ độ
// chuẩn hoá 0..1. Không dùng thư viện ngoài — zoom/pan bằng CSS transform +
// Pointer Events, marker là lớp HTML absolute đè lên ảnh.
//
// Vì sao marker luôn bám đúng ảnh: ảnh và lớp marker nằm trong cùng một hộp
// (hộp có kích thước = kích thước ảnh), toàn bộ hộp được transform; marker đặt
// bằng % nên vẫn đúng khi zoom/pan/resize. Khi click, lấy
// img.getBoundingClientRect() (đã tính transform) rồi chia tỉ lệ → toạ độ
// chuẩn hoá, không phụ thuộc pixel màn hình.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toNormalizedPoint, toPercent } from '../coords'
import type { NormalizedPoint } from '../coords'

export interface CanvasMarker {
  id: string
  /** 0..1 theo ảnh gốc. */
  x: number
  y: number
  /** Số hiển thị trên marker (thứ tự trong danh sách). */
  label: number
  active?: boolean
}

const MIN_SCALE = 0.05
const MAX_SCALE = 12
/** Ngưỡng px để phân biệt "click thêm marker" với "kéo pan". */
const DRAG_THRESHOLD = 4

const clampScale = (n: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, n))

const insideRect = (r: DOMRect, x: number, y: number) =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

export function ImageReviewCanvas({
  src,
  markers,
  addMode = false,
  onSelectMarker,
  onAddMarker,
  onLoadError,
  className,
}: {
  src: string
  markers: CanvasMarker[]
  /** Bật chế độ chờ click để thêm marker mới. */
  addMode?: boolean
  onSelectMarker?: (id: string) => void
  onAddMarker?: (point: NormalizedPoint) => void
  onLoadError?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const viewportRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const naturalRef = useRef({ w: 0, h: 0 })
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(
    null,
  )

  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [panning, setPanning] = useState(false)

  const fitToViewport = useCallback(() => {
    const vp = viewportRef.current
    const { w, h } = naturalRef.current
    if (!vp || !w || !h) return
    const rect = vp.getBoundingClientRect()
    const scale = clampScale(Math.min(rect.width / w, rect.height / h))
    setView({ scale, tx: (rect.width - w * scale) / 2, ty: (rect.height - h * scale) / 2 })
  }, [])

  // Đổi ảnh (đổi phiên bản) → reset trạng thái, chờ onLoad để fit lại.
  useEffect(() => {
    setStatus('loading')
    naturalRef.current = { w: 0, h: 0 }
  }, [src])

  const zoomAt = useCallback((factor: number, px?: number, py?: number) => {
    const vp = viewportRef.current
    setView((v) => {
      const scale = clampScale(v.scale * factor)
      const k = scale / v.scale
      const rect = vp?.getBoundingClientRect()
      const cx = px ?? (rect ? rect.width / 2 : 0)
      const cy = py ?? (rect ? rect.height / 2 : 0)
      return { scale, tx: cx - (cx - v.tx) * k, ty: cy - (cy - v.ty) * k }
    })
  }, [])

  // Wheel phải là listener không-passive thì preventDefault mới có tác dụng
  // (React gắn wheel ở root dạng passive).
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top)
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // Pointer capture nằm ở viewport nên mọi pointermove/up đều về đây; vì vậy
  // xử lý cả pan lẫn "click thêm marker" ở viewport (marker chặn pointerdown
  // để không kéo pan khi bấm vào marker).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }
    setPanning(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true
    if (!d.moved) return
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }))
  }

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    dragRef.current = null
    setPanning(false)
    if (d) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!d || d.moved || !addMode || !onAddMarker) return
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    // Chỉ nhận điểm nằm trong ảnh — bỏ qua vùng letterbox xung quanh.
    if (!insideRect(rect, e.clientX, e.clientY)) return
    onAddMarker(toNormalizedPoint(rect, e.clientX, e.clientY))
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('features.design.zoomOut')}
          onClick={() => zoomAt(1 / 1.25)}
        >
          <Minus className="size-4" />
        </Button>
        <span className="tabular w-14 text-center font-mono text-xs text-muted-foreground">
          {Math.round(view.scale * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('features.design.zoomIn')}
          onClick={() => zoomAt(1.25)}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t('features.design.fitScreen')}
          onClick={fitToViewport}
        >
          <Maximize2 className="size-4" />
        </Button>
      </div>

      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'relative h-[420px] touch-none overflow-hidden rounded-card border border-border bg-muted/30 sm:h-[520px]',
          addMode ? 'cursor-crosshair' : panning ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        {status === 'loading' && (
          <p className="lbl-mono absolute inset-0 grid place-items-center">
            {t('common.loading')}
          </p>
        )}
        {status === 'error' && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm font-semibold text-destructive">
            {t('features.design.imageError')}
          </p>
        )}

        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}
        >
          {/* Hộp này có kích thước đúng bằng ảnh → lớp marker dùng % là chuẩn. */}
          <div className="relative">
            <img
              ref={imgRef}
              src={src || undefined}
              alt=""
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget
                naturalRef.current = { w: el.naturalWidth, h: el.naturalHeight }
                setStatus('ready')
                fitToViewport()
              }}
              onError={() => {
                setStatus('error')
                onLoadError?.()
              }}
              className="block max-w-none select-none"
            />
            {markers.map((m) => {
              const pos = toPercent({ x: m.x, y: m.y })
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-label={t('features.design.markerAt', { n: m.label })}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectMarker?.(m.id)
                  }}
                  style={{ left: pos.left, top: pos.top, transform: `translate(-50%, -50%) scale(${1 / view.scale})` }}
                  className={cn(
                    'absolute grid size-6 place-items-center rounded-full border-2 font-mono text-[11px] font-bold shadow-hover transition-colors',
                    m.active
                      ? 'border-white bg-destructive text-white'
                      : 'border-white bg-brand-pine text-white hover:bg-brand-pineHover',
                  )}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
