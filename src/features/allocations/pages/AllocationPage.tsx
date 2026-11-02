import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Search,
  Boxes,
  MapPin,
  ClipboardList,
  Layers,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAllocations } from '../api'
import type { Allocation } from '@/types'

type FilterKind = 'ALL' | 'AREA_ONLY' | 'TASK_SPECIFIC'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}

export default function AllocationPage() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [kindFilter, setKindFilter] = useState<FilterKind>('ALL')

  const { data: allocations = [] } = useAllocations()

  // 4 Thẻ thống kê
  const stats = useMemo(() => {
    const total = allocations.length
    const totalQuantity = allocations.reduce((sum, a) => {
      const lineSum = (a.items || []).reduce((s, it) => s + (Number(it.allocatedQuantity) || 0), 0)
      return sum + lineSum
    }, 0)
    const distinctAreas = new Set(allocations.map((a) => a.workAreaId).filter(Boolean)).size
    const taskSpecificCount = allocations.filter((a) => !!a.taskId).length

    return { total, totalQuantity, distinctAreas, taskSpecificCount }
  }, [allocations])

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return allocations.filter((a) => {
      // Bộ lọc loại cấp phát
      if (kindFilter === 'AREA_ONLY' && a.taskId) return false
      if (kindFilter === 'TASK_SPECIFIC' && !a.taskId) return false

      // Bộ lọc tìm kiếm
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchArea = a.workAreaName?.toLowerCase().includes(q)
        const matchTask = a.taskName?.toLowerCase().includes(q)
        const matchNote = a.note?.toLowerCase().includes(q)
        const matchItems = (a.items || []).some(
          (it) =>
            it.materialName?.toLowerCase().includes(q) ||
            it.materialCode?.toLowerCase().includes(q),
        )
        if (!matchArea && !matchTask && !matchNote && !matchItems) return false
      }
      return true
    })
  }, [allocations, kindFilter, searchTerm])

  const exportCSV = () => {
    const headers = [
      t('features.allocations.area'),
      t('features.allocations.task'),
      t('features.allocations.material'),
      t('features.allocations.qty'),
      t('common.date'),
      t('common.note'),
    ]

    const rows = filtered.flatMap((a) => {
      if (!a.items || a.items.length === 0) {
        return [
          [
            `"${(a.workAreaName ?? '').replace(/"/g, '""')}"`,
            `"${(a.taskName ?? '').replace(/"/g, '""')}"`,
            '""',
            0,
            a.allocationDate ? a.allocationDate.slice(0, 10) : '',
            `"${(a.note ?? '').replace(/"/g, '""')}"`,
          ],
        ]
      }
      return a.items.map((it) => [
        `"${(a.workAreaName ?? '').replace(/"/g, '""')}"`,
        `"${(a.taskName ?? '').replace(/"/g, '""')}"`,
        `"${(it.materialName ?? '').replace(/"/g, '""')}"`,
        `${it.allocatedQuantity} ${it.unit}`,
        a.allocationDate ? a.allocationDate.slice(0, 10) : '',
        `"${(a.note ?? '').replace(/"/g, '""')}"`,
      ])
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cap-phat-vat-tu-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'destination',
      header: t('features.allocations.target'),
      render: (row: Allocation) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-pine shrink-0" />
            <span>{row.workAreaName || '—'}</span>
          </div>
          {row.taskName && (
            <div className="mt-1 flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 w-fit">
              <ClipboardList className="w-3 h-3 shrink-0" />
              <span>{row.taskName}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'materials',
      header: t('features.allocations.material'),
      render: (row: Allocation) => {
        const items = row.items || []
        if (items.length === 0) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="space-y-1">
            {items.map((it) => (
              <div key={it.id || it.materialId} className="text-xs flex items-center gap-1.5">
                <span className="font-medium text-foreground">{it.materialName}</span>
                <span className="font-mono text-slate-500 bg-slate-100 rounded px-1 py-0.2">
                  {it.allocatedQuantity} {it.unit}
                </span>
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: 'note',
      header: t('common.note'),
      render: (row: Allocation) => (
        <span className="text-xs text-muted-foreground">{row.note || '—'}</span>
      ),
    },
    {
      key: 'allocationDate',
      header: t('features.allocations.date'),
      render: (row: Allocation) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(row.allocationDate)}
        </span>
      ),
    },
  ]

  const filterChips: { id: FilterKind; label: string; count?: number }[] = [
    { id: 'ALL', label: t('common.all'), count: stats.total },
    { id: 'AREA_ONLY', label: t('features.allocations.filterAreaOnly'), count: stats.total - stats.taskSpecificCount },
    { id: 'TASK_SPECIFIC', label: t('features.allocations.filterTaskSpecific'), count: stats.taskSpecificCount },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.allocations.title')}
        sub={t('features.allocations.sub')}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={allocations.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            {t('common.exportCSV')}
          </Button>
        }
      />

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('features.allocations.statTotal')}
          value={stats.total}
          icon={Layers}
        />
        <StatCard
          label={t('features.allocations.statQuantity')}
          value={stats.totalQuantity}
          icon={Boxes}
          tone="ok"
        />
        <StatCard
          label={t('features.allocations.statAreas')}
          value={stats.distinctAreas}
          icon={MapPin}
        />
        <StatCard
          label={t('features.allocations.statTasks')}
          value={stats.taskSpecificCount}
          icon={ClipboardList}
          tone="warn"
        />
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('common.search')}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {filterChips.map((chip) => {
              const active = kindFilter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setKindFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {chip.label}
                  {chip.count !== undefined && (
                    <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                    }`}>
                      {chip.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <DataTable
          columns={columns}
          rows={filtered}
          emptyText={t('features.allocations.empty')}
        />
      </Card>
    </div>
  )
}
