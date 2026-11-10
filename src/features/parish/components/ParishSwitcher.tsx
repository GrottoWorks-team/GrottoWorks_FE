// Chọn giáo xứ đang xem — chỉ dành cho ADMIN (không gắn một giáo xứ nào).
// Dùng chung cho màn "Giáo xứ & cộng đoàn" và trang con "Bản đồ giáo xứ".
import { useTranslation } from 'react-i18next'
import { Church } from 'lucide-react'
import type { ParishScope } from '../hooks'

const SELECT_CLS =
  'h-10 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

export function ParishSwitcher({ scope }: { scope: ParishScope }) {
  const { t } = useTranslation()
  if (!scope.canPickParish) return null

  return (
    <label className="inline-flex items-center gap-2">
      <Church className="size-4 shrink-0 text-brand-pine" aria-hidden />
      <span className="sr-only">{t('features.parish.selectParish')}</span>
      <select
        aria-label={t('features.parish.selectParish')}
        className={SELECT_CLS}
        value={scope.parishId}
        onChange={(e) => scope.setParish(e.target.value)}
        disabled={scope.isPending || scope.parishes.length === 0}
      >
        {scope.isPending && <option value="">{t('common.loading')}</option>}
        {scope.parishes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  )
}
