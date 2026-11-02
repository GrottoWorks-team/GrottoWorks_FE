import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Search,
  Users,
  Package,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSupportRequests } from '../api'
import type { SupportRequest, SupportType, SupportRequestStatus } from '@/types'

type FilterKind = 'ALL' | SupportType | SupportRequestStatus

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}

export default function SupportListPage() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterKind>('ALL')

  const { data: requests = [] } = useSupportRequests()

  // 4 Thẻ thống kê
  const stats = useMemo(() => {
    const total = requests.length
    const staffing = requests.filter((r) => r.supportType === 'STAFFING').length
    const material = requests.filter((r) => r.supportType === 'MATERIAL').length
    const fulfilled = requests.filter((r) => r.status === 'FULFILLED' || r.status === 'CLOSED').length

    return { total, staffing, material, fulfilled }
  }, [requests])

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return requests.filter((r) => {
      // Bộ lọc loại hoặc trạng thái
      if (filter === 'STAFFING' || filter === 'MATERIAL' || filter === 'MIXED') {
        if (r.supportType !== filter) return false
      } else if (filter !== 'ALL') {
        if (r.status !== filter) return false
      }

      // Bộ lọc tìm kiếm
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchDesc = r.description?.toLowerCase().includes(q)
        const matchPositions = (r.positions || []).some((p) => p.name?.toLowerCase().includes(q))
        if (!matchDesc && !matchPositions) return false
      }
      return true
    })
  }, [requests, filter, searchTerm])

  const exportCSV = () => {
    const headers = [
      t('features.support.kind'),
      t('features.support.detail'),
      t('features.support.positions'),
      t('features.support.deadline'),
      t('common.status'),
      t('features.support.date'),
    ]

    const rows = filtered.map((r) => {
      const positionsText = (r.positions || [])
        .map((p) => `${p.name} (${p.requiredVolunteerCount})`)
        .join('; ')
      return [
        r.supportType,
        `"${(r.description ?? '').replace(/"/g, '""')}"`,
        `"${positionsText.replace(/"/g, '""')}"`,
        r.deadline ?? '',
        r.status,
        r.createdAt ? r.createdAt.slice(0, 10) : '',
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `yeu-cau-ho-tro-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'description',
      header: t('features.support.detail'),
      render: (row: SupportRequest) => (
        <div>
          <div className="font-semibold text-foreground">{row.description || '—'}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusTag status={row.supportType} />
          </div>
        </div>
      ),
    },
    {
      key: 'positions',
      header: t('features.support.positions'),
      render: (row: SupportRequest) => {
        const pos = row.positions || []
        const mats = row.materials || []
        if (pos.length === 0 && mats.length === 0) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="space-y-1">
            {pos.map((p) => (
              <div key={p.id} className="text-xs flex items-center gap-1.5">
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="font-mono text-slate-500 bg-slate-100 rounded px-1 py-0.2">
                  {p.requiredVolunteerCount} người
                </span>
                {p.note && <span className="text-muted-foreground text-[11px]">({p.note})</span>}
              </div>
            ))}
            {mats.map((m) => (
              <div key={m.id} className="text-xs flex items-center gap-1.5 text-slate-600">
                <span>Vật tư: {m.requiredQuantity}</span>
                {m.note && <span className="text-muted-foreground text-[11px]">({m.note})</span>}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      key: 'deadline',
      header: t('features.support.deadline'),
      render: (row: SupportRequest) => (
        <span className="text-xs font-mono font-medium">{formatDate(row.deadline)}</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: SupportRequest) => <StatusTag status={row.status} />,
    },
    {
      key: 'createdAt',
      header: t('features.support.date'),
      render: (row: SupportRequest) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ]

  const filterChips: { id: FilterKind; label: string; count?: number }[] = [
    { id: 'ALL', label: t('common.all'), count: stats.total },
    { id: 'PUBLISHED', label: t('status.PUBLISHED') },
    { id: 'STAFFING', label: t('features.support.statStaffing'), count: stats.staffing },
    { id: 'MATERIAL', label: t('features.support.statMaterial'), count: stats.material },
    { id: 'FULFILLED', label: t('features.support.statFulfilled'), count: stats.fulfilled },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.support.title')}
        sub={t('features.support.sub')}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={requests.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            {t('features.support.exportCsv')}
          </Button>
        }
      />

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('features.support.statTotal')}
          value={stats.total}
          icon={HelpCircle}
        />
        <StatCard
          label={t('features.support.statStaffing')}
          value={stats.staffing}
          icon={Users}
          tone="warn"
        />
        <StatCard
          label={t('features.support.statMaterial')}
          value={stats.material}
          icon={Package}
        />
        <StatCard
          label={t('features.support.statFulfilled')}
          value={stats.fulfilled}
          icon={CheckCircle2}
          tone="ok"
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
              const active = filter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
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
          emptyText={t('features.support.empty')}
        />
      </Card>
    </div>
  )
}
