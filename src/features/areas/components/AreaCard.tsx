// Thẻ khu vực dạng vòm hang đá: dải terra trên với mái vòm panel (pattern
// Login), icon theo type, StatusTag, deadline, season badge, thanh tiến độ moss vươn từ 0 (.g-bar).
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Landmark, TreePine, Lightbulb, Trees, Theater } from 'lucide-react'
import { StatusTag } from '@/components/shared/StatusTag'
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
}: {
  area: WorkArea
  index: number
  seasonYear?: number
  onClick?: (area: WorkArea) => void
}) {
  const { t } = useTranslation()
  const Icon = AREA_ICONS[area.type]
  const style = { '--d': index } as CSSProperties
  return (
    <div
      data-area-id={area.id}
      style={style}
      onClick={onClick ? () => onClick(area) : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? area.name : undefined}
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
        'g-item overflow-hidden rounded-card border border-border bg-card shadow-card',
        onClick && 'cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-hover',
      )}
    >
      {/* Vòm hang: dải terra + mái vòm panel cắt lên trên, icon ở giữa. */}
      <div className="relative grid h-24 place-items-center bg-primary">
        
        <div className="grid h-full place-items-center">
          <div className="grid size-11 place-items-center rounded-card bg-primary text-primary-foreground">
            <Icon className="size-5" aria-hidden />
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="lbl-mono">
            {t(`features.areas.areaType.${area.type}`)} · {t(`features.areas.level.${area.level}`)}
          </p>
          {seasonYear ? (
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {t('features.areas.seasonBadge', { year: seasonYear })}
            </span>
          ) : null}
        </div>
        <h3 className="mt-1 text-lg font-bold leading-tight text-foreground">{area.name}</h3>
        {area.description ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground" title={area.description}>
            {area.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <StatusTag status={area.status} />
          {area.deadline ? (
            <span className="tabular text-xs text-muted-foreground">
              {t('features.areas.deadline')}: <strong className="font-semibold text-foreground">{viDate(area.deadline)}</strong>
            </span>
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
      </div>
    </div>
  )
}
