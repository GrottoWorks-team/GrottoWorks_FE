// Chọn giáo xứ đang xem — chỉ dành cho ADMIN (không gắn một giáo xứ nào).
// Dùng chung cho màn "Giáo xứ & cộng đoàn" và trang con "Bản đồ giáo xứ".
import { useTranslation } from 'react-i18next'
import { Church } from 'lucide-react'
import type { ParishScope } from '../hooks'

// Số đo lấy đúng từ bản thiết kế Pen (KHOA.pen) — hộp chọn giáo xứ ở tiêu đề trang.
const SELECT_CLS =
  'h-[36px] bg-transparent pr-[10px] text-[12px] font-semibold text-[#2C463A] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export function ParishSwitcher({ scope }: { scope: ParishScope }) {
  const { t } = useTranslation()
  if (!scope.canPickParish) return null

  return (
    <label className="inline-flex h-[38px] items-center gap-[8px] rounded-[11px] border border-[#DBE5D6] bg-white pl-[12px]">
      <Church className="size-[15px] shrink-0 text-[#0A5C36]" aria-hidden />
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
