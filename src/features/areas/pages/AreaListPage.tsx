// Trang khu vực công tác (COMMITTEE): lọc mùa, danh sách thẻ khu vực một cột,
// tạo/sửa qua AreaFormDialog (prefill mùa), phân công qua AreaAssignDialog.
// 11/11/2026: quyền tạo/điều chỉnh/phân công thuộc **Ban hành giáo (COMMUNITY)**;
// ADMIN (FE `PARISH`) chỉ xem (bảng khu vực nằm trong hub “Giáo xứ & cộng đoàn”).
// BE chưa có DELETE /work-areas → không có nút xoá.
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Khu vực công tác — Danh Sách".
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, Map as MapIcon, MapPin, Table2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useSeasonContext } from '@/features/season/season-context'
import { useSeasonDashboard } from '@/features/dashboards/api'
import { useCommunities } from '@/features/communities/api'
import { useAreas, useSeasons, useUsers } from '../api'
import { AreaDetailDialog } from '../components/AreaDetailDialog'
import { AreaFormDialog, SELECT_CLS } from './AreaFormDialog'
import { AreaAssignDialog } from './AreaAssignDialog'
import ParishMapPage from '@/features/map/pages/ParishMapPage'
import type { WorkArea } from '@/types'

type View = 'grid' | 'table' | 'map'

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const TH = 'font-mono text-[8px] font-semibold uppercase tracking-[1px] text-[#A3B4A9]'

const STATUS_STYLE: Record<string, { pill: string; dot: string; text: string }> = {
  PLANNING: { pill: 'border-[#E7E0CB] bg-[#F8F6EE]', dot: 'bg-[#C98A12]', text: 'text-[#8A6412]' },
  ACTIVE: { pill: 'border-[#CBE3D2] bg-[#E9F4EC]', dot: 'bg-[#12805A]', text: 'text-[#1B6B45]' },
  READY: { pill: 'border-[#CBE3D2] bg-[#E9F4EC]', dot: 'bg-[#12805A]', text: 'text-[#1B6B45]' },
  COMPLETED: { pill: 'border-[#DDE8D6] bg-[#F1F6EE]', dot: 'bg-[#5C7468]', text: 'text-[#3B5348]' },
  ARCHIVED: { pill: 'border-[#E7EEE3] bg-[#F7F9F5]', dot: 'bg-[#97AB9E]', text: 'text-[#6B8175]' },
}

const SEG_BTN =
  'grid size-[30px] place-items-center rounded-[8px] transition-colors'

