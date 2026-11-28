// Ghi nhận quyên góp vật tư đã nhận (POST /api/v1/donations).
// PARISH (web COMMUNITY) có thể chọn đích "Kho tổng giáo xứ" (workAreaId = null);
// MO chỉ ghi được cho khu được giao.
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Quyên góp — Ghi nhận trực tiếp".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'
import { useMaterialCatalog } from '@/features/materials/api'
import { useDonors } from '@/features/donors/api'
import { useParishDonors } from '@/features/warehouse/api'
import { useRecordDirectDonation } from '../api'

const FLD = 'font-mono text-[10.5px] font-semibold uppercase tracking-[1px] text-[#5C7468] normal-case'
const FIELD =
  'h-[34px] w-full rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] text-[10.5px] text-[#0B2E1F] focus-visible:outline-none focus-visible:border-[#0A5C36]'

interface LineState {
  materialId: string
  receivedQuantity: string
  unusableQuantity: string
}

export function DirectDonationDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const record = useRecordDirectDonation()
  const isParish = user?.role === 'COMMUNITY'
  const { data: parishDonors = [] } = useParishDonors(undefined, { enabled: isParish })
  const { data: officerDonors = [] } = useDonors(undefined, { enabled: !isParish })
  const donors = isParish ? parishDonors : officerDonors
  const { data: seasons = [] } = useSeasons()
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100, status: 'ACTIVE' })
  const materials = catalogResult?.data ?? []

  const [donorId, setDonorId] = useState('')
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '')
  const [destination, setDestination] = useState<'PARISH' | 'AREA'>(
    isParish ? 'PARISH' : 'AREA',
  )
  const [workAreaId, setWorkAreaId] = useState('')
  const { data: areas = [] } = useAreas(seasonId ? [seasonId] : undefined)
  const [lines, setLines] = useState<LineState[]>([{ materialId: '', receivedQuantity: '1', unusableQuantity: '0' }])
  const [note, setNote] = useState('')

  const updateLine = (index: number, patch: Partial<LineState>) =>
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)))

  const submit = async () => {
    try {
      await record.mutateAsync({
        donorId,
        type: 'MATERIAL',
        seasonId,
        workAreaId: destination === 'PARISH' ? null : workAreaId || null,
        items: lines
          .filter((line) => line.materialId)
          .map((line) => ({
            materialId: line.materialId,
            receivedQuantity: Number(line.receivedQuantity),
            unusableQuantity: Number(line.unusableQuantity || 0),
          })),
        note: note.trim() || null,
      })
      toast(t('features.donations.created', { name: t('features.donations.selfDonor') }))
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label={t('common.cancel')} className="absolute inset-0 bg-[#06281B59]" onClick={onClose} />
      <section className="relative flex max-h-[86vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[18px] border border-[#E3EAE0] bg-white shadow-[0px_24px_60px_#06281B40]">
        <header className="flex w-full items-start justify-between gap-3 px-[18px] pb-3 pt-4">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[16px] font-extrabold tracking-[-0.3px] text-[#0B2E1F]">{t('features.donations.directTitle')}</span>
            <span className="text-[10.5px] text-[#8AA298]">
              {t('features.donations.directSub', { defaultValue: 'Ghi nhận khi vật tư thực sự về đến khu' })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[#F6F8F4] text-[#6B8175] transition-colors hover:bg-[#EAF0E6]"
          >
            <X className="size-[13px]" aria-hidden />
          </button>
        </header>
        <div className="h-px w-full bg-[#ECF1E9]" />

        <div className="flex min-h-0 flex-1 flex-col gap-[10px] overflow-y-auto px-[18px] py-[14px]">
          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.donor')}</span>
            <select
              aria-label={t('features.donations.donor')}
              className={FIELD}
              value={donorId}
              onChange={(event) => setDonorId(event.target.value)}
            >
              <option value="">{t('features.donations.selectDonor')}</option>
              {donors.map((donor) => (
                <option key={donor.id} value={donor.id}>
                  {donor.donorName}
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.season')}</span>
            <select
              aria-label={t('features.donations.season')}
              className={FIELD}
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
            >
              <option value="">{t('features.donations.seasonRequired')}</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.destination')}</span>
            <select
              aria-label={t('features.donations.destination')}
              className={FIELD}
              value={destination}
              onChange={(event) => setDestination(event.target.value as 'PARISH' | 'AREA')}
            >
              {isParish && <option value="PARISH">{t('features.donations.destinationParish')}</option>}
              <option value="AREA">{t('features.donations.destinationArea')}</option>
            </select>
          </label>

          {destination === 'AREA' && (
            <label className="flex w-full flex-col gap-1">
              <span className={FLD}>{t('features.allocations.area')}</span>
              <select
                aria-label={t('features.allocations.area')}
                className={FIELD}
                value={workAreaId}
                onChange={(event) => setWorkAreaId(event.target.value)}
              >
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex w-full flex-col gap-2">
            <span className={FLD}>{t('features.donations.materials')}</span>
            {lines.map((line, index) => (
              <div key={index} className="flex w-full items-end gap-2">
                <select
                  aria-label={t('features.donations.material')}
                  className={cn(FIELD, 'min-w-0 flex-1')}
                  value={line.materialId}
                  onChange={(event) => updateLine(index, { materialId: event.target.value })}
                >
                  <option value="">{t('features.donations.material')}</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.code} - {material.name} ({material.unit})
                    </option>
                  ))}
                </select>
                <input
                  aria-label={t('features.donations.received')}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.receivedQuantity}
                  onChange={(event) => updateLine(index, { receivedQuantity: event.target.value })}
                  placeholder={t('features.donations.received')}
                  className={cn(FIELD, 'w-[86px] shrink-0 font-mono')}
                />
                <input
                  aria-label={t('features.donations.unusable')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unusableQuantity}
                  onChange={(event) => updateLine(index, { unusableQuantity: event.target.value })}
                  placeholder={t('features.donations.unusable')}
                  className={cn(FIELD, 'w-[86px] shrink-0 font-mono')}
                />
                <button
                  type="button"
                  aria-label={t('common.remove')}
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
                  className="grid size-[30px] h-[34px] shrink-0 place-items-center rounded-[8px] bg-[#FBEDEA] text-[#A33F37] transition-colors hover:bg-[#F7DFD9] disabled:opacity-45"
                >
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines((current) => [...current, { materialId: '', receivedQuantity: '1', unusableQuantity: '0' }])}
              className="flex w-fit items-center gap-[6px] px-0 py-0.5 text-[10px] font-bold text-[#0A5C36] hover:underline"
            >
              <Plus className="size-[11px]" aria-hidden />
              {t('features.donations.addMaterial')}
            </button>
          </div>

          <label className="flex w-full flex-col gap-1">
            <span className={FLD}>{t('features.donations.note')}</span>
            <input
              aria-label={t('features.donations.note')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('features.donations.notePlaceholder', { defaultValue: 'Ghi chú khi nhận quà…' })}
              className={FIELD}
            />
          </label>
        </div>

        <footer className="flex w-full items-center justify-end gap-2 border-t border-[#ECF1E9] px-[18px] py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center rounded-[9px] border border-[#E1E9DC] bg-white px-[15px] text-[11.5px] font-semibold text-[#5C7468] transition-colors hover:bg-[#F4F8F1]"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={record.isPending || !donorId || !seasonId}
            className="flex h-8 items-center rounded-[9px] bg-[#0A5C36] px-[15px] text-[11.5px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
          >
            {t('common.save')}
          </button>
        </footer>
      </section>
    </div>
  )
}
