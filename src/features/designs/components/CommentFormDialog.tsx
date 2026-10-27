// Dialog tạo/sửa một yêu cầu chỉnh sửa (DesignComment). Dùng RHF + zod theo
// đúng quy ước form của dự án. Khi mở từ chế độ "thêm marker", dialog nhận
// sẵn `point` (toạ độ chuẩn hoá 0..1) và cho phép bỏ gắn vị trí.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { MapPin, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useUsers } from '@/features/users/api'
import type { DesignComment, DesignCommentPriority, DesignCommentStatus } from '@/types'
import { errorMessage } from '@/lib/errorMessage'
import { useCreateDesignComment, useUpdateDesignComment } from '../api'
import type { ReviewPoint } from '../position'

const PRIORITIES: DesignCommentPriority[] = ['LOW', 'MEDIUM', 'HIGH']
const STATUSES: DesignCommentStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const schema = z.object({
  title: z.string().trim().min(1, 'features.design.titleRequired'),
  description: z.string().trim().max(500, 'features.design.descriptionMax'),
  priority: z.string().min(1),
  status: z.string().min(1),
  assignedTo: z.string(),
})
type FormData = z.infer<typeof schema>

export function CommentFormDialog({
  versionId,
  comment,
  point,
  createdBy,
  onClose,
}: {
  versionId: string
  /** Có giá trị = đang sửa; không có = tạo mới. */
  comment?: DesignComment | null
  /** Vị trí vừa click trên ảnh/model (chỉ khi tạo mới có marker). */
  point?: ReviewPoint | null
  createdBy: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [] } = useUsers()
  const create = useCreateDesignComment()
  const update = useUpdateDesignComment()

  // Bỏ gắn vị trí: chuyển comment thành góp ý tổng quát (positionType NONE).
  const [position, setPosition] = useStatePoint(comment, point)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: comment?.title ?? '',
      description: comment?.description ?? '',
      priority: comment?.priority ?? 'MEDIUM',
      status: comment?.status ?? 'OPEN',
      assignedTo: comment?.assignedTo ?? '',
    },
  })

  const onSubmit = async (data: FormData) => {
    const now = new Date().toISOString()
    const fields = {
      title: data.title.trim(),
      description: data.description.trim() || undefined,
      priority: data.priority as DesignCommentPriority,
      status: data.status as DesignCommentStatus,
      assignedTo: data.assignedTo || undefined,
    }
    try {
      if (comment) {
        const patch: Partial<Omit<DesignComment, 'id'>> & { id: string } = {
          id: comment.id,
          ...fields,
          updatedAt: now,
        }
        if (!position) {
          // Bỏ gắn vị trí → thành góp ý tổng quát.
          patch.positionType = 'NONE'
          patch.position2D = undefined
          patch.position3D = undefined
        }
        await update.mutateAsync(patch)
        toast(t('features.design.commentUpdated'))
      } else {
        await create.mutateAsync({
          ...fields,
          designVersionId: versionId,
          positionType: position?.type ?? 'NONE',
          position2D: position?.type === 'IMAGE_2D' ? position.point : undefined,
          position3D: position?.type === 'MODEL_3D' ? position.point : undefined,
          createdBy,
          createdAt: now,
          updatedAt: now,
        })
        toast(t('features.design.commentCreated'))
      }
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
      title={comment ? t('features.design.editComment') : t('features.design.addComment')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="design-comment-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="design-comment-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {position ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-brand-pine/30 bg-brand-pineLight px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-pine">
              <MapPin className="size-3.5" />
              {position.type === 'IMAGE_2D'
                ? t('features.design.positionAttached', {
                    x: position.point.x.toFixed(2),
                    y: position.point.y.toFixed(2),
                  })
                : t('features.design.positionAttached3d', {
                    x: position.point.x.toFixed(2),
                    y: position.point.y.toFixed(2),
                    z: position.point.z.toFixed(2),
                  })}
            </span>
            <button
              type="button"
              onClick={() => setPosition(null)}
              aria-label={t('features.design.removePosition')}
              className="rounded-full p-0.5 text-brand-pine hover:bg-brand-pine/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t('features.design.generalCommentHint')}
          </p>
        )}

        <div>
          <Label htmlFor="design-comment-title">{t('features.design.commentTitle')}</Label>
          <Input id="design-comment-title" {...register('title')} />
          {errors.title && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.title.message ?? '')}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="design-comment-desc">{t('features.design.commentDescription')}</Label>
          <textarea
            id="design-comment-desc"
            rows={3}
            className={cn(SELECT_CLS, 'h-auto py-2')}
            {...register('description')}
          />
          {errors.description && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.description.message ?? '')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="design-comment-priority">{t('features.design.priorityLabel')}</Label>
            <select id="design-comment-priority" className={SELECT_CLS} {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`features.design.priority.${p}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="design-comment-status">{t('common.status')}</Label>
            <select id="design-comment-status" className={SELECT_CLS} {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="design-comment-assignee">{t('features.design.assignee')}</Label>
          <select id="design-comment-assignee" className={SELECT_CLS} {...register('assignedTo')}>
            <option value="">{t('features.design.assigneeNone')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Dialog>
  )
}

// Tách riêng để initial state chỉ tính 1 lần, tránh reset khi re-render.
function useStatePoint(comment?: DesignComment | null, point?: ReviewPoint | null) {
  const [position, setPosition] = useState<ReviewPoint | null>(() => {
    if (point) return point
    if (comment?.positionType === 'IMAGE_2D' && comment.position2D) {
      return { type: 'IMAGE_2D', point: comment.position2D }
    }
    if (comment?.positionType === 'MODEL_3D' && comment.position3D) {
      return { type: 'MODEL_3D', point: comment.position3D }
    }
    return null
  })
  return [position, setPosition] as const
}
