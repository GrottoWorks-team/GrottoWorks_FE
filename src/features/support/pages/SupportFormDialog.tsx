// Dialog tạo yêu cầu hỗ trợ (leader): kind select, detail textarea, khu vực
// khóa về khu leader lãnh (1 khu → ẩn select, nhiều khu → chọn trong list).
// RHF + zod, message = i18n key. Create POST status 'OPEN'.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCreateSupportRequest } from '../api'
import type { SupportRequest, WorkArea } from '@/types'

export const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const KINDS: SupportRequest['kind'][] = ['PEOPLE', 'SKILL', 'MATERIAL']

// kind là string trong form (option '' placeholder), ép về enum lúc submit.
const schema = z.object({
  areaId: z.string().min(1, 'features.support.areaRequired'),
  kind: z.string().min(1, 'features.support.kindRequired'),
  detail: z.string().trim().min(1, 'features.support.detailRequired'),
})
type FormData = z.infer<typeof schema>

export function SupportFormDialog({
  myAreas,
  onClose,
}: {
  myAreas: WorkArea[] // khu leader lãnh — tối thiểu 1 (page đã chặn)
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateSupportRequest()
  const fixedAreaId = myAreas.length === 1 ? myAreas[0].id : undefined

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount có điều kiện → defaultValues theo prop là đủ.
    defaultValues: { areaId: fixedAreaId ?? '', kind: '', detail: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await create.mutateAsync({
        areaId: data.areaId,
        kind: data.kind as SupportRequest['kind'],
        detail: data.detail,
        status: 'OPEN',
      })
      toast(t('features.support.created'))
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
      title={t('features.support.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="support-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="support-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {fixedAreaId ? null : (
          <div>
            <Label htmlFor="support-area">{t('features.support.area')}</Label>
            <select id="support-area" className={SELECT_CLS} {...register('areaId')}>
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
          <Label htmlFor="support-kind">{t('features.support.kind')}</Label>
          <select id="support-kind" className={SELECT_CLS} {...register('kind')}>
            <option value="">{t('features.tasks.selectPlaceholder')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`features.support.kind.${k}`)}
              </option>
            ))}
          </select>
          {err(errors.kind?.message)}
        </div>
        <div>
          <Label htmlFor="support-detail">{t('features.support.detail')}</Label>
          <textarea id="support-detail" rows={3} className={TEXTAREA_CLS} {...register('detail')} />
          {err(errors.detail?.message)}
        </div>
      </form>
    </Dialog>
  )
}
