import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from './EmptyState'
import { SearchInput } from './SearchInput'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  render?: (row: T) => ReactNode
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  onRowClick?: (row: T) => void
  searchKeys?: string[] // key của row đưa vào chuỗi tìm kiếm
  filters?: { key: string; options: string[] }[] // chip lọc, '' = tất cả
  defaultFilters?: Record<string, string> // chip active lúc mount (vd default PENDING)
  pageSize?: number
  emptyText?: string
  keyExtractor?: (row: T, index: number) => string // mặc định: row.id, fallback index
}

// ponytail: search/filter/pagination hoàn toàn client-side — dữ liệu mỗi trang
// ≤ vài trăm dòng; server-side khi bảng vượt mảng vài nghìn.
const cell = (row: unknown, key: string): unknown => (row as Record<string, unknown>)[key]

const ALIGN = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function DataTable<T>({
  columns,
  rows,
  onRowClick,
  searchKeys,
  filters,
  defaultFilters,
  pageSize = 8,
  emptyText,
  keyExtractor,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [active, setActive] = useState<Record<string, string>>(defaultFilters ?? {})
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((row) => {
      if (needle && searchKeys?.length) {
        const hay = searchKeys.map((k) => String(cell(row, k) ?? '')).join(' ').toLowerCase()
        if (!hay.includes(needle)) return false
      }
      for (const [k, v] of Object.entries(active)) {
        if (v && String(cell(row, k)) !== v) return false
      }
      return true
    })
  }, [rows, q, searchKeys, active])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const view = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const showToolbar = Boolean(searchKeys?.length || filters?.length)

  return (
    <div className="w-full">
      {showToolbar && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {searchKeys?.length ? (
            <SearchInput
              value={q}
              onChange={(v) => {
                setQ(v)
                setPage(0)
              }}
              className="w-64"
            />
          ) : null}
          {filters?.map((f) => (
            <div key={f.key} className="flex flex-wrap items-center gap-1.5" role="group" aria-label={f.key}>
              {[undefined, ...f.options].map((opt) => {
                const selected = (active[f.key] ?? '') === (opt ?? '')
                return (
                  <button
                    key={opt ?? '__all'}
                    type="button"
                    onClick={() => {
                      setActive({ ...active, [f.key]: opt ?? '' })
                      setPage(0)
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                    )}
                  >
                    {opt ? t(`status.${opt}`, { defaultValue: opt }) : t('common.all')}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full text-sm">
                    <thead>
            <tr className="border-b border-border bg-gw-tableHead">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-[13px] font-semibold text-primary',
                    ALIGN[c.align ?? 'left'],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="stagger">
            {view.map((row, i) => (
              <tr
                key={keyExtractor?.(row, i) ?? String(cell(row, 'id') ?? i)}
                style={{ '--d': i } as CSSProperties}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter') onRowClick(row)
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-border/60 transition-[transform,box-shadow] last:border-0',
                  onRowClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-hover',
                )}
              >
                                {columns.map((c) => (
                  <td key={c.key} className={cn('h-[52px] px-4 py-3 align-middle', ALIGN[c.align ?? 'left'])}>
                    {c.render ? c.render(row) : String(cell(row, c.key) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState text={emptyText ?? t('common.empty')} />}
      </div>

      {filtered.length > pageSize && (
        <div className="mt-3 flex items-center justify-between">
          <p className="lbl-mono">{t('common.total', { n: filtered.length })}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="size-4" />
              {t('common.previous')}
            </Button>
            <span className="lbl-mono">
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              {t('common.next')}
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
