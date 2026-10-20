// Trang Quản lý Danh mục Vật tư (/material-officer/categories)
// C1: GET /api/v1/material-categories
// C2: POST /api/v1/material-categories
// C3: PATCH /api/v1/material-categories/{categoryId}
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
    .min(1, 'features.materials.categories.codeRequired')
    .max(50, 'features.materials.categories.codeMax')
    .regex(/^[A-Za-z0-9_-]+$/, 'features.materials.categories.codeRegex'),
  name: z
    .string()
    .trim()
    .min(1, 'features.materials.categories.nameRequired')
    .max(100, 'features.materials.categories.nameMax'),
  description: z.string().max(1000, 'features.materials.categories.descMax').optional(),
})

type CategoryFormData = z.infer<typeof categorySchema>

export default function MaterialCategoriesPage() {
  const { t } = useTranslation()
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
        toast(t('features.materials.categories.updated'))
      } else {
        // C2: POST /api/v1/material-categories
        await createCategory.mutateAsync({
          code: values.code.toUpperCase(),
          name: values.name,
          description: values.description || null,
        })
        toast(t('features.materials.categories.created'))
      }
      setDialogOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('features.materials.categories.error')
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
          ? t('features.materials.categories.activated')
          : t('features.materials.categories.deactivated'),
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('features.materials.categories.statusError')
      toast(message)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'code',
        header: t('features.materials.categories.code'),
        render: (cat: MaterialCategoryDto) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
            {cat.code}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('features.materials.categories.name'),
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
        header: t('common.status'),
        render: (cat: MaterialCategoryDto) =>
          cat.status === 'ACTIVE' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-pine/12 px-2.5 py-0.5 text-xs font-medium text-brand-pine">
              <CheckCircle2 className="size-3.5" /> {t('features.materials.categories.statusActive')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <Ban className="size-3.5" /> {t('features.materials.categories.statusInactive')}
            </span>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        align: 'right' as const,
        render: (cat: MaterialCategoryDto) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(cat)}
              title={t('features.materials.categories.editTitle')}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cat.status === 'ACTIVE' ? 'text-destructive hover:text-destructive' : 'text-brand-pine'}
              onClick={() => onToggleStatus(cat)}
              title={cat.status === 'ACTIVE' ? t('features.materials.categories.toggleInactive') : t('features.materials.categories.toggleActive')}
            >
              {cat.status === 'ACTIVE' ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.materials.categories.title')}
        sub={t('features.materials.categories.sub')}
        actions={
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="size-4" />
            <span>{t('features.materials.categories.create')}</span>
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
            <h3 className="font-semibold text-destructive">{t('features.materials.categories.loadError')}</h3>
            <p className="text-sm text-destructive/80 mt-1">
              {error instanceof Error ? error.message : t('common.error')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 mt-2">
            <RefreshCw className="size-4" /> {t('common.retry')}
          </Button>
        </div>
      )}

      {/* Success data table or Empty State */}
      {!isPending && !isError && categories.length === 0 && (
        <EmptyState
          text={t('features.materials.categories.empty')}
          action={
            <Button onClick={openCreateDialog} size="sm" className="gap-2">
              <Plus className="size-4" /> {t('features.materials.categories.createFirst')}
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
        title={editingCategory ? t('features.materials.categories.dialogEdit') : t('features.materials.categories.dialogCreate')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cat-code">{t('features.materials.categories.code')} *</Label>
            <Input
              id="cat-code"
              {...register('code')}
              disabled={!!editingCategory}
              placeholder={t('features.materials.categories.codePlaceholder')}
              className="mt-1 font-mono uppercase"
            />
            {errors.code && <p className="text-xs text-destructive mt-1">{t(errors.code.message || '')}</p>}
            {editingCategory && (
              <p className="text-xs text-muted-foreground mt-1">{t('features.materials.categories.codeImmutable')}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cat-name">{t('features.materials.categories.name')} *</Label>
            <Input
              id="cat-name"
              {...register('name')}
              placeholder={t('features.materials.categories.namePlaceholder')}
              className="mt-1"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{t(errors.name.message || '')}</p>}
          </div>

          <div>
            <Label htmlFor="cat-desc">{t('features.materials.categories.desc')}</Label>
            <Textarea
              id="cat-desc"
              {...register('description')}
              rows={3}
              placeholder={t('features.materials.categories.descPlaceholder')}
              className="mt-1"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{t(errors.description.message || '')}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : editingCategory ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
