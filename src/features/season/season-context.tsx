// Mùa đang thao tác — nguồn duy nhất cho khung chọn mùa trên header và cho các
// trang có lọc theo mùa.
//
// Mùa được chọn ghi lên URL `?season=<id>` nên refresh / chia sẻ link vẫn giữ
// đúng mùa, và những trang đã đọc `searchParams.get('season')` (vd AreaListPage)
// tự động đi theo mà không cần đồng bộ thêm.
//
// Khi URL chưa có (hoặc id không còn tồn tại) → chọn mặc định theo thứ tự
// ACTIVE → READY → PLANNING → COMPLETED → ARCHIVED, cùng nhóm thì mùa mới nhất.
import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar } from 'lucide-react'
import { StatusTag } from '@/components/shared/StatusTag'
import { useSeasons } from './api'
import type { Season } from '@/types'

const STATUS_PRIORITY: Record<Season['status'], number> = {
  ACTIVE: 0,
  READY: 1,
  PLANNING: 2,
  COMPLETED: 3,
  ARCHIVED: 4,
}

const EMPTY: SeasonContextValue = {
  seasons: [],
  season: null,
  seasonId: undefined,
  selectSeason: () => undefined,
  isPending: false,
}

interface SeasonContextValue {
  seasons: Season[]
  /** Mùa hiệu lực đã resolve từ URL (hoặc mặc định) — null khi chưa có mùa nào. */
  season: Season | null
  seasonId?: string
  /** Đổi mùa: ghi `?season=` lên URL (`undefined` = bỏ chọn). */
  selectSeason: (seasonId?: string) => void
  isPending: boolean
}

const SeasonContext = createContext<SeasonContextValue | null>(null)

export function SeasonProvider({
  children,
  scoped = true,
}: {
  children: ReactNode
  /** false = role không có khung chọn mùa (PARISH) → context trả seasonId rỗng để
   *  các trang giữ hành vi cũ (xem tất cả mùa). */
  scoped?: boolean
}) {
  const { data: seasons = [], isPending } = useSeasons()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedId = searchParams.get('season') ?? undefined

  const season = useMemo(() => {
    if (!seasons.length) return null
    const requested = requestedId ? seasons.find((s) => s.id === requestedId) : undefined
    if (requested) return requested
    return [...seasons].sort(
      (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] || b.year - a.year,
    )[0]
  }, [seasons, requestedId])

  const selectSeason = useCallback(
    (seasonId?: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (seasonId) next.set('season', seasonId)
          else next.delete('season')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const value = useMemo<SeasonContextValue>(
    () => ({
      seasons,
      season,
      seasonId: scoped ? season?.id : undefined,
      selectSeason,
      isPending,
    }),
    [seasons, season, scoped, selectSeason, isPending],
  )

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
}

/**
 * Đọc mùa hiện tại. Trả giá trị rỗng khi không có provider — nhờ vậy page vẫn
 * render được trong unit test (test mount page trực tiếp, không qua AppShell).
 */
export function useSeasonContext(): SeasonContextValue {
  return useContext(SeasonContext) ?? EMPTY
}

/** Khung chọn mùa đặt trên header — hiện cho Ban hành giáo / Trưởng khu / Vật tư. */
export function SeasonSelect() {
  const { t } = useTranslation()
  const { seasons, season, selectSeason, isPending } = useSeasonContext()

  if (isPending) return null
  if (!seasons.length) {
    return <span className="lbl-mono text-muted-foreground">{t('season.none')}</span>
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="size-4 shrink-0 text-primary" aria-hidden />
      <span className="lbl-mono hidden lg:inline">{t('season.label')}</span>
      <select
        aria-label={t('season.label')}
        value={season?.id ?? ''}
        onChange={(e) => selectSeason(e.target.value || undefined)}
        className="h-9 max-w-52 rounded-md border border-border bg-card px-2 text-sm font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {t('season.option', { year: s.year, name: s.name })}
          </option>
        ))}
      </select>
      {season ? <StatusTag status={season.status} className="hidden sm:inline-flex" /> : null}
    </div>
  )
}
