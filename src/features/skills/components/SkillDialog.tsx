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
      size="md"
      title={skill ? 'Cập nhật kỹ năng' : 'Thêm kỹ năng mới'}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" form="skill-form" disabled={isSubmitting}>
            {isSubmitting ? 'Đang lưu...' : skill ? 'Lưu thay đổi' : 'Thêm kỹ năng'}
          </Button>
        </>
      }
    >
      <form id="skill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="skill-code">Mã kỹ năng *</Label>
          <Input
            id="skill-code"
            placeholder="VD: DIEN, MOC, HAN"
            disabled={Boolean(skill)}
            {...register('code')}
          />
          {errors.code && (
            <p className="mt-1 text-xs font-semibold text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-name">Tên kỹ năng *</Label>
          <Input id="skill-name" placeholder="VD: Sửa chữa điện" {...register('name')} />
          {errors.name && (
            <p className="mt-1 text-xs font-semibold text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-desc">Mô tả chi tiết</Label>
          <Input id="skill-desc" placeholder="Mô tả kỹ năng cần thiết..." {...register('description')} />
        </div>
      </form>
    </Dialog>
  )
}
