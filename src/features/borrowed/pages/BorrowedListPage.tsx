import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Download,
  Search,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dateStr.slice(0, 10)
}
import { useBorrowedItems } from '../api'
import type { BorrowedItem, BorrowedItemStatus } from '@/types'

type FilterStatus = 'ALL' | BorrowedItemStatus | 'OVERDUE'

export default function BorrowedListPage() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL')

  const { data: items = [] } = useBorrowedItems()

  // 4 Thẻ thống kê
  const stats = useMemo(() => {
    const total = items.length
    const inUse = items.filter((i) => i.status === 'IN_USE' || i.status === 'ISSUED').length
    const overdue = items.filter((i) => i.overdue).length
    const returned = items.filter((i) => i.status === 'RETURNED').length
    return { total, inUse, overdue, returned }
  }, [items])

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return items.filter((item) => {
      // Bộ lọc trạng thái
      if (statusFilter === 'OVERDUE') {
        if (!item.overdue) return false
      } else if (statusFilter !== 'ALL') {
        if (item.status !== statusFilter) return false
      }

      // Bộ lọc từ khóa
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = item.itemName?.toLowerCase().includes(q)
        const matchOwner = item.ownerName?.toLowerCase().includes(q)
        const matchPhone = item.ownerPhone?.toLowerCase().includes(q)
        const matchDesc = item.description?.toLowerCase().includes(q)
        if (!matchName && !matchOwner && !matchPhone && !matchDesc) return false
      }
      return true
    })
  }, [items, statusFilter, searchTerm])

  const exportCSV = () => {
    const headers = [
      t('features.borrowed.name'),
      t('features.borrowed.quantity'),
      t('features.borrowed.owner'),
      t('features.borrowed.contact'),
      t('features.borrowed.expectedReturn'),
      t('common.status'),
      t('status.OVERDUE'),
      t('common.date'),
    ]

    const rows = filtered.map((i) => [
      `"${(i.itemName ?? '').replace(/"/g, '""')}"`,
      i.quantity ?? 1,
      `"${(i.ownerName ?? '').replace(/"/g, '""')}"`,
      `"${(i.ownerPhone ?? '').replace(/"/g, '""')}"`,
      i.expectedReturnDate ?? '',
      i.status,
      i.overdue ? 'YES' : 'NO',
      i.createdAt ? i.createdAt.slice(0, 10) : '',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `do-muon-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    {
      key: 'itemName',
      header: t('features.borrowed.name'),
      render: (row: BorrowedItem) => (
        <div>
          <div className="font-semibold text-foreground">{row.itemName}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('features.borrowed.quantity')}: <span className="font-medium text-foreground">{row.quantity}</span>
            {row.description ? ` • ${row.description}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'ownerName',
      header: t('features.borrowed.owner'),
      render: (row: BorrowedItem) => (
        <div>
          <div className="font-medium text-foreground">{row.ownerName}</div>
          {row.ownerPhone && (
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {row.ownerPhone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'expectedReturnDate',
      header: t('features.borrowed.expectedReturn'),
      render: (row: BorrowedItem) => (
        <div className="space-y-1">
          <div className="text-xs font-mono font-medium">{formatDate(row.expectedReturnDate)}</div>
          {row.overdue && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
              <AlertTriangle className="w-3 h-3" />
              {t('status.OVERDUE')}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row: BorrowedItem) => <StatusTag status={row.status} />,
    },
    {
      key: 'createdAt',
      header: t('common.date'),
      render: (row: BorrowedItem) => (
        <span className="text-xs text-muted-foreground font-mono">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ]

  const filterChips: { id: FilterStatus; label: string; count?: number }[] = [
    { id: 'ALL', label: t('common.all'), count: stats.total },
    { id: 'IN_USE', label: t('features.borrowed.statInUse'), count: stats.inUse },
    { id: 'OVERDUE', label: t('features.borrowed.statOverdue'), count: stats.overdue },
    { id: 'ACCEPTED', label: t('status.ACCEPTED') },
    { id: 'RETURNED', label: t('features.borrowed.statReturned'), count: stats.returned },
    { id: 'OFFERED', label: t('status.OFFERED') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.borrowed.title')}
        sub={t('features.borrowed.sub')}
        actions={
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={items.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            {t('common.exportCSV')}
          </Button>
        }
      />

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('features.borrowed.statTotal')}
          value={stats.total}
          icon={Package}
        />
        <StatCard
          label={t('features.borrowed.statInUse')}
          value={stats.inUse}
          icon={Clock}
          tone="warn"
        />
        <StatCard
          label={t('features.borrowed.statOverdue')}
          value={stats.overdue}
          icon={AlertTriangle}
          tone="alert"
        />
        <StatCard
          label={t('features.borrowed.statReturned')}
          value={stats.returned}
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
              const active = statusFilter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
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
          emptyText={t('features.borrowed.empty')}
        />
      </Card>
    </div>
  )
}
