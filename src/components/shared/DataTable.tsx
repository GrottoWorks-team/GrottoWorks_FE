import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { SearchInput } from './SearchInput'
import { TableSkeleton } from './TableSkeleton'

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
  searchKeys?: string[]
  filters?: { key: string; options: string[] }[]
  defaultFilters?: Record<string, string>
  pageSize?: number
  emptyText?: string
  emptyHint?: string
  emptyAction?: ReactNode
  toolbarActions?: ReactNode
  isPending?: boolean
  isError?: boolean
  onRetry?: () => void
  /** Hành động theo dòng — chỉ hiện khi hover/focus, vẫn dùng được bằng bàn phím. */
  rowActions?: (row: T) => ReactNode
  keyExtractor?: (row: T, index: number) => string
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
  emptyHint,
  emptyAction,
  toolbarActions,
  isPending,
  isError,
  onRetry,
  rowActions,
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
  const showToolbar = Boolean(searchKeys?.length || filters?.length || toolbarActions)
  const first = filtered.length === 0 ? 0 : safePage * pageSize + 1
  const last = Math.min((safePage + 1) * pageSize, filtered.length)

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
        {toolbarActions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border px-4 py-3">
            {toolbarActions}
          </div>
        ) : null}
        {isError ? (
          <ErrorState compact onRetry={onRetry} />
        ) : isPending ? (
          <TableSkeleton columns={columns.length + (rowActions ? 1 : 0)} />
        ) : (
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
                {rowActions ? (
                  <th scope="col" className="w-px px-4 py-3">
                    <span className="sr-only">{t('common.actions')}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {view.map((row, i) => (
                <tr
                  key={keyExtractor?.(row, i) ?? String(cell(row, 'id') ?? i)}
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
                    'group border-b border-border/60 transition-colors last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-gw-hover',
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'h-[52px] px-4 py-3 align-middle',
                        ALIGN[c.align ?? 'left'],
                        c.align === 'right' && 'tabular',
                      )}
                    >
                      {c.render
                        ? c.render(row)
                        : (() => {
                            const value = cell(row, c.key)
                            // Thiếu dữ liệu hiện '—', không để ô trống gây hiểu là 0.
                            return value === null || value === undefined || value === ''
                              ? '—'
                              : String(value)
                          })()}
                    </td>
                  ))}
                  {rowActions ? (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        {rowActions(row)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isPending && !isError && filtered.length === 0 && (
          <EmptyState text={emptyText ?? t('common.empty')} hint={emptyHint} action={emptyAction} />
        )}
      </div>

      {filtered.length > pageSize && (
        <div className="mt-3 flex items-center justify-between">
          <p className="lbl-mono tabular">
            {t('common.paginationRange', { from: first, to: last, total: filtered.length })}
          </p>
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
            <span className="lbl-mono tabular">
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
