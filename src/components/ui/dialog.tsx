import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import i18n from '@/lib/i18n'
import { cn } from '@/lib/utils'

// Bề rộng hộp thoại: sm cho hộp thoại ngắn (xác nhận), md/lg cho form nhiều
// trường — rộng hơn nên ít hàng hơn, tránh tràn dọc.
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const

// Dialog tự viết (không Radix): overlay + card grotto. Esc + click overlay đóng,
// mở dialog focus nút close (focus trap đầy đủ hoãn — demo 1 vòng Tab là đủ).
// Chiều cao: panel bị chặn max-h theo viewport, phần thân cuộn được, header/footer
// ghim lại — form dài không bao giờ bị cắt mất nội dung.
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'sm',
}: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  footer?: ReactNode
  /** sm (mặc định) | md | lg — lg cho form nhiều trường. */
  size?: keyof typeof SIZES
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // `onClose` thường là arrow function tạo mới mỗi lần cha render (vd. khi gõ 1 ký tự vào ô
  // input trong dialog → state đổi → render lại → `onClose` là hàm mới). Nếu để nó trong deps
  // của effect bên dưới, effect chạy lại sau MỖI ký tự và focus nhảy sang nút X (đóng) —
  // đúng lỗi "gõ 1 ký tự là focus nhảy sang element khác" trong dialog xoá/từ chối.
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    // Chỉ chạy khi dialog MỞ/ĐÓNG: ưu tiên focus ô nhập đầu tiên (form trong dialog), nếu không có
    // thì focus nút đóng để bàn phím vẫn điều hướng được ngay.
    const field = panelRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    )
    ;(field ?? closeRef.current)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      {/* min-h-full + items-center: hộp thoại ngắn thì căn giữa; hộp thoại cao
          hơn màn hình thì overlay cuộn được — không cắt mất nội dung. */}
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={panelRef}
          className={cn(
            'g-item flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-card border border-border bg-card shadow-hover',
            SIZES[size],
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={i18n.t('common.close')}
              className="rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          {children && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 text-sm text-muted-foreground">
              {children}
            </div>
          )}
          {footer && (
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
