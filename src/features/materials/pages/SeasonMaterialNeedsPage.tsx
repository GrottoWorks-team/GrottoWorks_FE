// Màn hình Tổng hợp nhu cầu mua vật tư mùa vụ (/material-officer/material-needs)
// E5: GET /api/v1/seasons/{seasonId}/material-needs (PARISH, LEADER, MO)
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  ShoppingBag,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import {
  useSeasonMaterialNeeds,
  useMaterialCatalog,
} from '../api'
import { useSeasons } from '@/features/season/api'
import { useAreas } from '@/features/areas/api'

const SELECT_CLS =
  'flex h-9 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function SeasonMaterialNeedsPage() {
  const { t } = useTranslation()

  const [page, setPage] = useState(1)
  const pageSize = 15

  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedWorkArea, setSelectedWorkArea] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState('')

  // Master data for filters
  const { data: seasons = [] } = useSeasons()
  const activeSeason = seasons.find((s) => s.status === 'ACTIVE') || seasons[0]
  const currentSeasonId = selectedSeason || activeSeason?.id || ''

  const { data: areas = [] } = useAreas(currentSeasonId ? [currentSeasonId] : undefined)
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: 100 })
  const catalogMaterials = catalogResult?.data || []

  // Material needs query (E5)
  const {
    data: needsResult,
    isPending,
    isError,
    refetch,
  } = useSeasonMaterialNeeds(
    currentSeasonId,
    {
      page,
      size: pageSize,
      workAreaId: selectedWorkArea || undefined,
      materialId: selectedMaterial || undefined,
    }
  )

  const rows = needsResult?.data || []
  const pageInfo = needsResult?.page || {
    page: 1,
    size: pageSize,
    totalItems: 0,
    totalPages: 1,
  }

  // Summary counts
  const totalAreasInNeeds = useMemo(() => {
    return new Set(rows.map((r) => r.workAreaId)).size
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.needs.title', { defaultValue: 'Tổng hợp nhu cầu mua vật tư mùa vụ' })}
        sub={t('features.needs.sub', {
          defaultValue:
            'Bảng tổng hợp các mặt hàng phát sinh thiếu hụt trên toàn giáo xứ để lập dự toán và kế hoạch mua sắm',
        })}
      />

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-md bg-brand-pine/10 text-brand-pine">
            <ShoppingBag className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t('features.needs.statTotalItems', { defaultValue: 'Mặt hàng thiếu' })}
            </div>
            <div className="text-xl font-bold text-foreground">{pageInfo.totalItems}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t('features.needs.statTotalAreas', { defaultValue: 'Khu vực cần mua' })}
            </div>
            <div className="text-xl font-bold text-foreground">{totalAreasInNeeds}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-md bg-red-500/10 text-red-500">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              {t('features.shortages.title', { defaultValue: 'Tình trạng mua bổ sung' })}
            </div>
            <div className="text-xs font-semibold text-red-600 dark:text-red-400">
              {pageInfo.totalItems > 0
                ? t('features.shortages.badgeShortage', { defaultValue: 'Cần mua gấp' })
                : t('features.shortages.badgeSufficient', { defaultValue: 'Đủ vật tư' })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Filter className="size-3.5" />
          <span>{t('common.filter', { defaultValue: 'Bộ lọc' })}:</span>
        </div>

        {/* Season Filter */}
        <select
          value={selectedSeason || currentSeasonId}
          onChange={(e) => {
            setSelectedSeason(e.target.value)
            setSelectedWorkArea('')
            setPage(1)
          }}
          className={SELECT_CLS}
          aria-label={t('features.needs.filterSeason', { defaultValue: 'Lọc theo mùa vụ' })}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.status})
            </option>
          ))}
        </select>

        {/* Work Area Filter */}
        <select
          value={selectedWorkArea}
          onChange={(e) => {
            setSelectedWorkArea(e.target.value)
            setPage(1)
          }}
          className={SELECT_CLS}
          aria-label={t('features.needs.filterWorkArea', { defaultValue: 'Lọc theo khu vực' })}
        >
          <option value="">{t('features.needs.allWorkAreas', { defaultValue: 'Tất cả khu vực' })}</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Material Filter */}
        <select
          value={selectedMaterial}
          onChange={(e) => {
            setSelectedMaterial(e.target.value)
            setPage(1)
          }}
          className={SELECT_CLS}
          aria-label={t('features.needs.filterMaterial', { defaultValue: 'Lọc theo vật tư' })}
        >
          <option value="">{t('features.needs.allMaterials', { defaultValue: 'Tất cả vật tư' })}</option>
          {catalogMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} - {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Content Table / State */}
      {isPending ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <p className="lbl-mono">{t('common.loading')}</p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm text-destructive">
            {t('features.needs.loadError', {
              defaultValue: 'Không thể tải danh sách tổng hợp nhu cầu mua vật tư.',
            })}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('common.retry', { defaultValue: 'Thử lại' })}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          text={t('features.needs.empty', {
            defaultValue: 'Không có nhu cầu mua sắm thiếu hụt nào phù hợp với bộ lọc.',
          })}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{t('features.needs.colWorkArea', { defaultValue: 'Khu vực công tác' })}</th>
                    <th className="px-4 py-3">{t('features.needs.colMaterial', { defaultValue: 'Vật tư danh mục' })}</th>
                    <th className="px-4 py-3 text-center">{t('features.needs.colUnit', { defaultValue: 'ĐVT' })}</th>
                    <th className="px-4 py-3 text-right">{t('features.needs.colRequired', { defaultValue: 'Tổng nhu cầu' })}</th>
                    <th className="px-4 py-3 text-right">{t('features.needs.colShortage', { defaultValue: 'Số lượng cần mua thêm' })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, idx) => {
                    const rowKey = `${row.workAreaId}-${row.materialId}-${idx}`
                    return (
                      <tr key={rowKey} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{row.workAreaName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            #{row.workAreaId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{row.materialName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {row.materialCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                            {row.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                          {row.required.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-mono text-xs font-bold text-red-600 dark:text-red-400">
                            <AlertTriangle className="size-3 shrink-0" />
                            +{row.shortage.toLocaleString()} {row.unit}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              {t('features.needs.paginationInfo', {
                from: (pageInfo.page - 1) * pageInfo.size + 1,
                to: Math.min(pageInfo.page * pageInfo.size, pageInfo.totalItems),
                total: pageInfo.totalItems,
                defaultValue: `Hiển thị ${(pageInfo.page - 1) * pageInfo.size + 1} - ${Math.min(
                  pageInfo.page * pageInfo.size,
                  pageInfo.totalItems
                )} trong tổng số ${pageInfo.totalItems} nhu cầu`,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pageInfo.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-3.5" />
                <span>{t('common.previous', { defaultValue: 'Trước' })}</span>
              </Button>
              <span className="font-mono text-foreground">
                {t('features.needs.pageCurrent', {
                  current: pageInfo.page,
                  total: Math.max(1, pageInfo.totalPages),
                  defaultValue: `Trang ${pageInfo.page} / ${Math.max(1, pageInfo.totalPages)}`,
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pageInfo.page >= pageInfo.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <span>{t('common.next', { defaultValue: 'Sau' })}</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
