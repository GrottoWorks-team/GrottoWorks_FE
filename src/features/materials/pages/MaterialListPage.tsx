// Sổ vật tư theo khu (route /material-officer/materials): officer xem khu mình phụ
// trách (1 khu → khóa; nhiều khu → chọn), committee/parish chọn khu hoặc tất
// cả. Ledger đúng demo đã duyệt + filter chips theo status, search, pagination.
// Xuất CSV qua exportCsv (BOM + ';').
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import { useMaterials } from '../api'
import { MaterialFormDialog } from './MaterialFormDialog'
import { shortage } from '@/types'
import type { Material } from '@/types'

const SELECT_CLS =
  'flex h-10 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function MaterialListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: users = [] } = useUsers()

  // Officer: khu mình phụ trách; committee/parish: mọi khu (chọn hoặc tất cả).
  const myAreas =
    user?.role === 'MATERIAL_OFFICER' ? areas.filter((a) => a.officerId === user.id) : areas
  // 1 khu → khóa luôn (kể cả khi areas load xong sau render đầu); nhiều khu → chọn.
  const fixed = myAreas.length === 1 ? myAreas[0] : null
  const [picked, setPicked] = useState('')
  const areaId = fixed ? fixed.id : picked
  const { data: materials = [], isPending } = useMaterials(areaId || undefined)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)

  const buyerName = (id?: string) => users.find((u) => u.id === id)?.name ?? '—'
  const areaName = areas.find((a) => a.id === areaId)?.name

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.materials.name'),
        render: (m: Material) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{m.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {m.unit}
              </span>
            </div>
          </div>
        ),
      },
      { key: 'required', header: t('features.materials.required'), align: 'right' as const, render: (m: Material) => <span className="tabular font-medium">{m.required}</span> },
      { key: 'existing', header: t('features.materials.existing'), align: 'right' as const, render: (m: Material) => <span className="tabular text-muted-foreground">{m.existing}</span> },
      { key: 'purchased', header: t('features.materials.purchased'), align: 'right' as const, render: (m: Material) => <span className="tabular">{m.purchased}</span> },
      { key: 'donatedReceived', header: t('features.materials.donated'), align: 'right' as const, render: (m: Material) => <span className="tabular">{m.donatedReceived}</span> },
      {
        key: 'received',
        header: t('features.materials.received'),
        align: 'right' as const,
        render: (m: Material) => {
          const ratio = Math.min(100, Math.round((m.received / (m.required || 1)) * 100))
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="tabular font-semibold text-foreground">{m.received}</span>
              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-brand-pine transition-all"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: 'shortage',
        header: t('features.materials.shortageCol'),
        align: 'right' as const,
        render: (m: Material) => {
          const s = shortage(m)
          return s > 0 ? (
            <span className="tabular inline-flex items-center rounded-full bg-destructive/12 px-2.5 py-0.5 font-mono text-xs font-bold text-destructive">
              ✕ {s}
            </span>
          ) : (
            <span className="tabular inline-flex items-center rounded-full bg-brand-pine/12 px-2.5 py-0.5 font-mono text-xs font-bold text-brand-pine">
              ✓ Đủ
            </span>
          )
        },
      },
      { key: 'buyerId', header: t('features.materials.buyer'), render: (m: Material) => buyerName(m.buyerId) },
      { key: 'status', header: t('common.status'), render: (m: Material) => <StatusTag status={m.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (m: Material) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => {
                setEditing(m)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, users],
  )

  const onExport = () => {
    exportCsv(
      'grottoworks-vat-tu.csv',
      materials.map((m) => ({
        [t('features.materials.name')]: m.name,
        [t('features.materials.unit')]: m.unit,
        [t('features.materials.required')]: m.required,
        [t('features.materials.existing')]: m.existing,
        [t('features.materials.purchased')]: m.purchased,
        [t('features.materials.donated')]: m.donatedReceived,
        [t('features.materials.received')]: m.received,
        [t('features.materials.shortageCol')]: Math.max(0, shortage(m)),
        [t('features.materials.buyer')]: buyerName(m.buyerId),
        [t('common.status')]: t(`status.${m.status}`),
      })),
    )
    toast(t('features.materials.exported'))
  }

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (!myAreas.length) return <EmptyState text={t('features.materials.noArea')} />

  const n = (st: string) => materials.filter((m) => m.status === st).length

  return (
    <div>
      <PageHeader
        title={t('features.materials.title')}
        sub={t('features.materials.sub', { name: areaName ?? t('features.materials.allAreas') })}
        actions={
          <>
            {fixed ? null : (
              <select
                aria-label={t('features.materials.area')}
                className={SELECT_CLS}
                value={areaId}
                onChange={(e) => setPicked(e.target.value)}
              >
                <option value="">{t('features.materials.allAreas')}</option>
                {myAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" onClick={onExport} disabled={!materials.length}>
              <Download className="size-4" />
              {t('features.materials.export')}
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t('features.materials.create')}
            </Button>
          </>
        }
      />

      <div className="stagger mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div style={{ '--d': 0 } as CSSProperties}>
          <StatCard label={t('features.materials.stats.total')} value={materials.length} tone="ok" />
        </div>
        <div style={{ '--d': 1 } as CSSProperties}>
          <StatCard label={t('features.materials.stats.shortage')} value={n('SHORTAGE')} tone="alert" />
        </div>
        <div style={{ '--d': 2 } as CSSProperties}>
          <StatCard label={t('features.materials.stats.incoming')} value={n('INCOMING')} tone="warn" />
        </div>
        <div style={{ '--d': 3 } as CSSProperties}>
          <StatCard label={t('features.materials.stats.enough')} value={n('ENOUGH')} tone="ok" />
        </div>
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={materials}
          columns={columns}
          searchKeys={['name']}
          filters={[{ key: 'status', options: ['SHORTAGE', 'INCOMING', 'ENOUGH'] }]}
          emptyText={t('features.materials.empty')}
        />
      )}

      {formOpen && (
        <MaterialFormDialog
          material={editing}
          areaId={areaId || myAreas[0].id}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
