// Dialog tạo/sửa danh mục vật tư dùng chung (/api/v1/materials)
// C5: POST /api/v1/materials
// C6: PATCH /api/v1/materials/{materialId}
// Lưu ý C6: Sau khi vật tư đã phát sinh giao dịch/nhu cầu, trường 'unit' sẽ bị khóa
// bởi BE (MATERIAL_UNIT_LOCKED). UI disable ô nhập và hiển thị tooltip/cảnh báo rõ ràng.
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Info, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  useCreateMaterialCatalogItem,
  useMaterialCategories,
  useUpdateMaterialCatalogItem,
} from '../api'
import type { MaterialCatalogItemDto } from '../api'
import { api } from '@/lib/api'

const schema = z.object({
  categoryId: z.string().min(1, 'Vui lòng chọn nhóm danh mục'),
  code: z
    .string()
    .trim()
    .min(1, 'Mã vật tư không được để trống')
    .max(50, 'Mã không quá 50 ký tự')
    .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ chứa chữ cái, số, gạch nối hoặc gạch dưới'),
  name: z.string().trim().min(1, 'Tên vật tư không được để trống').max(150, 'Tên không quá 150 ký tự'),
  unit: z.string().trim().min(1, 'Đơn vị tính không được để trống').max(30, 'Đơn vị không quá 30 ký tự'),
  description: z.string().max(2000, 'Mô tả không quá 2000 ký tự').optional(),
})

type FormData = z.infer<typeof schema>

export function MaterialCatalogFormDialog({
  onClose,
  material,
}: {
  onClose: () => void
  material?: MaterialCatalogItemDto | null
}) {
  const toast = useToast()
  const { data: categories = [] } = useMaterialCategories('ACTIVE')
  const create = useCreateMaterialCatalogItem()
  const update = useUpdateMaterialCatalogItem()

  const [isUnitLocked, setIsUnitLocked] = useState(false)
  const editing = Boolean(material)

  // Kiểm tra lịch sử giao dịch để biết unit có bị khóa hay không (C6)
  useEffect(() => {
    if (!material?.id) {
      setIsUnitLocked(false)
      return
    }

    let isMounted = true
    api<{ data: unknown[] }>(`/api/v1/materials/${material.id}/allocation-history`)
      .then((res) => {
        if (isMounted && res.data && res.data.length > 0) {
          setIsUnitLocked(true)
        }
      })
      .catch(() => {
        // Fallback: Nếu không đọc được lịch sử, không khóa trước
      })

    return () => {
      isMounted = false
    }
  }, [material?.id])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: material
      ? {
          categoryId: material.categoryId,
          code: material.code,
          name: material.name,
          unit: material.unit,
          description: material.description || '',
        }
      : {
          categoryId: categories[0]?.id || '',
          code: '',
          name: '',
          unit: '',
          description: '',
        },
  })

  const onSubmit = async (values: FormData) => {
    try {
      if (editing && material) {
        // C6: PATCH /api/v1/materials/{materialId}
        await update.mutateAsync({
          materialId: material.id,
          categoryId: values.categoryId,
          name: values.name,
          unit: isUnitLocked ? undefined : values.unit,
          description: values.description || null,
        })
        toast('Cập nhật thông tin vật tư thành công')
      } else {
        // C5: POST /api/v1/materials
        await create.mutateAsync({
          categoryId: values.categoryId,
          code: values.code.toUpperCase(),
          name: values.name,
          unit: values.unit,
          description: values.description || null,
        })
        toast('Thêm vật tư vào danh mục thành công')
      }
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu'
      toast(message)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? 'Chỉnh sửa vật tư danh mục' : 'Thêm vật tư mới vào danh mục'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="cat-id">Nhóm danh mục *</Label>
          <select
            id="cat-id"
            {...register('categoryId')}
            className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 mt-1"
          >
            <option value="">-- Chọn danh mục --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-code">Mã vật tư *</Label>
          <Input
            id="mat-code"
            {...register('code')}
            disabled={editing}
            placeholder="VD: LED-WARM-10M, WOOD-PLANK-2M..."
            className="mt-1 font-mono uppercase"
          />
          {errors.code && <p className="text-xs text-destructive mt-1">{errors.code.message}</p>}
          {editing && (
            <p className="text-xs text-muted-foreground mt-1">Mã vật tư không thể đổi sau khi tạo</p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-name">Tên vật tư *</Label>
          <Input
            id="mat-name"
            {...register('name')}
            placeholder="VD: Dây đèn LED vàng 10m cuộn tròn..."
            className="mt-1"
          />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="mat-unit">Đơn vị tính *</Label>
            {isUnitLocked && (
              <span className="flex items-center gap-1 text-[11px] text-amber-500 font-medium">
                <Lock className="size-3" /> Đã phát sinh giao dịch - Đơn vị tính bị khóa
              </span>
            )}
          </div>
          <Input
            id="mat-unit"
            {...register('unit')}
            disabled={isUnitLocked}
            placeholder="VD: cuộn, cây, tấm, mét, thùng..."
            className="mt-1"
          />
          {errors.unit && <p className="text-xs text-destructive mt-1">{errors.unit.message}</p>}
          {isUnitLocked ? (
            <div className="flex items-start gap-1.5 mt-1.5 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
              <Info className="size-4 shrink-0 mt-0.5 text-amber-500" />
              <span>
                Vật tư này đã có giao dịch hoặc nhu cầu ghi nhận trong kho. Việc đổi đơn vị tính bị hệ thống khóa để đảm bảo toàn vẹn số lượng.
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Đơn vị đo lường cơ sở cho toàn bộ các nhu cầu và xuất/nhập kho.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="mat-desc">Mô tả / Ghi chú</Label>
          <Textarea
            id="mat-desc"
            {...register('description')}
            rows={2}
            placeholder="Chi tiết quy cách, kích thước, chủng loại..."
            className="mt-1"
          />
          {errors.description && (
            <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
