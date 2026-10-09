// Dải tiến độ mùa Giáng sinh (Advent Progress Strip): % ngày đã trôi qua
// của mùa đang chạy — Recharts RadialBar nhỏ kèm nhãn % + ngày Bắt đầu →
// Khánh thành. Khuôn RadialBar giống ChecklistPage (màu moss trên nền hair).
import { RadialBar, RadialBarChart } from 'recharts'
import { useTranslation } from 'react-i18next'
import { viDate } from '@/lib/format'
import type { Season } from '@/types'

// % ngày đã trôi: 0 trước startDate, 100 sau endDate, giữa chừng tuyến tính
// theo giờ UTC — demo deterministic, không lệch múi giờ.
export function seasonElapsedPercent(s: Season, now: Date): number {
  const start = Date.parse(`${s.startDate}T00:00:00Z`)
  const end = Date.parse(`${s.endDate}T23:59:59Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return Math.max(0, Math.min(100, Math.round(((now.getTime() - start) / (end - start)) * 100)))
}

export function AdventProgress({ season }: { season: Season }) {
  const { t } = useTranslation()
  // Mốc chạy demo = cuối dữ liệu chấm công (2026-11-28), không lấy now() thật
  // để % luôn khớp seed bất kể ngày hệ thống.
  const now = new Date('2026-11-28T12:00:00Z')
  const percent = seasonElapsedPercent(season, now)

  return (
    <section
      aria-label={t('features.dashboards.seasonProgress')}
      data-percent={percent}
      className="flex items-center gap-5 rounded-card border border-border bg-card p-5 shadow-card"
    >
      <div className="relative size-20 shrink-0" role="img" aria-hidden>
        <RadialBarChart
          width={80}
          height={80}
          innerRadius="68%"
          outerRadius="100%"
          data={[{ value: percent, fill: '#0A5C36' }]}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar dataKey="value" background={{ fill: '#E9ECEF' }} cornerRadius={10} />
        </RadialBarChart>
        <p className="tabular absolute inset-0 grid place-items-center text-sm font-extrabold text-foreground">
          {percent}%
        </p>
      </div>
      <div className="min-w-0">
        <p className="lbl-mono">{t('features.dashboards.seasonProgress')}</p>
        <h2 className="mt-1 text-lg font-extrabold leading-tight text-foreground">
          {t('features.dashboards.seasonTitle', { year: season.year })}
        </h2>
        <p className="tabular mt-1 text-sm font-semibold text-muted-foreground">
          {t('features.dashboards.seasonElapsed', { percent, start: viDate(season.startDate), end: viDate(season.endDate) })}
        </p>
      </div>
    </section>
  )
}
