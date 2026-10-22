// Trang danh sách mùa (COMMITTEE): PageHeader + StatCards + DataTable,
// tạo/sửa qua SeasonFormDialog, chốt mùa qua ConfirmDialog,
// kích hoạt mùa qua SeasonActivateDialog / ConfirmDialog.
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Pencil, LockKeyhole, Rocket, Calendar, Sparkles, Wallet, Clock, Archive } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { StatCard } from '@/components/shared/StatCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useAreas } from '@/features/areas/api'
import { useSeasons, useCompleteSeason, useActivateSeason, useArchiveSeason } from '../api'
import { SeasonFormDialog } from './SeasonFormDialog'
import { SeasonActivateDialog, validateSeasonActivation } from './SeasonActivateDialog'
import type { Season } from '@/types'
import i18n from '@/lib/i18n'
import { viDate } from '@/lib/format'

const d = (n: number) => ({ '--d': n }) as CSSProperties

export default function SeasonListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: seasons = [], isPending } = useSeasons()
  const { data: communities = [] } = useCommunities()
  const { data: areas = [] } = useAreas()
  const completeSeason = useCompleteSeason()
  const activateSeason = useActivateSeason()
  const archiveSeason = useArchiveSeason()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Season | null>(null)
  const [closing, setClosing] = useState<Season | null>(null)
  const [archiving, setArchiving] = useState<Season | null>(null)
  const [activatingCheck, setActivatingCheck] = useState<Season | null>(null)
  const [activatingConfirm, setActivatingConfirm] = useState<Season | null>(null)

  const active = seasons.filter((s) => s.status === 'ACTIVE')
  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN'

  const communityMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of communities) map[c.id] = c.name
    return map
  }, [communities])
  const onActivateClick = (s: Season) => {
    const areasOfSeason = areas.filter((a) => a.seasonId === s.id)
    const { canActivate } = validateSeasonActivation(s, areasOfSeason)
    if (canActivate) {
      setActivatingConfirm(s)
    } else {
      setActivatingCheck(s)
    }
  }

  const onConfirmActivate = async (s: Season) => {
    try {
      await activateSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.activateSuccess', { year: s.year }))
      setActivatingConfirm(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.season.name'),
        render: (s: Season) => (
          <div>
            <span className="font-semibold text-foreground hover:text-primary transition-colors">{s.name}</span>
            <p className="tabular text-xs text-muted-foreground">
              {t('features.season.year')} {s.year}
            </p>
          </div>
        ),
      },
      {
        key: 'period',
        header: t('features.season.period'),
        render: (s: Season) => (
          <div className="flex items-center gap-1.5 tabular text-xs text-muted-foreground">
            <Clock className="size-3.5 text-muted-foreground/60" />
            <span>
              {viDate(s.startDate)} → {viDate(s.endDate)}
            </span>
          </div>
        ),
      },
      {
        key: 'communities',
        header: t('features.season.communities'),
        render: (s: Season) => {
          const ids = s.communityIds ?? []
          if (ids.length === 0) {
            return <span className="text-xs text-muted-foreground">—</span>
          }
          const names = ids.map((id) => communityMap[id] ?? id).join(', ')
          return (
            <span title={names}>
              <Badge className="tabular border-border bg-card text-xs">
                {ids.length} {t('features.season.communities')}
              </Badge>
            </span>
          )
        },
      },
      {
        key: 'budget',
        header: t('features.season.budget'),
        align: 'right' as const,
        render: (s: Season) => (
          <div className="text-right">
            <span className="tabular font-semibold text-foreground">
              {s.budget.toLocaleString(locale)}{' '}
              <span className="text-xs font-normal text-muted-foreground">₫</span>
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (s: Season) => <StatusTag status={s.status} />,
      },
      {
        key: 'description',
        header: t('features.season.description'),
        render: (s: Season) => {
          if (!s.description) {
            return <span className="text-xs text-muted-foreground">—</span>
          }
          const truncated =
            s.description.length > 40 ? `${s.description.slice(0, 40)}…` : s.description
          return (
            <span className="text-xs text-muted-foreground" title={s.description}>
              {truncated}
            </span>
          )
        },
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (s: Season) => (
          <div className="flex justify-end gap-1">
            {s.status === 'PLANNING' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.season.activate')}
                className="text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onActivateClick(s)}
              >
                <Rocket className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => {
                setEditing(s)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            {s.status === 'COMPLETED' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.season.archive')}
                className="text-amber-600 hover:bg-amber-50"
                onClick={() => setArchiving(s)}
              >
                <Archive className="size-4" />
              </Button>
            )}
            {s.status !== 'COMPLETED' && s.status !== 'ARCHIVED' && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.season.close')}
                onClick={() => setClosing(s)}
              >
                <LockKeyhole className="size-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, locale, communityMap, areas],
  )

  const onCloseSeason = async (s: Season) => {
    try {
      await completeSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.closed', { year: s.year }))
      setClosing(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  const onArchiveSeason = async (s: Season) => {
    try {
      await archiveSeason.mutateAsync({ id: s.id, version: s.version })
      toast(t('features.season.archived', { year: s.year }))
      setArchiving(null)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'alert')
    }
  }

  return (
    <div>
      <PageHeader
        title={t('features.season.title')}
        sub={t('features.season.sub')}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <CalendarPlus className="size-4" />
            {t('features.season.create')}
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3 stagger">
        <div style={d(0)}>
          <StatCard
            label={t('features.season.stats.total')}
            value={seasons.length}
            icon={Calendar}
          />
        </div>
        <div style={d(1)}>
          <StatCard
            label={t('features.season.stats.active')}
            value={active.length}
            tone="warn"
            icon={Sparkles}
          />
        </div>
        <div style={d(2)}>
          <StatCard
            label={t('features.season.stats.activeBudget')}
            value={active.reduce((sum, s) => sum + s.budget, 0)}
            unit="₫"
            icon={Wallet}
          />
        </div>
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={seasons}
          columns={columns}
          pageSize={8}
          emptyText={t('features.season.empty')}
          onRowClick={(s) => {
            setEditing(s)
            setFormOpen(true)
          }}
        />
      )}

      {formOpen && (
        <SeasonFormDialog season={editing} onClose={() => setFormOpen(false)} />
      )}
      <ConfirmDialog
        open={Boolean(closing)}
        title={t('features.season.closeTitle')}
        description={
          closing ? t('features.season.closeConfirm', { year: closing.year }) : undefined
        }
        confirmLabel={t('features.season.close')}
        onConfirm={() => closing && onCloseSeason(closing)}
        onClose={() => setClosing(null)}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        title={t('features.season.archiveTitle')}
        description={
          archiving ? t('features.season.archiveConfirm', { year: archiving.year }) : undefined
        }
        confirmLabel={t('features.season.archive')}
        onConfirm={() => archiving && onArchiveSeason(archiving)}
        onClose={() => setArchiving(null)}
      />
      <ConfirmDialog
        open={Boolean(activatingConfirm)}
        title={t('features.season.activateTitle', { year: activatingConfirm?.year })}
        description={
          activatingConfirm
            ? t('features.season.activateConfirm', { year: activatingConfirm.year })
            : undefined
        }
        confirmLabel={t('features.season.activate')}
        onConfirm={() => activatingConfirm && onConfirmActivate(activatingConfirm)}
        onClose={() => setActivatingConfirm(null)}
      />
      {activatingCheck && (
        <SeasonActivateDialog
          season={activatingCheck}
          areas={areas}
          onClose={() => setActivatingCheck(null)}
        />
      )}
    </div>
  )
}
