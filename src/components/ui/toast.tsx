import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToastFn = (msg: string, tone?: 'ok' | 'alert') => void

const ToastContext = createContext<ToastFn | null>(null)

interface ToastItem {
  id: number
  msg: string
  tone: 'ok' | 'alert'
}

/** Toast tối giản kiểu sonner: useToast()(msg, tone) — tự biến mất sau 4s. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const toast = useCallback<ToastFn>((msg, tone = 'ok') => {
    if (typeof window === 'undefined') return
    const id = ++nextId.current
    setItems((xs) => [...xs, { id, msg, tone }])
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        setItems((xs) => xs.filter((x) => x.id !== id))
      }
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
        {items.map((x) => (
          <div
            key={x.id}
            role="status"
            className={cn(
              'g-item rounded-md px-4 py-3 text-sm font-semibold shadow-hover',
              x.tone === 'alert'
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-card text-foreground',
            )}
          >
            {x.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast phải dùng bên trong ToastProvider')
  return ctx
}
