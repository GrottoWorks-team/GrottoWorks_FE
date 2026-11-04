// Chi tiết việc (LEADER, route /leader/tasks/:id): 2 cột — trái info panel
// (mọi field + materials chips + StatusTag) + timeline (submittedNotes +
// status hiện tại); phải assignee chips và thao tác trạng thái.
// Mount dưới /community/* → read-only (không nút thao tác).
//
// PHẠM VI API THẬT: task có đủ vòng đời (ready → progress/submit → duyệt hoàn thành)
// và phân công TNV (assign / accept / decline) — xem API-GAP-STATUS-2026-11-04.md §2.2.
// Phần còn thiếu so với nghiệp vụ: §3-A8 (mobile chưa có `assignmentId`).
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Calendar, Clock, Edit3, MapPin, Package, Plus, Sparkles, UserPlus, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import {
  getTaskEvidenceUrl,
  useApproveTask,
  useAssignVolunteer,
  useCancelTask,
  useReadyTask,
  useReplaceCompletionCriteria,
  useReplaceTaskMaterials,
  useReplaceTaskSkills,
  useRequestTaskRevision,
  useSkillsCatalog,
  useTask,
  useTaskAssignments,
  useTaskProgress,
  useTaskReviewPackage,
  useVolunteerMatches,
} from '../api'
import { useUsers } from '@/features/users/api'
import { ApiError } from '@/lib/api'
import { viDate, viDateTime } from '@/lib/format'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function TaskDetailPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const readOnly = pathname.startsWith('/community/')

  const { data: task, isPending } = useTask(id)
  const { data: areas = [] } = useAreas()
  const { data: materials = [] } = useMaterials(task?.areaId)

  const ready = useReadyTask()
  const replaceCriteria = useReplaceCompletionCriteria()
  const replaceSkills = useReplaceTaskSkills()
  const approveTask = useApproveTask()
  const requestRevision = useRequestTaskRevision()
  const { data: progress = [], isPending: progressPending } = useTaskProgress(task?.id)
  const { data: reviewPackage } = useTaskReviewPackage(
    task?.id,
    !readOnly && task?.backendStatus === 'SUBMITTED',
  )
  const { data: assignments = [], isPending: assignmentsPending } = useTaskAssignments(task?.id)
  const assignVolunteer = useAssignVolunteer()
  const cancelTask = useCancelTask()
  const replaceMaterials = useReplaceTaskMaterials()
  const { data: users = [] } = useUsers({ withSkills: false })
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const { data: skillsCatalog = [] } = useSkillsCatalog()
  const [editingCriteria, setEditingCriteria] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignVolunteerId, setAssignVolunteerId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [materialsOpen, setMaterialsOpen] = useState(false)
  const [materialRows, setMaterialRows] = useState<Array<{ materialId: string; quantity: string }>>([
    { materialId: '', quantity: '1' },
  ])
  const [savedMaterials, setSavedMaterials] = useState<string[]>([])
  const [revisionOpen, setRevisionOpen] = useState(false)
  const { data: volunteerMatches = [] } = useVolunteerMatches(task?.id, assignOpen && !readOnly)
  const [revisionReason, setRevisionReason] = useState('')
  const [criteriaValue, setCriteriaValue] = useState('')
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast(msg)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
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
  const displayMaterials = savedMaterials.length
    ? materials.filter((m) => savedMaterials.includes(m.id))
    : taskMaterials

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
              {statBox(Users, t('features.tasks.volunteersNeeded'), String(task.volunteersNeeded))}
              {statBox(Calendar, t('features.tasks.dueDate'), viDate(task.dueDate))}
            </div>

            <div className="space-y-4 pt-2 border-t border-border/60">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="lbl-mono flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="size-3.5 text-brand-gold" />
                    {t('features.tasks.skillsRequiredTitle')}
                  </p>
                  {/* BE chỉ cho sửa task khi còn OPEN (sau POST /ready mọi PATCH/PUT = 409). */}
                  {!readOnly && task.backendStatus === 'OPEN' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-brand-pine hover:text-brand-pine hover:bg-brand-pine/10"
                      onClick={() => {
                        // Khởi tạo các skill đã chọn từ task
                        const matchedIds = skillsCatalog
                          .filter((sk) => task.skills.includes(sk.name) || task.skills.includes(sk.code))
                          .map((sk) => sk.id)
                        setSelectedSkills(matchedIds)
                        setEditingSkills(true)
                      }}
                    >
                      <Edit3 className="size-3 mr-1" />
                      {t('common.edit')}
                    </Button>
                  )}
                </div>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="lbl-mono flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Package className="size-3.5 text-brand-pine" />
                    {t('features.tasks.materials')}
                  </p>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-brand-pine hover:bg-brand-pine/10 hover:text-brand-pine"
                      onClick={() => setMaterialsOpen(true)}
                    >
                      <Edit3 className="size-3 mr-1" />
                      {t('features.tasks.assignMaterials')}
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {displayMaterials.length ? (
                    displayMaterials.map((m) => (
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

          {/* G5: Khối Tiêu chí hoàn thành (completionCriteria) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="lbl-mono text-sm font-semibold text-foreground">{t('features.tasks.completionCriteriaTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('features.tasks.completionCriteriaSub')}</p>
              </div>
              {!readOnly && task.backendStatus === 'OPEN' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCriteriaValue(task.submittedNotes || '')
                    setEditingCriteria(true)
                  }}
                >
                  <Edit3 className="size-4 mr-1" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
            {task.submittedNotes ? (
              <p className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {task.submittedNotes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t('features.tasks.completionCriteriaEmpty')}
              </p>
            )}
          </Card>

          {/* Tiến độ & nghiệm thu: GET /tasks/{taskId}/progress */}
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="lbl-mono text-sm font-semibold text-foreground">
                  {t('features.tasks.progressTitle')}
                </p>
                <p className="text-xs text-muted-foreground">{t('features.tasks.progressSub')}</p>
              </div>
              {reviewPackage && (
                <span className="tabular shrink-0 rounded-full bg-brand-pine/10 px-2.5 py-1 text-xs font-semibold text-brand-pine">
                  {t('features.tasks.approvedHoursValue', { hours: reviewPackage.approvedHours })}
                </span>
              )}
            </div>
            {progressPending ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : progress.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{t('features.tasks.progressEmpty')}</p>
            ) : (
              <ol className="space-y-3">
                {progress.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tabular font-semibold text-foreground">
                        {entry.percentComplete}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {viDateTime(entry.submittedAt)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{entry.note}</p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {entry.isSubmission && (
                        <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 font-semibold text-amber-900 dark:text-amber-200">
                          {t('features.tasks.progressSubmission')}
                        </span>
                      )}
                      {entry.evidence.map((file) => (
                        <button
                          key={file.fileId}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-semibold text-foreground hover:bg-muted/30"
                          onClick={async () => {
                            try {
                              const url = await getTaskEvidenceUrl(task.id, entry.id, file.fileId)
                              window.open(url, '_blank', 'noopener,noreferrer')
                            } catch (error) {
                              toast(
                                error instanceof ApiError ? error.message : t('common.error'),
                                'alert',
                              )
                            }
                          }}
                        >
                          <Package className="size-3" aria-hidden />
                          {file.caption || t('features.tasks.progressEvidenceOne')}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Phải: phân công tình nguyện viên + thao tác trạng thái. */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="lbl-mono">{t('features.tasks.assignees')}</p>
              {!readOnly && (
                <Button variant="ghost" size="sm" onClick={() => setAssignOpen(true)}>
                  <UserPlus className="size-4" />
                  {t('features.tasks.assignVolunteer')}
                </Button>
              )}
            </div>
            {assignmentsPending ? (
              <p className="mt-2 text-xs text-muted-foreground">{t('common.loading')}</p>
            ) : assignments.length === 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {t('features.tasks.assignmentsEmpty')}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {assignments.map((assignment) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                  >
                    <span className="truncate text-sm font-semibold text-foreground">
                      {userNameById.get(assignment.volunteerId) ?? assignment.volunteerId}
                    </span>
                    <StatusTag status={assignment.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {!readOnly && (
            <Card className="space-y-2 p-6">
              <p className="lbl-mono">{t('common.actions')}</p>
              {/* POST /tasks/{id}/ready là chuyển trạng thái duy nhất BE hỗ trợ. */}
              {task.backendStatus === 'OPEN' && (
                <Button
                  className="w-full"
                  onClick={() =>
                    run(
                      () => ready.mutateAsync({ taskId: task.id, version: task.version }),
                      t('features.tasks.released', { name: task.title }),
                    )
                  }
                >
                  {t('features.tasks.release')}
                </Button>
              )}
              {task.backendStatus === 'SUBMITTED' && (
                <>
                  <Button
                    className="w-full"
                    disabled={approveTask.isPending}
                    onClick={() =>
                      run(
                        () =>
                          approveTask.mutateAsync({
                            taskId: task.id,
                            version: task.version,
                          }),
                        t('features.tasks.approved', { name: task.title }),
                      )
                    }
                  >
                    {t('features.tasks.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setRevisionReason('')
                      setRevisionOpen(true)
                    }}
                  >
                    {t('features.tasks.requestRevision')}
                  </Button>
                </>
              )}
              {task.backendStatus !== 'OPEN' && task.backendStatus !== 'SUBMITTED' && (
                <p className="text-[11px] font-medium text-amber-700">
                  {t('features.tasks.editOnlyWhenOpen')}
                </p>
              )}
              {task.backendStatus !== 'COMPLETED' && task.backendStatus !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCancelReason('')
                    setCancelOpen(true)
                  }}
                >
                  {t('features.tasks.cancelTask')}
                </Button>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t('features.tasks.reviewApiHint')}
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Phân công tình nguyện viên — POST /tasks/{taskId}/assignments */}
      {assignOpen && (
        <Dialog
          open
          onClose={() => setAssignOpen(false)}
          title={t('features.tasks.assignVolunteer')}
          footer={
            <>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!assignVolunteerId || assignVolunteer.isPending}
                onClick={async () => {
                  try {
                    await assignVolunteer.mutateAsync({
                      taskId: task.id,
                      volunteerId: assignVolunteerId,
                      note: assignNote.trim() || null,
                    })
                    toast(
                      t('features.tasks.assigned', {
                        name: userNameById.get(assignVolunteerId) ?? '',
                      }),
                    )
                    setAssignOpen(false)
                    setAssignNote('')
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('features.tasks.assignVolunteer')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="task-assign-volunteer">{t('features.tasks.volunteer')}</Label>
              <select
                id="task-assign-volunteer"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground"
                value={assignVolunteerId}
                onChange={(e) => setAssignVolunteerId(e.target.value)}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="task-assign-note">{t('features.tasks.assignNote')}</Label>
              <textarea
                id="task-assign-note"
                rows={3}
                maxLength={2000}
                className={TEXTAREA_CLS}
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
              />
            </div>

            {volunteerMatches.length > 0 && (
              <div className="space-y-1">
                <Label>{t('features.tasks.volunteerMatches')}</Label>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
                  {volunteerMatches.map((match) => (
                    <li key={match.volunteerId}>
                      <button
                        type="button"
                        onClick={() => setAssignVolunteerId(match.volunteerId)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-xs transition-colors ${
                          assignVolunteerId === match.volunteerId
                            ? 'bg-brand-pine/10 font-semibold text-foreground'
                            : 'text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        <span className="truncate">{match.displayName}</span>
                        <span className="shrink-0">
                          {match.hasScheduleConflict
                            ? t('features.tasks.matchConflict')
                            : match.sameCommunity
                              ? t('features.tasks.matchSameCommunity')
                              : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Dialog: Huỷ việc — POST /tasks/{taskId}/cancel */}
      {cancelOpen && (
        <Dialog
          open
          onClose={() => setCancelOpen(false)}
          title={t('features.tasks.cancelTask')}
          footer={
            <>
              <Button variant="outline" onClick={() => setCancelOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason.trim() || cancelTask.isPending}
                onClick={async () => {
                  try {
                    await cancelTask.mutateAsync({
                      taskId: task.id,
                      version: task.version,
                      reason: cancelReason.trim(),
                    })
                    toast(t('features.tasks.cancelled', { name: task.title }))
                    setCancelOpen(false)
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('features.tasks.cancelTask')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t('features.tasks.cancelReason')}</Label>
            <textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              className={TEXTAREA_CLS}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog: Vật tư yêu cầu — PUT /tasks/{taskId}/materials */}
      {materialsOpen && (
        <Dialog
          open
          onClose={() => setMaterialsOpen(false)}
          title={t('features.tasks.assignMaterials')}
          footer={
            <>
              <Button variant="outline" onClick={() => setMaterialsOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={replaceMaterials.isPending}
                onClick={async () => {
                  const rows = materialRows.filter(
                    (row) => row.materialId && Number(row.quantity) > 0,
                  )
                  try {
                    await replaceMaterials.mutateAsync({
                      taskId: task.id,
                      version: task.version ?? 1,
                      materials: rows.map((row) => ({
                        materialId: row.materialId,
                        requiredQuantity: Number(row.quantity),
                      })),
                    })
                    setSavedMaterials(rows.map((row) => row.materialId))
                    toast(t('features.tasks.materialsSaved'))
                    setMaterialsOpen(false)
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            {materialRows.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  aria-label={t('features.tasks.materials')}
                  className="h-10 flex-1 rounded-md border border-border bg-card px-3 text-sm"
                  value={row.materialId}
                  onChange={(e) =>
                    setMaterialRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, materialId: e.target.value } : item,
                      ),
                    )
                  }
                >
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.unit})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  aria-label={t('features.inventory.adjustQuantity')}
                  className="w-24"
                  value={row.quantity}
                  onChange={(e) =>
                    setMaterialRows((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, quantity: e.target.value } : item,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMaterialRows((prev) => [...prev, { materialId: '', quantity: '1' }])}
            >
              <Plus className="size-4" />
              {t('features.tasks.addMaterialRow')}
            </Button>
          </div>
        </Dialog>
      )}

      {/* Dialog: Yêu cầu sửa lại — POST /tasks/{taskId}/request-revision */}
      {revisionOpen && (
        <Dialog
          open
          onClose={() => setRevisionOpen(false)}
          title={t('features.tasks.requestRevision')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRevisionOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={!revisionReason.trim() || requestRevision.isPending}
                onClick={async () => {
                  try {
                    await requestRevision.mutateAsync({
                      taskId: task.id,
                      version: task.version,
                      reason: revisionReason.trim(),
                    })
                    toast(t('features.tasks.revisionRequested', { name: task.title }))
                    setRevisionOpen(false)
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('features.tasks.requestRevision')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="task-revision-reason">{t('features.tasks.revisionNote')}</Label>
            <textarea
              id="task-revision-reason"
              rows={3}
              maxLength={2000}
              className={TEXTAREA_CLS}
              placeholder={t('features.tasks.revisionReasonPlaceholder')}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog G5: Sửa Tiêu chí hoàn thành */}
      {editingCriteria && (
        <Dialog
          open
          onClose={() => setEditingCriteria(false)}
          title={t('features.tasks.completionCriteriaTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditingCriteria(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await replaceCriteria.mutateAsync({
                      taskId: task.id,
                      completionCriteria: criteriaValue.trim() || null,
                      version: task.version ?? 1,
                    })
                    toast(t('features.tasks.completionCriteriaUpdated'))
                    setEditingCriteria(false)
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="task-completion-criteria">{t('features.tasks.completionCriteriaSub')}</Label>
            <textarea
              id="task-completion-criteria"
              rows={4}
              maxLength={4000}
              placeholder={t('features.tasks.completionCriteriaPlaceholder')}
              className={TEXTAREA_CLS}
              value={criteriaValue}
              onChange={(e) => setCriteriaValue(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog G6: Chọn kỹ năng yêu cầu (multi-select) */}
      {editingSkills && (
        <Dialog
          open
          onClose={() => setEditingSkills(false)}
          title={t('features.tasks.skillsRequiredTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditingSkills(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const reqSkills = selectedSkills.map(sId => ({
                      skillId: sId,
                      requiredSkillLevel: 'Standard',
                      requiredVolunteerCount: 1,
                    }))
                    await replaceSkills.mutateAsync({
                      taskId: task.id,
                      skills: reqSkills,
                      version: task.version ?? 1,
                    })
                    toast(t('features.tasks.skillsUpdated'))
                    setEditingSkills(false)
                  } catch (error) {
                    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
                  }
                }}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t('features.tasks.skillsRequiredSub')}</p>
            <div className="grid grid-cols-1 gap-2">
              {skillsCatalog.map((sk) => {
                const checked = selectedSkills.includes(sk.id)
                return (
                  <label
                    key={sk.id}
                    className={`flex cursor-pointer items-center justify-between rounded-md border p-3 text-sm transition-all ${
                      checked
                        ? 'border-brand-pine bg-brand-pine/10 font-semibold text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        value={sk.id}
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills(prev => [...prev, sk.id])
                          } else {
                            setSelectedSkills(prev => prev.filter(x => x !== sk.id))
                          }
                        }}
                        className="rounded border-border text-brand-pine focus:ring-brand-pine"
                      />
                      <span>{sk.name}</span>
                    </div>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {sk.code}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
