// Dialog thêm đồ mượn: name, owner, khu (khóa khi officer lãnh 1 khu),
// expectedReturn (input date). RHF + zod, message = i18n key.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateBorrowed } from '../api'
import type { WorkArea } from '@/types'

export const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const schema = z.object({
  name: z.string().trim().min(1, 'features.borrowed.nameRequired'),
  owner: z.string().trim().min(1, 'features.borrowed.ownerRequired'),
  areaId: z.string().min(1, 'features.borrowed.areaRequired'),
  expectedReturn: z.string().min(1, 'features.borrowed.dateRequired'),
})
type FormData = z.infer<typeof schema>

export function BorrowFormDialog({
  myAreas,
  onClose,
}: {
  myAreas: WorkArea[] // khu officer phụ trách — tối thiểu 1 (page đã chặn)
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateBorrowed()
  const fixedAreaId = myAreas.length === 1 ? myAreas[0].id : undefined

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', owner: '', areaId: fixedAreaId ?? '', expectedReturn: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync(data)
      toast(t('features.borrowed.created', { name: data.name }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.borrowed.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="borrow-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="borrow-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="borrow-name">{t('features.borrowed.name')}</Label>
          <Input id="borrow-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>
        <div>
          <Label htmlFor="borrow-owner">{t('features.borrowed.owner')}</Label>
          <Input id="borrow-owner" {...register('owner')} />
          {err(errors.owner?.message)}
        </div>
        {fixedAreaId ? null : (
          <div>
            <Label htmlFor="borrow-area">{t('features.borrowed.area')}</Label>
            <select id="borrow-area" className={SELECT_CLS} {...register('areaId')}>
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {myAreas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {err(errors.areaId?.message)}
          </div>
        )}
        <div>
          <Label htmlFor="borrow-return">{t('features.borrowed.expectedReturn')}</Label>
          {/* jsdom/test gõ date qua fireEvent.change — input type=date native. */}
          <Input id="borrow-return" type="date" {...register('expectedReturn')} />
          {err(errors.expectedReturn?.message)}
        </div>
      </form>
    </Dialog>
  )
}
