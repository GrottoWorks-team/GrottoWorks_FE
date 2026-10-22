// Drawer xem lịch sử giao dịch và biến động kho của vật tư (D3: GET /api/v1/materials/{materialId}/allocation-history)
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Clock,
  FileText,
  History,
  Package,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMaterialHistory, type InventoryTransactionDto, type TransactionType } from '../api'

interface MaterialHistoryDrawerProps {
  open: boolean
  onClose: () => void
  materialId?: string
  materialCode?: string
  materialName?: string
  unit?: string
}

export function MaterialHistoryDrawer({
  open,
  onClose,
  materialId,
  materialCode,
  materialName,
  unit,
}: MaterialHistoryDrawerProps) {
  const { t } = useTranslation()
  const drawerRef = useRef<HTMLDivElement>(null)

  const { data: history = [], isPending, isError, refetch } = useMaterialHistory(
    open ? materialId : undefined,
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const getTransactionBadge = (type: TransactionType) => {
    switch (type) {
      case 'OPENING_STOCK':
        return {
          label: t('features.inventory.history.typeOpeningStock'),
          icon: Sparkles,
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        }
      case 'PURCHASE_DELIVERY':
        return {
          label: t('features.inventory.history.typePurchaseDelivery'),
          icon: ArrowDownRight,
          cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
        }
      case 'DONATION_RECEIPT':
        return {
          label: t('features.inventory.history.typeDonationReceipt'),
          icon: ArrowDownLeft,
          cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        }
      case 'TASK_RETURN':
        return {
          label: t('features.inventory.history.typeTaskReturn'),
          icon: RotateCcw,
          cls: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
        }
      case 'TRANSFER_IN':
        return {
          label: t('features.inventory.history.typeTransferIn'),
          icon: ArrowDownRight,
          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        }
      case 'TRANSFER_OUT':
        return {
          label: t('features.inventory.history.typeTransferOut'),
          icon: ArrowUpRight,
          cls: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
        }
      case 'ADJUSTMENT_DAMAGED':
        return {
          label: t('features.inventory.history.typeAdjustmentDamaged'),
          icon: ShieldAlert,
          cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
        }
      case 'ADJUSTMENT_LOST':
        return {
          label: t('features.inventory.history.typeAdjustmentLost'),
          icon: AlertCircle,
          cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
        }
      case 'ADJUSTMENT_DISPOSED':
        return {
          label: t('features.inventory.history.typeAdjustmentDisposed'),
          icon: X,
          cls: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700',
        }
      default:
        return {
          label: type,
          icon: History,
          cls: 'bg-muted text-muted-foreground border-border',
        }
    }
  }

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-foreground/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-label={t('features.inventory.history.title')}
      onClick={onClose}
    >
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="flex w-screen max-w-md flex-col border-l border-border bg-card shadow-2xl transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-border p-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">
                  {t('features.inventory.history.title')}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('features.inventory.history.sub', {
                  materialName: materialName || '',
                  materialCode: materialCode || '',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                <Clock className="size-8 animate-spin text-primary/60" />
                <p className="mt-3 text-xs">{t('common.loading')}</p>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
                <AlertCircle className="size-6 text-red-500" />
                <p className="mt-2 font-medium">{t('features.inventory.history.loadError')}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                  {t('common.retry')}
                </Button>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                <Package className="size-10 text-muted-foreground/40" />
                <p className="mt-3 text-xs">{t('features.inventory.history.empty')}</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-border pl-4 space-y-6 ml-2">
                {history.map((tx: InventoryTransactionDto) => {
                  const badge = getTransactionBadge(tx.transactionType)
                  const Icon = badge.icon
                  const isPositive = tx.quantity >= 0

                  return (
                    <div key={tx.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-card bg-primary ring-4 ring-card" />

                      <div className="rounded-lg border border-border bg-card p-3 shadow-xs transition-shadow group-hover:shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                          >
                            <Icon className="size-3" />
                            {badge.label}
                          </span>
                          <span
                            className={`tabular font-mono text-sm font-bold ${
                              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isPositive ? `+${tx.quantity}` : tx.quantity}{' '}
                            <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>{formatDateTime(tx.transactionDate)}</span>
                        </div>

                        {tx.note && (
                          <div className="mt-2 flex items-start gap-1.5 rounded bg-muted/50 p-2 text-xs text-foreground/80">
                            <FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                            <p className="line-clamp-3">{tx.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-border p-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
