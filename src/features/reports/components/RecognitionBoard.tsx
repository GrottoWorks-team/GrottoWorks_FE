// Bảng vinh danh (RecognitionBoard): top người đóng góp theo điểm giảm dần,
// huy chương vàng/bạc/đồng (gold #EEB902 theo brief) — cột: hạng, tên
// (Avatar), giáo khu, điểm, giờ công (tabular), số quà tặng + nhiệm vụ hoàn
// thành. Dữ liệu join client-side từ users/timesheets/donations/tasks.
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Award } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import type { ContributorRow } from '../api'

// Huy chương theo hạng: 1 vàng #EEB902, 2 bạc, 3 đồng; còn lại số soft.
const MEDAL = [
  'bg-[#EEB902]/15 text-[#EEB902]',
  'bg-muted-foreground/15 text-muted-foreground',
  'bg-primary/15 text-primary',
] as const

export function RecognitionBoard({ rows }: { rows: ContributorRow[] }) {
  const { t } = useTranslation()

  const sorted = useMemo(() => [...rows].sort((a, b) => b.points - a.points), [rows])

  if (!sorted.length) return <EmptyState text={t('features.reports.recognitionEmpty')} />

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="lbl-mono w-14 px-4 py-3 text-center">
              #
            </th>
            <th scope="col" className="lbl-mono px-4 py-3">
              {t('features.volunteers.name')}
            </th>
            <th scope="col" className="lbl-mono px-4 py-3">
              {t('features.volunteers.community')}
            </th>
            <th scope="col" className="lbl-mono px-4 py-3 text-right">
              {t('features.volunteers.points')}
            </th>
            <th scope="col" className="lbl-mono px-4 py-3 text-right">
              {t('features.volunteers.hours')}
            </th>
            <th scope="col" className="lbl-mono px-4 py-3 text-right">
              {t('features.reports.contributions')}
            </th>
            <th scope="col" className="lbl-mono px-4 py-3 text-right">
              {t('features.reports.tasksDone')}
            </th>
          </tr>
        </thead>
        <tbody className="stagger">
          {sorted.map((u, i) => (
            <tr
              key={u.id}
              style={{ '--d': i } as CSSProperties}
              className="border-b border-border/60 transition-[transform,box-shadow] last:border-0"
            >
              <td className="px-4 py-3 text-center">
                <span
                  aria-label={t('features.reports.rank', { n: i + 1 })}
                  className={cn(
                    'inline-grid size-7 place-items-center rounded-full font-mono text-[11px] font-extrabold',
                    i < 3 ? MEDAL[i] : 'text-muted-foreground',
                  )}
                >
                  {i < 3 ? <Award className="size-4" aria-hidden /> : i + 1}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <Avatar name={u.name} hue={u.avatarHue} size="sm" />
                  {u.name}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{u.communityName}</td>
              <td className="tabular px-4 py-3 text-right font-extrabold text-foreground">
                {u.points.toLocaleString()}
              </td>
              <td className="tabular px-4 py-3 text-right">{u.hours.toFixed(1)}</td>
              <td className="tabular px-4 py-3 text-right">{u.contributions || '—'}</td>
              <td className="tabular px-4 py-3 text-right">{u.tasksDone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
