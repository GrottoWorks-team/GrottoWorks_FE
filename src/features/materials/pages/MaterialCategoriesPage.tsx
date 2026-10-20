// Trang Quản lý Danh mục Vật tư (/material-officer/categories)
// C1: GET /api/v1/material-categories
// C2: POST /api/v1/material-categories
// C3: PATCH /api/v1/material-categories/{categoryId}
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Ban, CheckCircle2, Pencil, Plus, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  useCreateMaterialCategory,
  useMaterialCategories,
  useUpdateMaterialCategory,
} from '../api'
import type { MaterialCategoryDto } from '../api'

const categorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Mã danh mục không được để trống')
    .max(50, 'Mã không quá 50 ký tự')
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ chứa chữ cái, số, gạch nối hoặc gạch dưới'),
  name: z
    .string()
    .trim()
    .min(1, 'Tên danh mục không được để trống')
    .max(100, 'Tên không quá 100 ký tự'),
  description: z.string().max(1000, 'Mô tả không quá 1000 ký tự').optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

export default function MaterialCategoriesPage() {
  const toast = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MaterialCategoryDto | null>(null)

  const { data: categories = [], isPending, isError, error, refetch } = useMaterialCategories()
  const createCategory = useCreateMaterialCategory()
  const updateCategory = useUpdateMaterialCategory()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
    },
  })

  const openCreateDialog = () => {
    setEditingCategory(null)
    reset({
      code: '',
      name: '',
      description: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (cat: MaterialCategoryDto) => {
    setEditingCategory(cat)
    reset({
      code: cat.code,
      name: cat.name,
      description: cat.description || '',
    })
    setDialogOpen(true)
  }

  const onSubmit = async (values: CategoryFormData) => {
    try {
      if (editingCategory) {
        // C3: PATCH /api/v1/material-categories/{categoryId}
        await updateCategory.mutateAsync({
          categoryId: editingCategory.id,
          name: values.name,
          description: values.description || null,
        })
        toast('Cập nhật danh mục vật tư thành công')
      } else {
        // C2: POST /api/v1/material-categories
        await createCategory.mutateAsync({
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || null,
        })
        toast('Tạo danh mục vật tư thành công')
      }
      setDialogOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra'
      toast(message)
    }
  }

  const onToggleStatus = async (cat: MaterialCategoryDto) => {
    const nextStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateCategory.mutateAsync({
        categoryId: cat.id,
        status: nextStatus,
      })
      toast(
        nextStatus === 'ACTIVE'
          ? 'Đã kích hoạt lại danh mục'
          : 'Đã tạm ngưng danh mục',
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái'
      toast(message)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: 'Mã danh mục',
        render: (cat: MaterialCategoryDto) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
            {cat.code}
          </span>
        ),
      },
      {
        key: 'name',
        header: 'Tên danh mục',
        render: (cat: MaterialCategoryDto) => (
          <div>
            <div className="font-medium text-foreground">{cat.name}</div>
            {cat.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Trạng thái',
        render: (cat: MaterialCategoryDto) =>
          cat.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-pine/12 px-2.5 py-0.5 text-xs font-medium text-brand-pine">
              <CheckCircle2 className="size-3.5" /> Hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Ban className="size-3.5" /> Ngừng dùng
            </span>
          ),
      },
      {
        key: 'actions',
        header: 'Thao tác',
        align: 'right' as const,
        render: (cat: MaterialCategoryDto) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(cat)}
              title="Chỉnh sửa danh mục"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cat.status === 'ACTIVE' ? 'text-destructive hover:text-destructive' : 'text-brand-pine'}
              onClick={() => onToggleStatus(cat)}
              title={cat.status === 'ACTIVE' ? 'Tạm ngưng dùng' : 'Kích hoạt lại'}
            >
              {cat.status === 'ACTIVE' ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục vật tư"
        sub="Quản lý các nhóm và chủng loại danh mục vật tư trong kho giáo xứ"
        actions={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            <span>Thêm danh mục</span>
          </Button>
        }
      />

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
          <AlertCircle className="size-8 text-destructive" />
          <div>
            <h3 className="font-semibold text-destructive">Không thể tải danh mục vật tư</h3>
            <p className="text-sm text-destructive/80 mt-1">
              {error instanceof Error ? error.message : 'Đã có lỗi xảy ra từ máy chủ.'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 mt-2">
            <RefreshCw className="size-4" /> Thử lại
          </Button>
        </div>
      )}

      {/* Success data table or Empty State */}
      {!isPending && !isError && categories.length === 0 && (
        <EmptyState
          text="Chưa có danh mục vật tư nào trong hệ thống"
          action={
            <Button onClick={openCreateDialog} size="sm" className="gap-2">
              <Plus className="size-4" /> Thêm danh mục đầu tiên
            </Button>
          }
        />
      )}

      {!isPending && !isError && categories.length > 0 && (
        <DataTable
          rows={categories}
          columns={columns}
          searchKeys={['code', 'name', 'description']}
          filters={[
            {
              key: 'status',
              options: ['ACTIVE', 'INACTIVE'],
            },
          ]}
          pageSize={10}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingCategory ? 'Chỉnh sửa danh mục vật tư' : 'Thêm danh mục vật tư mới'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cat-code">Mã danh mục *</Label>
            <Input
              id="cat-code"
              {...register('code')}
              disabled={!!editingCategory}
              placeholder="VD: LIGHTING, TIMBER, HARDWARE..."
              className="mt-1 font-mono uppercase"
            />
            {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
            {editingCategory && (
              <p className="text-xs text-muted-foreground mt-1">Mã danh mục không thể thay đổi sau khi tạo</p>
            )}
          </div>

          <div>
            <Label htmlFor="cat-name">Tên danh mục *</Label>
            <Input
              id="cat-name"
              {...register('name')}
              placeholder="VD: Đèn và chiếu sáng, Gỗ và vật liệu dựng..."
              className="mt-1"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="cat-desc">Mô tả chi tiết</Label>
            <Textarea
              id="cat-desc"
              {...register('description')}
              rows={3}
              placeholder="Ghi chú về nhóm vật tư này..."
              className="mt-1"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang lưu...' : editingCategory ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
