// Sổ danh mục vật tư dùng chung (/material-officer/materials)
// C4: GET /api/v1/materials (Catalog, phân trang, lọc nhóm danh mục)
// C5: POST /api/v1/materials
// C6: PATCH /api/v1/materials/{materialId}
import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Download, Pencil, Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { exportCsv } from '@/lib/csv'
import {
  useMaterialCatalog,
  useMaterialCategories,
  useUpdateMaterialCatalogItem,
} from '../api'
import type { MaterialCatalogItemDto } from '../api'
import { MaterialCatalogFormDialog } from './MaterialCatalogFormDialog'

const SELECT_CLS =
  'flex h-10 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function MaterialListPage() {
  const toast = useToast()

  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data: categories = [] } = useMaterialCategories()
  const { data: catalogResult, isPending, isError, error, refetch } = useMaterialCatalog({
    page,
    size: pageSize,
    categoryId: selectedCategory || undefined,
    q: debouncedSearch || undefined,
  })

  const updateItem = useUpdateMaterialCatalogItem()

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MaterialCatalogItemDto | null>(null)

  const materials = catalogResult?.data || []
  const pageInfo = catalogResult?.page || {
    page: 1,
    size: pageSize,
    totalItems: 0,
    totalPages: 1,
  }

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of categories) {
      map.set(c.id, c.name)
    }
    return map
  }, [categories])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }
  }

  const onToggleStatus = async (item: MaterialCatalogItemDto) => {
    const nextStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateItem.mutateAsync({
        materialId: item.id,
        status: nextStatus,
      })
      toast(
        nextStatus === 'ACTIVE'
          ? `Đã kích hoạt lại vật tư ${item.code}`
          : `Đã tạm ngưng sử dụng vật tư ${item.code}`,
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái'
      toast(message)
    }
  }

  const onExport = () => {
    if (!materials.length) return
    exportCsv(
      'grottoworks-danh-muc-vat-tu.csv',
      materials.map((m) => ({
        'Mã vật tư': m.code,
        'Tên vật tư': m.name,
        'Nhóm danh mục': categoryNameMap.get(m.categoryId) || '—',
        'Đơn vị tính': m.unit,
        'Mô tả': m.description || '',
        'Trạng thái': m.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng',
      })),
    )
    toast('Đã xuất file CSV danh mục vật tư')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục vật tư chuẩn"
        sub="Danh mục vật tư dùng chung cho toàn bộ nhu cầu hang đá, mua sắm và kho bãi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={onExport} disabled={!materials.length}>
              <Download className="size-4" />
              <span>Xuất CSV</span>
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null)
                setFormOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              <span>Thêm vật tư</span>
            </Button>
          </div>
        }
      />

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Chọn nhóm danh mục"
            className={SELECT_CLS}
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả nhóm danh mục</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm theo tên hoặc mã... (Enter)"
            className="pl-9"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isPending && (
        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-14 w-full animate-pulse rounded-md bg-muted/60" />
          <div className="h-14 w-full animate-pulse rounded-md bg-muted/60" />
          <div className="h-14 w-full animate-pulse rounded-md bg-muted/60" />
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : 'Không thể tải danh sách vật tư.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isPending && !isError && materials.length === 0 && (
        <EmptyState
          text="Không tìm thấy vật tư nào trong danh mục"
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditingItem(null)
                setFormOpen(true)
              }}
              className="gap-2"
            >
              <Plus className="size-4" /> Thêm vật tư mới
            </Button>
          }
        />
      )}

      {/* Data Table */}
      {!isPending && !isError && materials.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Mã vật tư</th>
                  <th className="px-4 py-3">Tên vật tư</th>
                  <th className="px-4 py-3">Nhóm danh mục</th>
                  <th className="px-4 py-3 text-center">Đơn vị</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {materials.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      {m.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{m.name}</div>
                      {m.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {m.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {categoryNameMap.get(m.categoryId) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded bg-muted/80 px-2 py-0.5 text-xs font-medium text-foreground">
                        {m.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-pine/12 px-2.5 py-0.5 text-xs font-medium text-brand-pine">
                          <CheckCircle2 className="size-3.5" /> Đang dùng
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          <Ban className="size-3.5" /> Ngừng dùng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(m)
                            setFormOpen(true)
                          }}
                          title="Chỉnh sửa vật tư"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            m.status === 'ACTIVE'
                              ? 'text-destructive hover:text-destructive'
                              : 'text-brand-pine'
                          }
                          onClick={() => onToggleStatus(m)}
                          title={m.status === 'ACTIVE' ? 'Tạm ngưng dùng' : 'Kích hoạt lại'}
                        >
                          {m.status === 'ACTIVE' ? (
                            <Ban className="size-4" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang (Pagination) */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Hiển thị <span className="font-medium text-foreground">{(page - 1) * pageSize + 1}</span> -{' '}
              <span className="font-medium text-foreground">
                {Math.min(page * pageSize, pageInfo.totalItems)}
              </span>{' '}
              trong tổng số <span className="font-medium text-foreground">{pageInfo.totalItems}</span> vật tư
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-medium text-foreground">
                Trang {page} / {Math.max(1, pageInfo.totalPages)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageInfo.totalPages, p + 1))}
                disabled={page >= pageInfo.totalPages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog tạo / sửa vật tư */}
      {formOpen && (
        <MaterialCatalogFormDialog
          material={editingItem}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}