export default function AreaListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  // Ban hành giáo (COMMUNITY) chỉ quản lý/phân bổ khu vực — không mở bản thiết kế.
  // PARISH (quản trị) vẫn xem/duyệt bản thiết kế.
  const { user } = useAuth()
  // Từ 11/11/2026: Ban hành giáo (role FE `COMMUNITY`, BE `PARISH`) là người tạo/sửa/
  // phân công khu vực (trưởng khu + trưởng nhóm vật tư); ADMIN (FE `PARISH`) chỉ xem.
  const canEdit = user?.role === 'COMMUNITY'

  // Mùa lấy từ header (SeasonProvider). URL vẫn là nguồn sự thật: dropdown của
  // trang và khung chọn mùa trên header cùng ghi `?season=`.
  const { seasonId: headerSeasonId } = useSeasonContext()
  const [selectedSeason, setSelectedSeason] = useState<string>(
    searchParams.get('season') ?? headerSeasonId ?? 'all',
  )
  // Mùa header của lần render trước — chỉ reset dropdown khi người dùng THẬT SỰ
  // đổi mùa ở header, không reset theo URL (xem effect bên dưới).
  const headerSeasonRef = useRef(headerSeasonId)

  const { data: seasons = [], isPending: isSeasonsPending } = useSeasons()

  // BE không có /areas phẳng: chọn 1 mùa thì gọi 1 lần, "tất cả" thì gọi mỗi
  // mùa một lần rồi gộp.
  const seasonIds = useMemo(
    () => (selectedSeason === 'all' ? seasons.map((s) => s.id) : [selectedSeason]),
    [selectedSeason, seasons],
  )
  const { data: rawAreas = [], isPending: isAreasPending } = useAreas(seasonIds)
  const { data: users = [] } = useUsers()
  const { data: communities = [] } = useCommunities()
  const { data: dashboard } = useSeasonDashboard(
    selectedSeason !== 'all' ? selectedSeason : undefined,
  )

  // Đồng bộ khi URL đổi từ ngoài (link có `?season=`, back/forward). Không xử lý
  // trường hợp URL MẤT param: đó chính là lúc người dùng chọn "Tất cả mùa".
  useEffect(() => {
    const fromUrl = searchParams.get('season')
    if (fromUrl) setSelectedSeason(fromUrl)
  }, [searchParams])

  // Đổi mùa ở header → trang đi theo.
  useEffect(() => {
    if (headerSeasonRef.current === headerSeasonId) return
    headerSeasonRef.current = headerSeasonId
    setSelectedSeason(headerSeasonId ?? 'all')
  }, [headerSeasonId])

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
    // Chỉ lọc theo cộng đoàn khi tài khoản THỰC SỰ thuộc một cộng đoàn; tài khoản
    // ban hành giáo cấp giáo xứ (không có communityId) thấy toàn bộ khu.
    if (user?.role === 'COMMUNITY' && user.communityId) {
      return rawAreas.filter((a) => a.communityId === user.communityId)
    }
    return rawAreas
  }, [rawAreas, user])

  const [view, setView] = useState<View>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WorkArea | null>(null)
  const [assigning, setAssigning] = useState<WorkArea | null>(null)
  const [detailAreaId, setDetailAreaId] = useState<string | null>(null)

  // Link từ màn Mùa ("thiếu trưởng khu / trưởng nhóm vật tư") → mở đúng khu để sửa.
  const editAreaId = searchParams.get('area')
  useEffect(() => {
    if (!editAreaId || !canEdit) return
    const hit = rawAreas.find((a) => a.id === editAreaId)
    if (!hit) return
    setEditing(hit)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('area')
        return next
      },
      { replace: true },
    )
  }, [editAreaId, rawAreas, canEdit, setSearchParams])

  // Dashboard Mùa tạo khu vực (nút "Thêm khu vực").
  const createRequested = searchParams.get('create')
  useEffect(() => {
    if (!createRequested || !canEdit) return
    setEditing(null)
    setFormOpen(true)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('create')
        return next
      },
      { replace: true },
    )
  }, [createRequested, canEdit, setSearchParams])

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? '—'
  const communityNameOf = (id?: string | null) =>
    (id ? communities.find((c) => c.id === id)?.name : '') ?? '—'
  const displayName = (a: WorkArea) =>
    a.name?.trim() || t('features.areas.fallbackName', { id: a.id.slice(0, 8) })
  const progressOf = (id: string) => dashboard?.workAreas.find((row) => row.workAreaId === id)

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
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkArea) => <StatusTag status={a.status} />,
      },
    ],
    [t, users, seasonMap],
  )

  const isPending = isAreasPending || isSeasonsPending
  const selectedSeasonRow = selectedSeason !== 'all' ? seasonMap.get(selectedSeason) : undefined

  const openDetail = (id: string) => setDetailAreaId(id)
  const goTasks = (id: string) =>
    navigate(`${pathname.startsWith('/parish') ? '/parish' : '/community'}/areas/${id}/tasks`)

  return (
    <div>
      <PageHeader
        title={t('features.areas.title')}
        sub={t('features.areas.sub')}
        actions={
          <>
            <div className="flex items-center gap-[2px] rounded-[10px] border border-[#E3EAE0] bg-[#F7F9F5] p-[2px]">
              {(
                [
                  ['grid', LayoutGrid, t('features.areas.viewGrid')],
                  ['table', Table2, t('features.areas.viewTable')],
                  ['map', MapIcon, t('features.map.title')],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-label={label}
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    SEG_BTN,
                    view === v
                      ? 'bg-white text-[#0A5C36] shadow-[0px_1px_2px_#06281B1A]'
                      : 'text-[#8AA298] hover:text-[#0B2E1F]',
                  )}
                >
                  <Icon className="size-[13px]" />
                </button>
              ))}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
              >
                <MapPin className="size-[13px] text-[#F2D07A]" aria-hidden />
                <span className="text-[12px] font-bold text-white">{t('features.areas.create')}</span>
              </button>
            )}
          </>
        }
      />

      {!canEdit && (
        <p className="mb-4 rounded-[12px] border border-[#E3EAE0] bg-[#F7F9F5] px-3 py-2 text-xs text-[#7C9287]">
          {t('features.areas.parishOnlyHint')}
        </p>
      )}

      {/* Thanh lọc mùa */}
      <div className="mb-[16px] flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E3EAE0] bg-white px-[14px] py-[10px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <label htmlFor="area-season-filter" className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
            {t('features.areas.seasonFilter')}
          </label>
          <select
            id="area-season-filter"
            aria-label={t('features.areas.seasonFilter')}
            value={selectedSeason}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className={cn(
              SELECT_CLS,
              'h-8 w-auto min-w-[150px] rounded-[9px] border-[#E7EEE3] bg-[#F7F9F5] px-[10px] text-[11px] font-semibold text-[#3B5348]',
            )}
          >
            <option value="all">{t('features.areas.allSeasons')}</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {t('features.season.optionLabel', { year: s.year, status: t(`status.${s.status}`, s.status) })}
              </option>
            ))}
          </select>
          {selectedSeasonRow && (
            <>
              {(() => {
                const style = STATUS_STYLE[selectedSeasonRow.status] ?? STATUS_STYLE.ARCHIVED
                return (
                  <span className={cn('flex w-fit items-center gap-[6px] rounded-full border px-[9px] py-1', style.pill)}>
                    <span className={cn('size-[5px] rounded-full', style.dot)} aria-hidden />
                    <span className={cn('text-[10px] font-semibold', style.text)}>
                      {t(`status.${selectedSeasonRow.status}`)}
                    </span>
                  </span>
                )
              })()}
              <span className="font-mono text-[9.5px] text-[#96AAA0]">
                {viDate(selectedSeasonRow.startDate)} → {viDate(selectedSeasonRow.endDate)}
              </span>
            </>
          )}
        </div>
        <span className="font-mono text-[10.5px] font-bold text-[#0B2E1F]">
          {t('features.areas.totalCount', { defaultValue: 'Tổng: {{n}}', n: areas.length })}
        </span>
      </div>

      {isPending ? (
        <p className="font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
      ) : view === 'map' ? (
        <ParishMapPage embedded />
      ) : view === 'table' ? (
        <DataTable
          rows={areas}
          columns={columns}
          searchKeys={['name']}
          pageSize={8}
          emptyText={t('features.areas.empty')}
          onRowClick={(a) => goTasks(a.id)}
        />
      ) : areas.length === 0 ? (
        <div className={CARD}>
          <EmptyState text={t('features.areas.empty')} />
        </div>
      ) : (
        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-[12px]">
            {areas.map((a) => {
              const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.ARCHIVED
              const progress = progressOf(a.id)
              const pct = Math.round(progress?.progressPercent ?? 0)
              return (
                <section key={a.id} className={CARD}>
                  <div className="flex items-center gap-3 px-4 pb-[14px] pt-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[11px] border border-[#DDE8D6] bg-[#EDF4EA]">
                      <MapPin className="size-[15px] text-[#3F7F5B]" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                      <span className="w-full truncate text-[13.5px] font-bold text-[#0B2E1F]">
                        {displayName(a)}
                      </span>
                      <span className="w-full truncate text-[11px] text-[#8AA298]">
                        {a.description || '—'}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'flex w-fit shrink-0 items-center gap-[6px] rounded-full border px-[9px] py-1',
                        style.pill,
                      )}
                    >
                      <span className={cn('size-[5px] rounded-full', style.dot)} aria-hidden />
                      <span className={cn('text-[10px] font-semibold', style.text)}>
                        {t(`status.${a.status}`)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openDetail(a.id)}
                      className="flex h-[30px] shrink-0 items-center rounded-[9px] border border-[#DDE7D8] bg-white px-[10px] transition-colors hover:bg-[#F4F8F1]"
                    >
                      <span className="text-[11px] font-bold text-[#0A5C36]">
                        {t('features.areas.detail', { defaultValue: 'Chi tiết' })}
                      </span>
                    </button>
                  </div>
                  <div className={RULE} aria-hidden />
                  <div className="flex w-full items-center px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1 border-r border-[#F0F4EC] pr-3">
                      <span className={TH}>{t('features.areas.leader')}</span>
                      <span className="truncate text-[11.5px] font-semibold text-[#233A2E]">
                        {nameOf(a.leaderId)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 border-r border-[#F0F4EC] px-3">
                      <span className={TH}>{t('features.areas.officer')}</span>
                      <span className="truncate text-[11.5px] font-semibold text-[#233A2E]">
                        {nameOf(a.officerId)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 border-r border-[#F0F4EC] px-3">
                      <span className={TH}>{t('features.areas.deadline')}</span>
                      <span className="truncate text-[11.5px] font-semibold text-[#233A2E]">
                        {a.deadline ? viDate(a.deadline) : '—'}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-[5px] pl-[14px]">
                      <div className="flex w-full items-center justify-between">
                        <span className={TH}>{t('features.dashboards.progress')}</span>
                        <span className="font-mono text-[10px] font-bold text-[#5C7468]">{pct}%</span>
                      </div>
                      <span className="relative h-[5px] w-full overflow-hidden rounded-[3px] bg-[#EEF3EB]">
                        <span
                          className={cn(
                            'absolute left-0 top-0 h-[5px] rounded-[3px]',
                            pct > 0 ? 'bg-[#12805A]' : 'bg-[#C98A12]',
                          )}
                          style={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
                          aria-hidden
                        />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#ECF1E9] px-4 py-[10px]">
                    <div className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const season = seasonMap.get(a.seasonId ?? '')
                        return season ? (
                          <span className="shrink-0 rounded-full border border-[#E7EEE3] bg-[#F7F9F5] px-2 py-0.5 font-mono text-[9px] text-[#7C9287]">
                            {t('features.areas.seasonBadge', { year: season.year })}
                          </span>
                        ) : null
                      })()}
                      <span className="truncate text-[10px] text-[#96AAA0]">
                        {t('features.areas.communityPrefix', { defaultValue: 'Cộng đoàn' })}:{' '}
                        {communityNameOf(a.communityId)}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-[9.5px] text-[#A3B4A9]">
                      {t('features.areas.taskCount', {
                        defaultValue: '{{tasks}} nhiệm vụ · {{done}} hoàn thành',
                        tasks: progress?.tasks ?? 0,
                        done: progress?.completed ?? 0,
                      })}
                    </span>
                  </div>
                </section>
              )
            })}
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
            <section className={CARD}>
              <div className="px-4 py-[14px]">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.areas.overviewHead', { defaultValue: 'Tổng quan khu vực' })}
                </p>
              </div>
              <div className={RULE} aria-hidden />
              <div className="flex flex-col px-4 pb-3 pt-[6px]">
                {[
                  { key: 'total', label: t('features.areas.totalAreas', { defaultValue: 'Tổng khu vực' }), value: areas.length, tone: '' },
                  { key: 'leader', label: t('features.areas.leaderCovered', { defaultValue: 'Đủ trưởng khu' }), value: areas.filter((a) => a.leaderId).length, tone: 'text-[#1B6B45]' },
                  { key: 'leaderMissing', label: t('features.areas.leaderMissing', { defaultValue: 'Thiếu trưởng khu' }), value: areas.filter((a) => !a.leaderId).length, tone: 'text-[#A65A12]' },
                  { key: 'officerMissing', label: t('features.areas.officerMissing', { defaultValue: 'Thiếu trưởng nhóm vật tư' }), value: areas.filter((a) => !a.officerId).length, tone: 'text-[#A65A12]' },
                  { key: 'ready', label: t('features.areas.readyCount', { defaultValue: 'Đã sẵn sàng' }), value: areas.filter((a) => a.status === 'READY' || a.status === 'COMPLETED').length, tone: '' },
                ].map((row) => (
                  <div
                    key={row.key}
                    className="flex w-full items-center justify-between border-b border-[#F0F4EC] py-[9px] last:border-0"
                  >
                    <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                    <span className={cn('font-mono text-[10.5px] font-bold text-[#0B2E1F]', row.tone)}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] px-[14px] py-[13px]">
              <div
                className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
                aria-hidden
              />
              <span className="relative z-[1] w-fit font-mono text-[9px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                {t('features.areas.pillarHead', { defaultValue: 'Khu vực trụ cột' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-4 text-[#A9D7BF]">
                {t('features.areas.pillarBody', { defaultValue: 'Mỗi khu gắn một trưởng khu và một trưởng nhóm vật tư. Khu thiếu người sẽ bị chặn xác nhận Ready.' })}
              </p>
            </section>
          </aside>
        </div>
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
