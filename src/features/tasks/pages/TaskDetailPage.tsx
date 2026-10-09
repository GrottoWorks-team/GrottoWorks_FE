// Chi tiết việc (LEADER, route /leader/tasks/:id): 2 cột — trái info panel
// (mọi field + materials chips + StatusTag) + timeline (submittedNotes +
// status hiện tại); phải assignee chips (X = bỏ phân công), dialog phân công
// TNV (sort khớp kỹ năng lên đầu) và các nút chuyển trạng thái.
// Mount dưới /community/* → read-only (không nút thao tác).
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Calendar, Camera, Check, Clock, MapPin, Package, Plus, Sparkles, UserPlus, Users, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useUsers } from '@/features/users/api'
import {
  useApproveCompletion,
  useAssignVolunteer,
  useRequestRevision,
  useSubmitReview,
  useTask,
  useUnassign,
  useUpdateTask,
} from '../api'
import type { Task, User } from '@/types'
import { viDate } from '@/lib/format'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// 1 dòng TNV trong dialog phân công: tự dùng hook assign theo user đó.
function VolunteerRow({ task, user }: { task: Task; user: User }) {
  const { t } = useTranslation()
  const toast = useToast()
  const assign = useAssignVolunteer(task.id, user.id)
  const assigned = task.assignees.includes(user.id)
  const matched = user.skills.filter((s) => task.skills.includes(s))
  const onAssign = async () => {
    try {
      await assign.mutateAsync()
      toast(t('features.tasks.assigned', { name: user.name }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 hover:border-brand-pine/30 hover:bg-muted/30 transition-all">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-brand-pine/10 text-xs font-bold text-brand-pine">
            {user.name.charAt(0)}
          </span>
          <p className="text-sm font-semibold text-foreground">{user.name}</p>
        </div>
        {matched.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {matched.map((s) => (
              <span key={s} className="inline-flex items-center rounded-full bg-brand-pine/10 px-2 py-0.5 text-[10px] font-semibold text-brand-pine">
                ✓ {s}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">{t('features.tasks.skills')}: {user.skills.join(', ') || '—'}</p>
        )}
      </div>
      <Button size="sm" variant={assigned ? 'outline' : 'default'} disabled={assigned} onClick={onAssign} className={assigned ? '' : 'bg-brand-pine hover:bg-brand-pineHover text-white'}>
        {assigned ? <Check className="size-4" /> : <Plus className="size-4" />}
        {assigned ? t('features.tasks.assignedShort') : t('features.tasks.assignVolunteer')}
      </Button>
    </div>
  )
}

// Dialog phân công: mọi user, khớp kỹ năng nhiều nhất đứng đầu.
function AssignDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation()
  const { data: users = [] } = useUsers()
  const ranked = [...users].sort(
    (a, b) =>
      b.skills.filter((s) => task.skills.includes(s)).length -
      a.skills.filter((s) => task.skills.includes(s)).length,
  )
  return (
    <Dialog open onClose={onClose} title={t('features.tasks.assignTitle')}>
      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {ranked.map((u) => (
          <VolunteerRow key={u.id} task={task} user={u} />
        ))}
      </div>
    </Dialog>
  )
}

// Assignee chip + nút X bỏ phân công (ẩn X khi readOnly).
function AssigneeChip({ taskId, user, readOnly }: { taskId: string; user: User; readOnly?: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const unassign = useUnassign(taskId, user.id)
  const onUnassign = async () => {
    try {
      await unassign.mutateAsync()
      toast(t('features.tasks.unassigned', { name: user.name }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-sm hover:border-brand-pine/30 transition-all">
      <span className="grid size-5 place-items-center rounded-full bg-brand-pine/15 text-[10px] font-bold text-brand-pine">
        {user.name.charAt(0)}
      </span>
      <span className="text-xs font-semibold text-foreground">{user.name}</span>
      {!readOnly && (
        <button
          type="button"
          aria-label={t('features.tasks.unassign', { name: user.name })}
          onClick={onUnassign}
          className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// Dialog 1 textarea (note nộp duyệt / lý do sửa) — controlled state, không
// cần RHF cho 1 field.
function NoteDialog({
  title,
  label,
  requiredMsg,
  submitLabel,
  onSubmit,
  onClose,
}: {
  title: string
  label: string
  requiredMsg: string
  submitLabel: string
  onSubmit: (note: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')
  const [error, setError] = useState(false)
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => {
              if (!note.trim()) {
                setError(true)
                return
              }
              onSubmit(note.trim())
            }}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <div>
        <Label htmlFor="task-note">{label}</Label>
        <textarea
          id="task-note"
          rows={3}
          className={TEXTAREA_CLS}
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setError(false)
          }}
        />
        {error && <p className="mt-1 text-xs font-semibold text-destructive">{requiredMsg}</p>}
      </div>
    </Dialog>
  )
}

export default function TaskDetailPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const readOnly = pathname.startsWith('/community/')

  const { data: task, isPending } = useTask(id)
  const { data: areas = [] } = useAreas()
  const { data: users = [] } = useUsers()
  const { data: materials = [] } = useMaterials(task?.areaId)

  const update = useUpdateTask()
  const submitReview = useSubmitReview(id)
  const requestRevision = useRequestRevision(id)
  const approve = useApproveCompletion(id)

  const [assigning, setAssigning] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [approving, setApproving] = useState(false)
  const [revising, setRevising] = useState(false)

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast(msg)
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  if (isPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (!task) {
    return (
      <div>
        <PageHeader title={t('features.tasks.title')} actions={
          <Button variant="outline" onClick={() => navigate('/leader/tasks')}>
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Button>
        } />
        <EmptyState text={t('features.tasks.notFound')} />
      </div>
    )
  }

  const area = areas.find((a) => a.id === task.areaId)
  const taskMaterials = materials.filter((m) => task.materialIds.includes(m.id))
  const assignees = users.filter((u) => task.assignees.includes(u.id))

  // Info panel: icon + label + value in clean card.
  const statBox = (Icon: typeof Users, label: string, value: string) => (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      <span className="grid size-9 place-items-center rounded-md bg-card shadow-xs text-brand-pine">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="tabular text-sm font-bold text-foreground">{value}</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        sub={`${area?.name ?? '—'} · ${viDate(task.dueDate)}`}
        actions={
          <Button variant="outline" onClick={() => navigate('/leader/tasks')}>
            <ArrowLeft className="size-4" />
            {t('common.back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trái: info + timeline. */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{task.description || t('features.tasks.noDescription')}</p>
              <StatusTag status={task.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statBox(MapPin, t('features.tasks.area'), area?.name ?? '—')}
              {statBox(Clock, t('features.tasks.estimateHours'), `${task.estimateHours} ${t('features.tasks.hours')}`)}
              {statBox(Users, t('features.tasks.volunteersNeeded'), `${task.assignees.length}/${task.volunteersNeeded}`)}
              {statBox(Calendar, t('features.tasks.dueDate'), viDate(task.dueDate))}
            </div>

            <div className="space-y-4 pt-2 border-t border-border/60">
              <div>
                <p className="lbl-mono mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="size-3.5 text-brand-gold" />
                  {t('features.tasks.skills')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {task.skills.length ? (
                    task.skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <div>
                <p className="lbl-mono mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Package className="size-3.5 text-brand-pine" />
                  {t('features.tasks.materials')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {taskMaterials.length ? (
                    taskMaterials.map((m) => (
                      <span key={m.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium shadow-xs">
                        <span className="size-1.5 rounded-full bg-brand-pine" />
                        {m.name} <span className="text-muted-foreground font-normal">({m.unit})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('features.tasks.materialNone')}</span>
                  )}
                </div>
              </div>

              <div>
                <p className="lbl-mono mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Camera className="size-3.5 text-brand-pine" />
                  {t('features.tasks.photos')}
                </p>
                <div className="flex items-center gap-2">
                  <span className="tabular text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                    {task.submittedPhotos} {t('features.tasks.photos')}
                  </span>
                  {Array.from({ length: Math.min(task.submittedPhotos, 6) }).map((_, i) => (
                    <div
                      key={i}
                      aria-hidden
                      className="size-9 rounded-md border border-border bg-muted/40 flex items-center justify-center text-muted-foreground/50"
                    >
                      <Camera className="size-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <p className="lbl-mono">{t('features.tasks.timeline')}</p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <StatusTag status={task.status} />
                <span className="text-sm text-muted-foreground">{viDate(task.dueDate)}</span>
              </div>
              {task.submittedNotes && (
                <p className="rounded-card border border-border bg-card p-3 text-sm text-foreground">
                  <span className="lbl-mono mr-2">{t('features.tasks.notes')}</span>
                  {task.submittedNotes}
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Phải: assignees + thao tác leader. */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="lbl-mono">
                {t('features.tasks.assignees')}{' '}
                <span className="tabular">
                  {task.assignees.length}/{task.volunteersNeeded}
                </span>
              </p>
              {!readOnly && (
                <Button size="sm" onClick={() => setAssigning(true)}>
                  <UserPlus className="size-4" />
                  {t('features.tasks.assign')}
                </Button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {assignees.length ? (
                assignees.map((u) => (
                  <AssigneeChip key={u.id} taskId={task.id} user={u} readOnly={readOnly} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('features.tasks.assignNone')}</p>
              )}
            </div>
          </Card>

          {!readOnly && (
            <Card className="space-y-2 p-6">
              <p className="lbl-mono">{t('common.actions')}</p>
              {task.status === 'TODO' && (
                <Button
                  className="w-full"
                  onClick={() =>
                    run(
                      () => update.mutateAsync({ id: task.id, status: 'DOING' }),
                      t('features.tasks.started', { name: task.title }),
                    )
                  }
                >
                  {t('features.tasks.start')}
                </Button>
              )}
              {task.status === 'DOING' && (
                <Button className="w-full" onClick={() => setReviewing(true)}>
                  {t('features.tasks.submitReview')}
                </Button>
              )}
              {task.status === 'REVIEW' && (
                <>
                  <Button className="w-full" onClick={() => setApproving(true)}>
                    <Check className="size-4" />
                    {t('features.tasks.approve')}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setRevising(true)}>
                    {t('features.tasks.requestRevision')}
                  </Button>
                </>
              )}
              {task.status === 'REVISE' && (
                <Button
                  className="w-full"
                  onClick={() =>
                    run(
                      () => update.mutateAsync({ id: task.id, status: 'DOING' }),
                      t('features.tasks.reopened', { name: task.title }),
                    )
                  }
                >
                  {t('features.tasks.reopen')}
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>

      {assigning && <AssignDialog task={task} onClose={() => setAssigning(false)} />}
      {reviewing && (
        <NoteDialog
          title={t('features.tasks.reviewTitle')}
          label={t('features.tasks.reviewNote')}
          requiredMsg={t('features.tasks.noteRequired')}
          submitLabel={t('features.tasks.submitReview')}
          onSubmit={(n) => {
            void run(
              () => submitReview.mutateAsync(n),
              t('features.tasks.reviewSubmitted', { name: task.title }),
            )
            setReviewing(false)
          }}
          onClose={() => setReviewing(false)}
        />
      )}
      {revising && (
        <NoteDialog
          title={t('features.tasks.revisionTitle')}
          label={t('features.tasks.revisionNote')}
          requiredMsg={t('features.tasks.reasonRequired')}
          submitLabel={t('features.tasks.requestRevision')}
          onSubmit={(n) => {
            void run(
              () => requestRevision.mutateAsync(n),
              t('features.tasks.revisionRequested', { name: task.title }),
            )
            setRevising(false)
          }}
          onClose={() => setRevising(false)}
        />
      )}
      <ConfirmDialog
        open={approving}
        title={t('features.tasks.approveTitle')}
        description={t('features.tasks.approveConfirm', { name: task.title })}
        confirmLabel={t('features.tasks.approve')}
        onConfirm={() =>
          run(() => approve.mutateAsync(), t('features.tasks.approved', { name: task.title }))
        }
        onClose={() => setApproving(false)}
      />
    </div>
  )
}
