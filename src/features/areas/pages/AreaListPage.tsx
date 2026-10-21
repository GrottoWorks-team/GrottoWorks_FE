// Trang khu vực công tác (COMMITTEE/PARISH): filter mùa, grid AreaCard + DataTable (toggle),
// tạo/sửa qua AreaFormDialog (prefill mùa), phân công qua AreaAssignDialog, xoá qua ConfirmDialog.
// Click card/row → /community/areas/:id/tasks hoặc /parish/areas/:id/tasks (TaskListPage).
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Table2, Pencil, Plus, UserPlus, FileImage } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAreas, useSeasons, useUsers } from '../api'
import { AreaCard } from '../components/AreaCard'
import { AreaDetailDialog } from '../components/AreaDetailDialog'
import { AreaFormDialog, SELECT_CLS } from './AreaFormDialog'
import { AreaAssignDialog } from './AreaAssignDialog'
import type { WorkArea } from '@/types'

type View = 'grid' | 'table'

export default function AreaListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()

  // Ban hành giáo (COMMUNITY) chỉ quản lý/phân bổ khu vực — không mở bản thiết kế.
  // PARISH (quản trị) vẫn xem/duyệt bản thiết kế.
  const canViewDesign = user?.role !== 'COMMUNITY'

  const seasonParam = searchParams.get('season') ?? 'all'
  const [selectedSeason, setSelectedSeason] = useState<string>(seasonParam)

  const { data: seasons = [], isPending: isSeasonsPending } = useSeasons()

  // BE không có /areas phẳng: chọn 1 mùa thì gọi 1 lần, "tất cả" thì gọi mỗi
  // mùa một lần rồi gộp.
  const seasonIds = useMemo(
    () => (selectedSeason === 'all' ? seasons.map((s) => s.id) : [selectedSeason]),
    [selectedSeason, seasons],
  )
  const { data: rawAreas = [], isPending: isAreasPending } = useAreas(seasonIds)
  const { data: users = [] } = useUsers()


  // Đồng bộ URL param khi URL thay đổi từ ngoài
  useEffect(() => {
    setSelectedSeason(seasonParam)
  }, [seasonParam])

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeason(seasonId)
    const nextParams = new URLSearchParams(searchParams)
    if (seasonId === 'all') {
      nextParams.delete('season')
    } else {
      nextParams.set('season', seasonId)
    }
    setSearchParams(nextParams, { replace: true })
  }

  const seasonMap = useMemo(() => new Map(seasons.map((s) => [s.id, s])), [seasons])

  const areas = useMemo(() => {
    if (user?.role === 'COMMUNITY') {
      return rawAreas.filter((a) => a.communityId === user.communityId)
    }
    return rawAreas
  }, [rawAreas, user])

  const [view, setView] = useState<View>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkArea | null>(null)

  const [assigning, setAssigning] = useState<WorkArea | null>(null)
  const [detailAreaId, setDetailAreaId] = useState<string | null>(null)

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? '—'
  const displayName = (a: WorkArea) => a.name?.trim() || `Khu vực #${a.id.slice(0, 8)}`

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.areas.name'),
        render: (a: WorkArea) => (
          <div>
            <span className="font-semibold text-foreground">{displayName(a)}</span>
            {a.description ? (
              <p className="line-clamp-1 text-xs text-muted-foreground" title={a.description}>
                {a.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'season',
        header: t('features.areas.season'),
        render: (a: WorkArea) => {
          const season = seasonMap.get(a.seasonId ?? '')
          return (
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {season ? t('features.areas.seasonBadge', { year: season.year }) : '—'}
            </span>
          )
        },
      },
      {
        key: 'type',
        header: t('features.areas.type'),
        render: (a: WorkArea) => t(`features.areas.areaType.${a.type}`),
      },
      {
        key: 'level',
        header: t('features.areas.level'),
        render: (a: WorkArea) => t(`features.areas.level.${a.level}`),
      },
      {
        key: 'leaderId',
        header: t('features.areas.leader'),
        render: (a: WorkArea) => nameOf(a.leaderId),
      },
      {
        key: 'officerId',
        header: t('features.areas.officer'),
        render: (a: WorkArea) => nameOf(a.officerId),
      },
      {
        key: 'deadline',
        header: t('features.areas.deadline'),
        render: (a: WorkArea) => (
          <span className="tabular text-xs font-medium text-muted-foreground">
            {a.deadline ? viDate(a.deadline) : '—'}
          </span>
        ),
      },
      // ponytail: progress/volunteerCount/taskCount thuộc service Task/Volunteer
      // (chưa gắn) — mapper đang trả 0. Gắn service tương ứng thì bỏ chú thích.
      {
        key: 'progress',
        header: t('features.areas.progress'),
        align: 'right' as const,
        render: (a: WorkArea) => <span className="tabular">{a.progress}%</span>,
      },
      {
        key: 'people',
        header: t('features.areas.people'),
        align: 'right' as const,
        render: (a: WorkArea) => (
          <span className="tabular">
            {a.volunteerCount}/{a.taskCount}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkArea) => <StatusTag status={a.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (a: WorkArea) => (
          <div className="flex justify-end gap-1">
            {canViewDesign && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.design.openDesign')}
                onClick={() =>
                  navigate(
                    `${pathname.startsWith('/parish') ? '/parish' : '/community'}/areas/${a.id}/designer`,
                  )
                }
              >
                <FileImage className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('features.areas.assign')}
              onClick={(e) => {
                e.stopPropagation()
                setAssigning(a)
              }}
            >
              <UserPlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => {
                setEditing(a)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>

          </div>
        ),
      },
    ],
    [t, users, seasonMap, navigate, pathname, canViewDesign],
  )



  const isPending = isAreasPending || isSeasonsPending

  return (
    <div>
      <PageHeader
        title={t('features.areas.title')}
        sub={t('features.areas.sub')}
        actions={
          <>
            <div
              role="group"
              aria-label={t('features.areas.view')}
              className="flex overflow-hidden rounded-md border border-border"
            >
              {(
                [
                  ['grid', LayoutGrid, t('features.areas.viewGrid')],
                  ['table', Table2, t('features.areas.viewTable')],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'grid size-10 place-items-center transition-colors',
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:text-primary',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t('features.areas.create')}
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="area-season-filter" className="lbl-mono cursor-pointer">
            {t('features.areas.seasonFilter')}:
          </label>
          <select
            id="area-season-filter"
            aria-label={t('features.areas.seasonFilter')}
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className={cn(SELECT_CLS, 'h-9 w-auto min-w-[200px] text-xs font-medium')}
          >
            <option value="all">{t('features.areas.allSeasons')}</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {`Mùa Giáng sinh ${s.year} (${t(`status.${s.status}`, s.status)})`}
              </option>
            ))}
          </select>
        </div>
        <span className="tabular text-xs font-semibold text-muted-foreground">
          {t('common.total', { n: areas.length })}
        </span>
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : view === 'grid' ? (
        areas.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {areas.map((a, i) => (
              <AreaCard
                key={a.id}
                area={a}
                index={i}
                seasonYear={seasonMap.get(a.seasonId ?? 's1')?.year}
                onClick={(x) =>
                  navigate(
                    `${pathname.startsWith('/parish') ? '/parish' : '/community'}/areas/${x.id}/tasks`,
                  )
                }
                onOpenDetail={(x) => setDetailAreaId(x.id)}
                onOpenDesign={
                  canViewDesign
                    ? (x) =>
                        navigate(
                          `${pathname.startsWith('/parish') ? '/parish' : '/community'}/areas/${x.id}/designer`,
                        )
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState text={t('features.areas.empty')} />
        )
      ) : (
        <DataTable
          rows={areas}
          columns={columns}
          searchKeys={['name']}
          pageSize={8}
          emptyText={t('features.areas.empty')}
          onRowClick={(a) =>
            navigate(
              `${pathname.startsWith('/parish') ? '/parish' : '/community'}/areas/${a.id}/tasks`,
            )
          }
        />
      )}

      {formOpen && (
        <AreaFormDialog
          area={editing}
          defaultSeasonId={selectedSeason !== 'all' ? selectedSeason : undefined}
          onClose={() => setFormOpen(false)}
        />
      )}
      {assigning && <AreaAssignDialog area={assigning} onClose={() => setAssigning(null)} />}
      <AreaDetailDialog
        areaId={detailAreaId}
        open={Boolean(detailAreaId)}
        onClose={() => setDetailAreaId(null)}
      />

    </div>
  )
}
