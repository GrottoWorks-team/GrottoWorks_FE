// Tạo hồ sơ thiết kế (2D) cho một khu vực.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { errorMessage } from '@/lib/errorMessage'
import { useCreateDesign } from '../api'

const schema = z.object({
  title: z.string().trim().min(1, 'features.design.titleRequired'),
  description: z.string().trim().max(300, 'features.design.descriptionMax'),
  designType: z.enum(['TWO_D', 'THREE_D']),
})
type FormData = z.infer<typeof schema>

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const TEXTAREA_CLS =
  'flex min-h-[72px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export function NewDesignDialog({
  areaId,
  createdBy,
  onCreated,
  onClose,
}: {
  areaId: string
  createdBy: string
  onCreated: (designId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateDesign()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', designType: 'TWO_D' },
  })

  const onSubmit = async (data: FormData) => {
    const now = new Date().toISOString()
    try {
      const design = await create.mutateAsync({
        areaId,
        title: data.title.trim(),
        description: data.description.trim() || undefined,
        designType: data.designType,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      toast(t('features.design.designCreated'))
      onCreated(design.id)
      onClose()
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t('features.design.createDesign')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="new-design-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="new-design-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="design-type">{t('features.design.designType')}</Label>
          <select id="design-type" className={SELECT_CLS} {...register('designType')}>
            <option value="TWO_D">{t('features.design.type2d')}</option>
            <option value="THREE_D">{t('features.design.type3d')}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="design-title">{t('features.design.designTitle')}</Label>
          <Input id="design-title" {...register('title')} />
          {errors.title && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.title.message ?? '')}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="design-desc">{t('features.design.designDescription')}</Label>
          <textarea
            id="design-desc"
            rows={3}
            className={cn(TEXTAREA_CLS)}
            placeholder={t('features.design.designDescriptionPlaceholder')}
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.description.message ?? '')}
            </p>
          )}
        </div>
      </form>
    </Dialog>
  )
}
