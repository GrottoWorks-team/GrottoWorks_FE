import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateSkill } from '@/features/skills/api'

const schema = z.object({
  code: z.string().trim().min(2, 'Mã kỹ năng tối thiểu 2 ký tự').toUpperCase(),
  name: z.string().trim().min(2, 'Tên kỹ năng tối thiểu 2 ký tự'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SkillDialog({ open, onOpenChange }: SkillDialogProps) {
  const toast = useToast()
  const createSkill = useCreateSkill()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await createSkill.mutateAsync({
        code: data.code,
        name: data.name,
        description: data.description || null,
      })
      toast('Thêm kỹ năng mới thành công!')
      reset()
      onOpenChange(false)
    } catch (err: any) {
      toast(err.message || 'Không thể tạo kỹ năng', 'alert')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-grotto-border">
        <DialogHeader>
          <DialogTitle className="text-grotto-text font-bold">Thêm Kỹ Năng Mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-code">Mã kỹ năng *</Label>
            <Input
              id="skill-code"
              placeholder="VD: DIEN, MOC, HAN"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-name">Tên kỹ năng *</Label>
            <Input
              id="skill-name"
              placeholder="VD: Sửa chữa điện"
              {...register('name')}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-desc">Mô tả chi tiết</Label>
            <Input
              id="skill-desc"
              placeholder="Mô tả kỹ năng cần thiết..."
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-grotto-primary hover:bg-grotto-primary/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang lưu...' : 'Thêm kỹ năng'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
