// Yêu cầu hỗ trợ chéo cộng đoàn (/leader/support, /community/support).
// BE hiện chỉ có list/create/get/update: chưa có publish, response, duyệt member
// hay chuyển vật tư → UI dừng ở bước tạo và hiển thị ghi chú.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useScopedAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useSupportRequests } from '../api'
import { SupportFormDialog } from './SupportFormDialog'
import type { SupportRequest } from '@/types'
import { viDate } from '@/lib/format'

export default function SupportListPage() {
  const { t } = useTranslation()
  const { data: areas = [] } = useScopedAreas()
  const { data: materials = [] } = useMaterials()
  const { data: requests = [], isPending } = useSupportRequests()
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<SupportRequest | null>(null)

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'
  const materialName = (id: string) => materials.find((m) => m.id === id)?.name ?? id

  const positionsOf = (r: SupportRequest) =>
    r.positions.map((p) => `${p.name} ×${p.requiredVolunteerCount}`).join(', ') || '—'

  const materialsOf = (r: SupportRequest) =>
    r.materials.map((m) => `${materialName(m.materialId)} ×${m.requiredQuantity}`).join(', ') || '—'

  const columns = useMemo(
    () => [
      { key: 'area', header: t('features.support.area'), render: (r: SupportRequest) => areaName(r.workAreaId) },
      {
        key: 'kind',
        header: t('features.support.kind'),
        render: (r: SupportRequest) => t(`features.support.type.${r.supportType}`),
      },
      { key: 'detail', header: t('features.support.detail'), render: (r: SupportRequest) => <span className="text-sm">{r.description || '—'}</span> },
      { key: 'positions', header: t('features.support.positions'), render: positionsOf },
      { key: 'materials', header: t('features.support.materials'), render: materialsOf },
      {
        key: 'deadline',
        header: t('features.support.deadline'),
        render: (r: SupportRequest) => <span className="tabular">{r.deadline ? viDate(r.deadline) : '—'}</span>,
      },
      { key: 'status', header: t('common.status'), render: (r: SupportRequest) => <StatusTag status={r.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: SupportRequest) => (
          <Button variant="ghost" size="icon" aria-label={t('features.support.detail')} onClick={() => setDetail(r)}>
            <Eye className="size-4" />
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, areas, materials],
  )

  return (
    <div>
      <PageHeader
        title={t('features.support.title')}
        sub={t('features.support.sub')}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t('features.support.create')}
          </Button>
        }
      />

      <p className="mb-4 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        {t('features.support.apiMissing')}
      </p>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={requests} columns={columns} emptyText={t('features.support.empty')} />
      )}

      {creating && <SupportFormDialog open onClose={() => setCreating(false)} />}

      {detail && (
        <Dialog open onClose={() => setDetail(null)} title={t('features.support.detailTitle')}>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">{t('features.support.area')}:</span> {areaName(detail.workAreaId)}</p>
            <p><span className="font-semibold">{t('features.support.kind')}:</span> {t(`features.support.type.${detail.supportType}`)}</p>
            <p><span className="font-semibold">{t('features.support.detail')}:</span> {detail.description || '—'}</p>
            <p><span className="font-semibold">{t('features.support.positions')}:</span> {positionsOf(detail)}</p>
            <p><span className="font-semibold">{t('features.support.materials')}:</span> {materialsOf(detail)}</p>
            <p><span className="font-semibold">{t('common.status')}:</span> <StatusTag status={detail.status} /></p>
          </div>
        </Dialog>
      )}
    </div>
  )
}