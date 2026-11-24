import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import i18n from '@/lib/i18n'

const schema = z.object({
  code: z.string().trim().min(2, i18n.t('features.skills.codeMin')).toUpperCase(),
  name: z.string().trim().min(2, i18n.t('features.skills.nameMin')),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill?: SkillDto | null
}

export function SkillDialog({ open, onOpenChange, skill }: SkillDialogProps) {
  const { t } = useTranslation()
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
        toast(t('features.skills.updated'))
      } else {
        await createSkill.mutateAsync({
          code: data.code,
          name: data.name,
          description: data.description || null,
        })
        toast(t('features.skills.created'))
      }
      reset()
      onOpenChange(false)
    } catch (err: any) {
      toast(err.message || t('features.skills.failed'), 'alert')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={skill ? t('features.skills.editTitle') : t('features.skills.createTitle')}
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
            {isSubmitting ? t('common.saving') : skill ? t('common.saveChanges') : t('features.skills.create')}
          </Button>
        </div>
      }
    >
      <form id="skill-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="skill-code">{t('features.skills.codeLabel')}</Label>
          <Input
            id="skill-code"
            placeholder="VD: DIEN, MOC, HAN"
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-name">{t('features.skills.nameLabel')}</Label>
          <Input
            id="skill-name"
            placeholder={t('features.skills.namePlaceholder')}
            {...register('name')}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill-desc">{t('features.skills.descLabel')}</Label>
          <Input
            id="skill-desc"
            placeholder={t('features.skills.descPlaceholder')}
            {...register('description')}
          />
        </div>
      </form>
    </Dialog>
  )
}

