// Tab "Nhu cầu vật tư" của khu vực (trong ngăn kéo chi tiết):
//   E1: GET /api/v1/work-areas/{id}/material-requirements
//   E4: GET /api/v1/work-areas/{id}/shortages
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Khu vực — Nhu cầu vật tư (trống/thiếu hụt)".
import { useTranslation } from 'react-i18next'
import { useWorkAreaRequirements, useWorkAreaShortages } from '@/features/materials/api'
import { cn } from '@/lib/utils'

interface AreaMaterialsTabProps {
  workAreaId: string
}

interface Row {
  key: string
  code: string
  name: string
  unit: string
  required: number
  available: number
  allocated: number
  shortage: number
}

export function AreaMaterialsTab({ workAreaId }: AreaMaterialsTabProps) {
  const { t } = useTranslation()

  const { data: requirements = [], isPending: isReqPending } = useWorkAreaRequirements(workAreaId)
  const { data: shortages = [], isPending: isShortPending } = useWorkAreaShortages(workAreaId)

  const pending = isReqPending || isShortPending

  const rows: Row[] =
    shortages.length > 0
      ? shortages.map((s) => ({
          key: s.materialId,
          code: s.materialCode,
          name: s.materialName,
          unit: s.unit,
          required: s.required,
          available: s.confirmedAvailable,
          allocated: s.allocated,
          shortage: s.shortage,
        }))
      : requirements.map((r) => ({
          key: r.id,
          code: r.materialCode,
          name: r.materialName,
          unit: r.unit,
          required: r.requiredQuantity,
          available: r.existingQuantity,
          allocated: 0,
          shortage: Math.max(0, r.requiredQuantity - r.existingQuantity),
        }))

  const shortageCount = rows.filter((row) => row.shortage > 0).length
  const reqCount = rows.length

  const metrics = (row: Row) => [
    { key: 'required', label: t('features.shortages.colRequired'), value: row.required },
    { key: 'available', label: t('features.shortages.colAvailable'), value: row.available },
    { key: 'allocated', label: t('features.shortages.colAllocated'), value: row.allocated },
    {
      key: 'shortage',
      label: t('features.shortages.colShortageShort', { defaultValue: 'Thiếu' }),
      value: row.shortage,
      tone: row.shortage > 0 ? 'text-[#A33F37]' : '',
    },
  ]

  return (
    <div className="flex w-full flex-col gap-[14px]">
      {reqCount > 0 && (
        <div
          className={cn(
            'flex w-full items-center gap-[9px] rounded-[12px] border px-3 py-[10px]',
            shortageCount > 0
              ? 'border-[#EECEC5] bg-[#FDF0EC]'
              : 'border-[#EDDFBB] bg-[#FDF6E7]',
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 text-[10.5px] font-semibold leading-[15px]',
              shortageCount > 0 ? 'text-[#8F3B32]' : 'text-[#8A6412]',
            )}
          >
            {shortageCount > 0
              ? t('features.shortages.summaryCount', { count: shortageCount })
              : t('features.shortages.summaryEnough', {
                  defaultValue: 'Đã đủ vật tư cho toàn bộ {{count}} mặt hàng',
                  count: reqCount,
                })}
          </span>
        </div>
      )}

      <div className="flex w-full items-start gap-[10px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-[12px] border border-[#E3EAE0] bg-white px-[13px] py-[11px]">
          <span className="text-[10px] text-[#96AAA0]">
            {t('features.requirements.tabTitle', { defaultValue: 'Nhu cầu vật tư' })}
          </span>
          <span className="font-mono text-[20px] font-bold leading-none text-[#0B2E1F]">{reqCount}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-[12px] border border-[#E3EAE0] bg-white px-[13px] py-[11px]">
          <span className="text-[10px] text-[#96AAA0]">
            {t('features.shortages.alertHead', { defaultValue: 'Cảnh báo thiếu hụt' })}
          </span>
          <span
            className={cn(
              'font-mono text-[20px] font-bold leading-none',
              shortageCount > 0 ? 'text-[#B4483F]' : 'text-[#0B2E1F]',
            )}
          >
            {shortageCount}
          </span>
        </div>
      </div>

      {pending ? (
        <p className="py-8 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center gap-[9px] rounded-[14px] border border-dashed border-[#E3EAE0] bg-[#FAFBF8] px-5 py-8">
          <p className="w-full max-w-[300px] text-center text-[11px] leading-[17px] text-[#A3B4A9]">
            {t('features.requirements.emptyArea', { defaultValue: 'Khu vực này chưa khai báo nhu cầu vật tư nào.' })}
          </p>
          <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E7EEE3] bg-[#F7F9F5] px-[10px] py-[5px] text-[10px] font-semibold text-[#6B8175]">
            {t('features.requirements.declare', { defaultValue: 'Khai báo nhu cầu' })}
          </span>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
            {t('features.requirements.listHead', { defaultValue: 'Vật tư thiếu hụt & đã đủ' })}
          </span>
          <ul className="flex w-full flex-col gap-[7px]">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex w-full flex-col gap-[7px] rounded-[10px] border border-[#E9EFE6] bg-white px-[11px] py-[9px]"
              >
                <div className="flex w-full items-center justify-between gap-[10px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex w-fit shrink-0 items-center rounded-[6px] bg-[#F3F6F1] px-[6px] py-[3px] font-mono text-[8.5px] font-bold tracking-[0.6px] text-[#52705F]">
                      {row.code}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[11px] font-bold text-[#0B2E1F]">{row.name}</span>
                      <span className="font-mono text-[8.5px] text-[#A3B4A9]">{row.unit}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'flex w-fit shrink-0 items-center rounded-full border px-2 py-[3px] text-[9.5px] font-semibold',
                      row.shortage > 0
                        ? 'border-[#EFCFC7] bg-[#FBEDEA] text-[#A33F37]'
                        : 'border-[#CBE3D2] bg-[#E9F4EC] text-[#1B6B45]',
                    )}
                  >
                    {row.shortage > 0
                      ? t('features.shortages.badgeShortage', { count: row.shortage, unit: row.unit })
                      : t('features.shortages.badgeSufficient')}
                  </span>
                </div>
                <div className="flex w-full items-start">
                  {metrics(row).map((metric) => (
                    <div key={metric.key} className="flex min-w-0 flex-1 flex-col gap-px">
                      <span className="font-mono text-[7.5px] font-semibold uppercase tracking-[0.6px] text-[#B0BFB4]">
                        {metric.label}
                      </span>
                      <span className={cn('font-mono text-[11px] font-bold text-[#233A2E]', metric.tone)}>
                        {metric.value}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
