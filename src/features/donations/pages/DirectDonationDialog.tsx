// Ghi nhận quyên góp vật tư đã nhận (POST /api/v1/donations).
// PARISH (web COMMUNITY) có thể chọn đích "Kho tổng giáo xứ" (workAreaId = null);
// MO chỉ ghi được cho khu được giao.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'
import { useMaterialCatalog } from '@/features/materials/api'
import { useDonors } from '@/features/donors/api'
import { useParishDonors } from '@/features/warehouse/api'
import { useRecordDirectDonation } from '../api'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

interface LineState {
  materialId: string
  receivedQuantity: string
  unusableQuantity: string
}

export function DirectDonationDialog({ onClose }: { onClose: () => void }) {
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
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={t('features.donations.directTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={record.isPending || !donorId || !seasonId}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="direct-donor">{t('features.donations.donor')}</Label>
            <select id="direct-donor" className={SELECT_CLS} value={donorId} onChange={(event) => setDonorId(event.target.value)}>
              <option value="">{t('features.donations.selectDonor')}</option>
              {donors.map((donor) => (
                <option key={donor.id} value={donor.id}>
                  {donor.donorName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="direct-season">{t('features.donations.season')}</Label>
            <select id="direct-season" className={SELECT_CLS} value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>
              <option value="">{t('features.donations.seasonRequired')}</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name} ({season.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="direct-destination">{t('features.donations.destination')}</Label>
            <select
              id="direct-destination"
              className={SELECT_CLS}
              value={destination}
              onChange={(event) => setDestination(event.target.value as 'PARISH' | 'AREA')}
            >
              {isParish && <option value="PARISH">{t('features.donations.destinationParish')}</option>}
              <option value="AREA">{t('features.donations.destinationArea')}</option>
            </select>
          </div>
          {destination === 'AREA' && (
            <div>
              <Label htmlFor="direct-area">{t('features.allocations.area')}</Label>
              <select id="direct-area" className={SELECT_CLS} value={workAreaId} onChange={(event) => setWorkAreaId(event.target.value)}>
                <option value="">{t('features.tasks.selectPlaceholder')}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('features.donations.materials')}</Label>
          {lines.map((line, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_110px_110px_auto]">
              <select
                className={SELECT_CLS + ' mt-0'}
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
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={line.receivedQuantity}
                onChange={(event) => updateLine(index, { receivedQuantity: event.target.value })}
                placeholder={t('features.donations.received')}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={line.unusableQuantity}
                onChange={(event) => updateLine(index, { unusableQuantity: event.target.value })}
                placeholder={t('features.donations.unusable')}
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={lines.length === 1}
                onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
              >
                {t('common.remove')}
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { materialId: '', receivedQuantity: '1', unusableQuantity: '0' }])}
          >
            <Plus className="size-4" />
            {t('features.donations.addMaterial')}
          </Button>
        </div>

        <div>
          <Label htmlFor="direct-note">{t('features.donations.note')}</Label>
          <Textarea id="direct-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}
