// Dialog kiểm tra điều kiện kích hoạt mùa (Flow 6) — checklist validate:
// 1. Thời gian hợp lệ (startDate < endDate)
// 2. Đã chọn cộng đoàn tham gia (tối thiểu 1)
// 3. Đã phân chia khu vực thuộc mùa (tối thiểu 1)
// 4. Mọi khu vực đều có Trưởng khu, Thủ kho và Thời hạn
import { useTranslation } from 'react-i18next'
import { CircleCheck, CircleX, CircleAlert, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useActivateSeason } from '../api'
import type { Season, WorkArea } from '@/types'

export interface SeasonValidationItem {
  key: string
  label: string
  valid: boolean
  detail?: string
}

export function validateSeasonActivation(
  season: Season,
  areasOfSeason: WorkArea[],
): { canActivate: boolean; items: SeasonValidationItem[] } {
  const isDateValid = Boolean(
    season.startDate && season.endDate && season.startDate < season.endDate,
  )
  const isCommValid = Boolean(season.communityIds && season.communityIds.length > 0)
  const hasAreas = areasOfSeason.length > 0

  const missingStaffAreas = areasOfSeason.filter(
    (a) => !a.leaderId || !a.officerId || !a.deadline,
  )
  const isStaffValid = hasAreas && missingStaffAreas.length === 0

  const items: SeasonValidationItem[] = [
    {
      key: 'dates',
      label: 'features.season.checkDate',
      valid: isDateValid,
      detail: !isDateValid ? 'features.season.endAfterStart' : undefined,
    },
    {
      key: 'communities',
      label: 'features.season.checkCommunities',
      valid: isCommValid,
      detail: !isCommValid ? 'features.season.communityRequired' : undefined,
    },
    {
      key: 'areas',
      label: 'features.season.checkAreas',
      valid: hasAreas,
      detail: !hasAreas ? 'features.season.checkAreasEmpty' : undefined,
    },
    {
      key: 'staff',
      label: 'features.season.checkStaff',
      valid: isStaffValid,
      detail:
        missingStaffAreas.length > 0
          ? missingStaffAreas.map((a) => a.name).join(', ')
          : undefined,
    },
  ]

  const canActivate = isDateValid && isCommValid && hasAreas && isStaffValid

  return { canActivate, items }
}

export function SeasonActivateDialog({
  season,
  areas,
  onClose,
}: {
  season: Season
  areas: WorkArea[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const activateSeason = useActivateSeason()

  const areasOfSeason = areas.filter((a) => a.seasonId === season.id)
  const { canActivate, items } = validateSeasonActivation(season, areasOfSeason)

  const onActivate = async () => {
    try {
      await activateSeason.mutateAsync(season.id)
      toast(t('features.season.activateSuccess', { year: season.year }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.season.activateTitle', { year: season.year })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={onActivate}
            disabled={!canActivate || activateSeason.isPending}
          >
            <Rocket className="size-4" />
            {t('features.season.activate')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('features.season.checkTitle')}
        </p>

        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3 p-3">
              {item.valid ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <CircleX className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
              <div className="flex-1 text-sm">
                <p
                  className={
                    item.valid
                      ? 'font-medium text-foreground'
                      : 'font-medium text-destructive'
                  }
                >
                  {t(item.label)}
                </p>
                {item.detail && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.key === 'staff'
                      ? t('features.season.checkStaffMissing', { areas: item.detail })
                      : t(item.detail)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {canActivate ? (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200">
            <CircleCheck className="size-4 shrink-0 text-emerald-600" />
            <span>{t('features.season.readyToActivate')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-xs font-medium text-destructive border border-amber-200">
            <CircleAlert className="size-4 shrink-0 text-destructive" />
            <span>{t('features.season.validationFailed')}</span>
          </div>
        )}
      </div>
    </Dialog>
  )
}
