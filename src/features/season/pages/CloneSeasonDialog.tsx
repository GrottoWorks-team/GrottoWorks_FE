// "Tạo mùa mới từ mùa cũ" — 1 form, 1 request `POST /api/v1/seasons/{id}/clone`.
// Không lặp POST /work-areas rồi PUT leader/officer cho từng khu (22 request với 7 khu,
// không nguyên tử). Toàn bộ việc copy nằm trong 1 transaction ở BE.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Copy, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useSeasons, useCloneSeason } from '../api'
import { useSeasonAreas } from '@/features/areas/api'
import type { Season } from '@/types'

const SELECT_CLASS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'

const shiftYear = (date: string, years: number): string => {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CloneSeasonDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: seasons = [] } = useSeasons()
  const clone = useCloneSeason()

  // Mặc định chọn mùa gần nhất (danh sách đã sort mới → cũ).
  const [sourceId, setSourceId] = useState(() => seasons[0]?.id ?? '')
  const source: Season | undefined = useMemo(
    () => seasons.find((season) => season.id === sourceId),
    [seasons, sourceId],
  )

  const { data: sourceAreas = [] } = useSeasonAreas(sourceId || undefined)

  const [name, setName] = useState('')
  const [year, setYear] = useState(new Date().getFullYear() + 1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [dateShift, setDateShift] = useState<'NONE' | 'SAME_DAY_OF_SEASON'>(
    'SAME_DAY_OF_SEASON',
  )
  const [copyAssignments, setCopyAssignments] = useState(true)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  // Đổi mùa nguồn → nạp lại mặc định (tên, năm, ngày, chọn hết khu vực).
  useEffect(() => {
    if (!source) return
    const nextYear = source.year + 1
    setName(t('features.season.cloneDefaultName', { year: nextYear }))
    setYear(nextYear)
    setStartDate(shiftYear(source.startDate, 1))
    setEndDate(shiftYear(source.endDate, 1))
    setBudget(String(source.budget ?? 0))
  }, [source, t])

  useEffect(() => {
    setSelectedAreas(sourceAreas.map((area) => area.id))
  }, [sourceAreas])

  const toggleArea = (id: string) =>
    setSelectedAreas((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )

  const canSubmit =
    Boolean(sourceId) &&
    name.trim().length > 0 &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    startDate < endDate &&
    selectedAreas.length > 0 &&
    !clone.isPending

  const onSubmit = async () => {
    if (!source) return
    try {
      const result = await clone.mutateAsync({
        sourceSeasonId: source.id,
        name: name.trim(),
        year,
        startDate,
        endDate,
        budget: budget === '' ? null : Number(budget),
        description: source.description ?? null,
        dateShift,
        copyAssignments,
        areas: selectedAreas.map((id) => ({ sourceWorkAreaId: id })),
      })
      toast(
        t('features.season.cloneSuccess', {
          year,
          count: result.areas.length,
        }),
      )
      if (result.warnings.length > 0) {
        // Phân công không còn hợp lệ (nghỉ / đổi role / khác giáo xứ) → báo để trưởng khu gán lại.
        toast(t('features.season.cloneWarnings', { count: result.warnings.length }), 'alert')
      }
      onClose()
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined
      const message =
        code === 'SEASON_NAME_CONFLICT'
          ? t('features.season.nameConflict')
          : code === 'SEASON_YEAR_CONFLICT'
            ? t('features.season.yearConflict')
            : code === 'SEASON_DATE_INVALID'
              ? t('features.season.endAfterStart')
              : code === 'SOURCE_SEASON_NOT_FOUND'
                ? t('features.season.cloneSourceMissing')
                : e instanceof Error
                  ? e.message
                  : t('common.error')
      toast(message, 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t('features.season.cloneTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            <Copy className="size-4" />
            {clone.isPending ? t('common.save') : t('features.season.cloneSubmit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-card border border-brand-pine/15 bg-brand-pineLight px-3 py-2 text-xs leading-relaxed text-brand-pine">
          {t('features.season.cloneHint')}
        </p>

        <div>
          <Label htmlFor="clone-source">{t('features.season.cloneSource')}</Label>
          <select
            id="clone-source"
            className={SELECT_CLASS}
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
          >
            <option value="">{t('features.season.cloneSourcePlaceholder')}</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name} · {season.year} · {t(`status.${season.status}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="clone-name">{t('features.season.name')}</Label>
            <Input
              id="clone-name"
              value={name}
              maxLength={150}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="clone-year">{t('features.season.year')}</Label>
            <Input
              id="clone-year"
              type="number"
              min={2026}
              max={2035}
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="clone-start">{t('features.season.startDate')}</Label>
            <Input
              id="clone-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="clone-end">{t('features.season.endDate')}</Label>
            <Input
              id="clone-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="clone-budget">{t('features.season.budget')}</Label>
          <Input
            id="clone-budget"
            type="number"
            min={0}
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </div>

        <div className="space-y-2 rounded-card border border-border p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t('features.season.cloneAreas')}
          </p>
          {sourceAreas.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('features.season.cloneNoAreas')}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {sourceAreas.map((area) => (
                <li key={area.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-background">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selectedAreas.includes(area.id)}
                      onChange={() => toggleArea(area.id)}
                    />
                    <span className="flex-1 truncate text-foreground">{area.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t(`status.${area.status}`)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            {t('features.season.cloneSelected', {
              selected: selectedAreas.length,
              total: sourceAreas.length,
            })}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="clone-shift">{t('features.season.cloneDateShift')}</Label>
            <select
              id="clone-shift"
              className={SELECT_CLASS}
              value={dateShift}
              onChange={(event) =>
                setDateShift(event.target.value as 'NONE' | 'SAME_DAY_OF_SEASON')
              }
            >
              <option value="SAME_DAY_OF_SEASON">{t('features.season.cloneShiftSame')}</option>
              <option value="NONE">{t('features.season.cloneShiftNone')}</option>
            </select>
          </div>
          <label className="mt-6 flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              checked={copyAssignments}
              onChange={(event) => setCopyAssignments(event.target.checked)}
            />
            <span>
              {t('features.season.cloneAssignments')}
              <span className="block text-[11px] text-muted-foreground">
                {t('features.season.cloneAssignmentsHint')}
              </span>
            </span>
          </label>
        </div>

        {!canSubmit && selectedAreas.length === 0 && sourceAreas.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <TriangleAlert className="size-3.5" />
            {t('features.season.cloneNeedArea')}
          </p>
        )}

        {source && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarPlus className="size-3.5" />
            {t('features.season.cloneSummary', {
              source: source.name,
              year: source.year,
              target: year,
            })}
          </p>
        )}
      </div>
    </Dialog>
  )
}
