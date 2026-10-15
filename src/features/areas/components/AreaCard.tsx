// Thẻ khu vực dạng vòm hang đá: dải terra trên với mái vòm panel (pattern
// Login), icon theo type, StatusTag, deadline, season badge, thanh tiến độ moss vươn từ 0 (.g-bar).
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Landmark, TreePine, Lightbulb, Trees, Theater, FileImage, Calendar, Info } from 'lucide-react'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AreaType, WorkArea } from '@/types'

// Icon theo type khu (brief: GROTTO→Landmark, TREE→TreePine, LIGHTING→
// Lightbulb, YARD→Trees, STAGE→Theater).
export const AREA_ICONS: Record<AreaType, typeof Landmark> = {
  GROTTO: Landmark,
  TREE: TreePine,
  LIGHTING: Lightbulb,
  YARD: Trees,
  STAGE: Theater,
}

export function AreaCard({
  area,
  index,
  seasonYear,
  onClick,
  onOpenDesign,
  onOpenDetail,
}: {
  area: WorkArea
  index: number
  seasonYear?: number
  onClick?: (area: WorkArea) => void
  onOpenDesign?: (area: WorkArea) => void
  onOpenDetail?: (area: WorkArea) => void
}) {
  const { t } = useTranslation()
  const Icon = AREA_ICONS[area.type]
  const style = { '--d': index } as CSSProperties
  const displayName = area.name?.trim() || t('features.areas.areaFallback', { id: area.id.slice(0, 8) })

  return (
    <div
      data-area-id={area.id}
      style={style}
      onClick={onClick ? () => onClick(area) : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? displayName : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick(area)
              }
            }
          : undefined
      }
      className={cn(
        'g-item group overflow-hidden rounded-card border border-border bg-card shadow-card transition-all duration-300',
        onClick && 'cursor-pointer hover:-translate-y-1 hover:shadow-hover hover:border-primary/30',
      )}
    >
      {/* Vòm hang đá: dải thông Noel + mái vòm cong hang đá Bê-lem */}
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand-pine via-[#0D7344] to-[#0A5C36]">
        {/* Vòm cong hang đá cắt lên nền card */}
        <div className="absolute inset-x-0 bottom-0 h-4 rounded-t-[20px] bg-card" />

        {/* Biểu tượng khu vực vòm trung tâm */}
        <div className="relative z-10 grid h-full place-items-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15 text-brand-gold shadow-sm backdrop-blur-md border border-white/20 transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-6 text-brand-gold" aria-hidden />
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="lbl-mono">
            {area.deadline ? t('features.areas.deadline') : t('features.areas.title')}
          </p>
          {seasonYear ? (
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {t('features.areas.seasonBadge', { year: seasonYear })}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 text-lg font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
          {displayName}
        </h3>
        {area.description ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={area.description}>
            {area.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <StatusTag status={area.status} />
          {area.startDate || area.deadline ? (
            <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-0.5 tabular text-[11px] text-muted-foreground">
              <Calendar className="size-3 text-muted-foreground/70" />
              <span>
                {area.startDate ? viDate(area.startDate) : '—'} →{' '}
                <strong className="font-semibold text-foreground">
                  {area.deadline ? viDate(area.deadline) : '—'}
                </strong>
              </span>
            </div>
          ) : null}
        </div>
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className="lbl-mono">{t('features.areas.progress')}</span>
            <span className="tabular text-sm font-extrabold text-foreground">{area.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={area.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('features.areas.progress')}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-border"
          >
            <div
              className={cn('g-bar h-full rounded-full bg-brand-pine')}
              style={{ width: `${area.progress}%`, ...style }}
            />
          </div>
        </div>
        <p className="tabular mt-4 text-xs font-semibold text-muted-foreground">
          {area.volunteerCount} {t('features.areas.volunteers')} · {area.taskCount}{' '}
          {t('features.areas.tasks')}
        </p>
        <div className="mt-4 flex gap-2">
          {onOpenDetail && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetail(area)
              }}
            >
              <Info className="size-3.5 mr-1 text-brand-pine" />
              {t('features.areas.detailBtn', { defaultValue: 'Chi tiết' })}
            </Button>
          )}
          {onOpenDesign && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDesign(area)
              }}
            >
              <FileImage className="size-3.5 mr-1" />
              {t('features.design.title')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
