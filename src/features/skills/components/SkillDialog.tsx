import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateSkill, useUpdateSkill } from '@/features/skills/api'
import type { SkillDto } from '@/types/identity'

const schema = z.object({
  code: z.string().trim().min(2, 'Mã kỹ năng tối thiểu 2 ký tự').toUpperCase(),
  name: z.string().trim().min(2, 'Tên kỹ năng tối thiểu 2 ký tự'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: SkillDto | null
}

export function SkillDialog({ open, onOpenChange, skill }: SkillDialogProps) {
  const toast = useToast()
  const createSkill = useCreateSkill()
  const updateSkill = useUpdateSkill()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: skill?.code || '',
      name: skill?.name || '',
      description: skill?.description || '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: skill?.code || '',
        name: skill?.name || '',
        description: skill?.description || '',
      })
    }
  }, [open, skill, reset])

  const onSubmit = async (data: FormData) => {
    try {
      if (skill) {
        await updateSkill.mutateAsync({
          skillId: skill.id,
          name: data.name,
          description: data.description || null,
        })
        toast('Cập nhật kỹ năng thành công!')
      } else {
        await createSkill.mutateAsync({
          code: data.code,
          name: data.name,
          description: data.description || null,
        })
        toast('Thêm kỹ năng mới thành công!')
      }
      reset()
      onOpenChange(false)
    } catch (err: any) {
      toast(err.message || 'Thao tác không thành công', 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={skill ? 'Cập Nhật Kỹ Năng' : 'Thêm Kỹ Năng Mới'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="skill-form"
            className="bg-grotto-primary hover:bg-grotto-primary/90 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : skill ? 'Lưu thay đổi' : 'Thêm kỹ năng'}
          </Button>
        </div>
      }
    >
      <form id="skill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
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
      </form>
    </Dialog>
  )
}

