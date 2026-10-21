// Sổ cân đối tồn kho vật tư (/material-officer/inventory)
// D2: GET /api/v1/inventory (PARISH, LEADER, MO)
// D1: POST /api/v1/inventory/opening-stock (Dialog)
// D3: GET /api/v1/materials/{materialId}/allocation-history (Drawer)
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  History,
  Layers,
  Plus,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  useInventory,
  useMaterialCatalog,
  type InventoryBalanceDto,
} from '../api'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'
import { OpeningStockDialog } from './OpeningStockDialog'
import { MaterialHistoryDrawer } from './MaterialHistoryDrawer'

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function MaterialInventoryPage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const pageSize = 15

  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedWorkArea, setSelectedWorkArea] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')
  const [onlyShortage, setOnlyShortage] = useState(false)

  // Sub-dialog & Drawer state
  const [openingStockOpen, setOpeningStockOpen] = useState(false)
  const [historyTarget, setHistoryTarget] = useState<InventoryBalanceDto | null>(null)

  // Master data for filters
  const { data: seasons = [] } = useSeasons()
  const { data: areas = [] } = useAreas(selectedSeason ? [selectedSeason] : undefined)
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100 })
  const catalogMaterials = catalogResult?.data || []

  // Inventory balance data (D2)
  const {
    data: inventoryResult,
    isPending,
    isError,
    refetch,
  } = useInventory({
    page,
    size: pageSize,
    seasonId: selectedSeason || undefined,
    workAreaId: selectedWorkArea || undefined,
    materialId: selectedMaterial || undefined,
    onlyShortage: onlyShortage ? true : undefined,
  })

  const rows = inventoryResult?.data || []
  const pageInfo = inventoryResult?.page || {
    page: 1,
    size: pageSize,
    totalItems: 0,
    totalPages: 1,
  }

  // Summary figures
  const totalShortageCount = useMemo(() => {
    return rows.filter((r) => r.shortage > 0).length
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.inventory.title')}
        sub={t('features.inventory.sub')}
        actions={
          <Button
            onClick={() => setOpeningStockOpen(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            {t('features.inventory.openingStockBtn')}
          </Button>
        }
      />

      {/* Bộ lọc thanh công cụ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground ml-1" />

          {/* Lọc theo mùa */}
          <select
            className={SELECT_CLS}
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value)
              setPage(1)
            }}
          >
            <option value="">{t('features.inventory.allSeasons')}</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.year})
              </option>
            ))}
          </select>

          {/* Lọc theo khu vực */}
          <select
            className={SELECT_CLS}
            value={selectedWorkArea}
            onChange={(e) => {
              setSelectedWorkArea(e.target.value)
              setPage(1)
            }}
          >
            <option value="">{t('features.inventory.allWorkAreas')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name?.trim() || t('features.areas.areaFallback', { id: a.id.slice(0, 8) })}
              </option>
            ))}
          </select>

          {/* Lọc theo vật tư */}
          <select
            className={SELECT_CLS}
            value={selectedMaterial}
            onChange={(e) => {
              setSelectedMaterial(e.target.value)
              setPage(1)
            }}
          >
            <option value="">{t('features.inventory.allMaterials')}</option>
            {catalogMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} - {m.name}
              </option>
            ))}
          </select>

          {/* Toggle onlyShortage */}
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50">
            <input
              type="checkbox"
              checked={onlyShortage}
              onChange={(e) => {
                setOnlyShortage(e.target.checked)
                setPage(1)
              }}
              className="size-3.5 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className={`size-3.5 ${onlyShortage ? 'text-red-500' : 'text-muted-foreground'}`} />
              {t('features.inventory.onlyShortage')}
            </span>
          </label>
        </div>

        {totalShortageCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="size-3.5" />
            {t('features.inventory.shortageBadge', { count: totalShortageCount, unit: t('features.materials.name') })}
          </span>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-xs">
        {isPending ? (
          <div className="p-8 text-center text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-destructive">
            <AlertCircle className="mx-auto size-8 text-destructive/80 mb-2" />
            <p>{t('features.inventory.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
              {t('common.retry')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text={t('features.inventory.empty')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3">{t('features.inventory.colWorkArea')}</th>
                    <th scope="col" className="px-4 py-3">{t('features.inventory.colMaterial')}</th>
                    <th scope="col" className="px-4 py-3 text-center">{t('features.inventory.colUnit')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('features.inventory.colRequired')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('features.inventory.colAvailable')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('features.inventory.colAllocated')}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t('features.inventory.colUnallocated')}</th>
                    <th scope="col" className="px-4 py-3 text-center">{t('features.inventory.colShortage')}</th>
                    <th scope="col" className="px-4 py-3 text-center">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const isShortage = row.shortage > 0

                    return (
                      <tr
                        key={`${row.workAreaId}-${row.materialId}`}
                        className={`transition-colors hover:bg-muted/30 ${
                          isShortage ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Layers className="size-3.5 text-muted-foreground shrink-0" />
                            <span>{row.workAreaName || row.workAreaId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{row.materialName}</span>
                            <span className="font-mono text-xs text-muted-foreground">{row.materialCode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {row.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular font-mono text-foreground">
                          {row.required}
                        </td>
                        <td className="px-4 py-3 text-right tabular font-mono font-medium text-foreground">
                          {row.confirmedAvailable}
                        </td>
                        <td className="px-4 py-3 text-right tabular font-mono text-muted-foreground">
                          {row.allocated}
                        </td>
                        <td className="px-4 py-3 text-right tabular font-mono text-foreground">
                          {row.unallocated}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isShortage ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100/80 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
                              <AlertTriangle className="size-3.5 text-red-600 dark:text-red-400" />
                              {row.shortage} {row.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                              {t('features.inventory.sufficientBadge')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setHistoryTarget(row)}
                            className="h-8 gap-1.5 px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <History className="size-3.5" />
                            {t('features.inventory.viewHistory')}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <span>
                {t('features.inventory.paginationInfo', {
                  from: (pageInfo.page - 1) * pageInfo.size + 1,
                  to: Math.min(pageInfo.page * pageInfo.size, pageInfo.totalItems),
                  total: pageInfo.totalItems,
                })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageInfo.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2 font-medium text-foreground">
                  {t('features.inventory.pageCurrent', {
                    current: pageInfo.page,
                    total: pageInfo.totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageInfo.page >= pageInfo.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* D1: Dialog Nhập tồn đầu kỳ */}
      <OpeningStockDialog
        open={openingStockOpen}
        onClose={() => {
          setOpeningStockOpen(false)
          refetch()
        }}
        defaultWorkAreaId={selectedWorkArea}
      />

      {/* D3: Drawer Lịch sử giao dịch */}
      <MaterialHistoryDrawer
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        materialId={historyTarget?.materialId}
        materialCode={historyTarget?.materialCode}
        materialName={historyTarget?.materialName}
        unit={historyTarget?.unit}
      />
    </div>
  )
}
