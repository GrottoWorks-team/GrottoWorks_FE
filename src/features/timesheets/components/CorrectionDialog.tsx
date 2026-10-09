// Dialog xử lý yêu cầu chỉnh giờ (row PENDING_FIX): hiện yêu cầu sửa +
// input giờ đã chỉnh → Duyệt (PATCH hours + CLOSED + xoá yêu cầu) hoặc
// Từ chối (chỉ xoá yêu cầu, giữ trạng thái). 1 field số nên dùng state
// tay thay RHF (pattern SupportDetailDialog).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { viDate } from '@/lib/format'
import { useApproveCorrection, useRejectCorrection } from '../api'
import type { Timesheet } from '@/types'

export function CorrectionDialog({
  item,
  volunteerName,
  onClose,
}: {
  item: Timesheet
  volunteerName: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const approve = useApproveCorrection()
  const reject = useRejectCorrection()
  const [hours, setHours] = useState(String(item.hours))
  const [error, setError] = useState(false)

  const onApprove = async () => {
    const n = Number(hours)
    if (hours.trim() === '' || Number.isNaN(n) || n < 0) {
      setError(true)
      return
    }
    try {
      await approve.mutateAsync({ id: item.id, correctedHours: n })
      toast(t('features.timesheets.approved', { name: volunteerName, n }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const onReject = async () => {
    try {
      await reject.mutateAsync(item.id)
      toast(t('features.timesheets.rejected', { name: volunteerName }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const newHours = Number(hours)
  const isValidNum = !Number.isNaN(newHours) && hours.trim() !== ''
  const delta = isValidNum ? newHours - item.hours : 0

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.timesheets.correctionTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => void onReject()} disabled={reject.isPending}>
            {t('features.timesheets.reject')}
          </Button>
          <Button onClick={() => void onApprove()} disabled={approve.isPending}>
            {t('features.timesheets.approve')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div>
            <p className="text-sm font-bold text-foreground">{volunteerName}</p>
            <p className="text-xs text-muted-foreground tabular">{viDate(item.date)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">Giờ gốc:</span>
            <p className="text-sm font-bold text-foreground tabular">{item.hours}h</p>
          </div>
        </div>

        <div className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 p-3">
          <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            {t('features.timesheets.correctionRequest')}:
          </p>
          <p className="mt-1 text-sm text-foreground">{item.correctionRequest}</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ts-corrected">{t('features.timesheets.correctedHours')}</Label>
            {isValidNum && delta !== 0 && (
              <span
                className={`text-xs font-bold ${
                  delta > 0 ? 'text-brand-pine' : 'text-destructive'
                }`}
              >
                {delta > 0 ? `+${delta.toFixed(1)}h` : `${delta.toFixed(1)}h`}
              </span>
            )}
          </div>
          <Input
            id="ts-corrected"
            type="number"
            min={0}
            step="0.5"
            value={hours}
            aria-invalid={error}
            onChange={(e) => {
              setHours(e.target.value)
              setError(false)
            }}
            className="mt-1.5"
          />
          {error && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t('features.timesheets.hoursRequired')}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  )
}
