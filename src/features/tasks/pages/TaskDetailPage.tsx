// Chi tiết việc (LEADER, route /leader/tasks/:id): 2 cột — trái info panel
// (mọi field + materials chips + StatusTag) + timeline (submittedNotes +
// status hiện tại); phải assignee chips, ứng viên đăng ký, trưởng nhóm,
// gói nghiệm thu hoàn thành, báo cáo vật tư và các nút chuyển trạng thái.
// Mount dưới /community/* → read-only (không nút thao tác).
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Clock,
  Crown,
  Edit3,
  MapPin,
  Package,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useUsers } from '@/features/users/api'
import {
  useApproveTaskApplication,
  useApproveTaskCompletion,
  useAssignVolunteerDirect,
  useCancelTask,
  useClearTaskTeamLeader,
  useMarkTaskReady,
  useRejectTaskApplication,
  useReplaceCompletionCriteria,
  useReplaceTaskSkills,
  useRequestTaskRevision,
  useSetTaskTeamLeader,
  useSkillsCatalog,
  useTask,
  useTaskApplications,
  useTaskAssignments,
  useTaskEvidenceDownloadUrl,
  useTaskMaterialReports,
  useTaskReviewPackage,
  useUnassign,
  useUpdateTask,
  useVolunteerMatches,
} from '../api'
import type { Task, User } from '@/types'
import { viDate } from '@/lib/format'
import { errorMessage } from '@/lib/errorMessage'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

// Component tải ảnh minh chứng tiến độ
function EvidenceItem({
  taskId,
  progressId,
  fileId,
  caption,
}: {
  taskId: string
  progressId: string
  fileId: string
  caption?: string | null
}) {
  const { t } = useTranslation()
  const { data: download } = useTaskEvidenceDownloadUrl(taskId, progressId, fileId)
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1 text-xs shadow-xs">
      <Camera className="size-3.5 text-brand-pine" />
      <span className="text-foreground">{caption || fileId.slice(0, 8)}</span>
      {download?.downloadUrl && (
        <a
          href={download.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-pine hover:underline font-semibold ml-1"
        >
          {t('features.tasks.evidenceDownload')}
        </a>
      )}
    </div>
  )
}

// Dialog phân công: gợi ý ghép kỹ năng & lịch rảnh từ useVolunteerMatches
function AssignDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [] } = useUsers()
  const { data: matches = [] } = useVolunteerMatches(task.id)
  const assignDirect = useAssignVolunteerDirect()

  const matchMap = new Map(matches.map((m) => [m.volunteerId, m]))

  const ranked = [...users].sort((a, b) => {
    const ma = matchMap.has(a.id) ? 1 : 0
    const mb = matchMap.has(b.id) ? 1 : 0
    if (ma !== mb) return mb - ma
    return (
      b.skills.filter((s) => task.skills.includes(s)).length -
      a.skills.filter((s) => task.skills.includes(s)).length
    )
  })

  const handleAssign = async (u: User) => {
    try {
      await assignDirect.mutateAsync({
        taskId: task.id,
        volunteerId: u.id,
      })
      toast(t('features.tasks.assigned', { name: u.name }))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  return (
    <Dialog open onClose={onClose} title={t('features.tasks.assignTitle')}>
      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {ranked.map((u) => {
          const match = matchMap.get(u.id)
          const assigned = task.assignees.includes(u.id)
          const matchedSkills = u.skills.filter((s) => task.skills.includes(s))
          return (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3 hover:border-brand-pine/30 hover:bg-muted/30 transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-brand-pine/10 text-xs font-bold text-brand-pine">
                    {u.name.charAt(0)}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{u.name}</p>
                  {match?.availabilityMatched && (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Rảnh
                    </span>
                  )}
                  {match?.hasScheduleConflict && (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      {t('features.tasks.scheduleConflict')}
                    </span>
                  )}
                </div>
                {matchedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {matchedSkills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-full bg-brand-pine/10 px-2 py-0.5 text-[10px] font-semibold text-brand-pine"
                      >
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {t('features.tasks.skills')}: {u.skills.join(', ') || '—'}
                  </p>
                )}
                {match?.warnings?.length ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    {match.warnings.join('; ')}
                  </p>
                ) : null}
              </div>
              <Button
                size="sm"
                variant={assigned ? 'outline' : 'default'}
                disabled={assigned}
                onClick={() => handleAssign(u)}
                className={assigned ? '' : 'bg-brand-pine hover:bg-brand-pineHover text-white'}
              >
                {assigned ? <Check className="size-4" /> : <Plus className="size-4" />}
                {assigned ? t('features.tasks.assignedShort') : t('features.tasks.assignVolunteer')}
              </Button>
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}

// Assignee chip + nút X bỏ phân công
function AssigneeChip({
  taskId,
  user,
  readOnly,
}: {
  taskId: string
  user: User
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const unassign = useUnassign(taskId, user.id)
  const onUnassign = async () => {
    try {
      await unassign.mutateAsync()
      toast(t('features.tasks.unassigned', { name: user.name }))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 shadow-xs hover:border-brand-pine/30 transition-all">
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
  const { data: applications = [] } = useTaskApplications(id)
  const { data: assignments = [] } = useTaskAssignments(id)
  const { data: reviewPackage } = useTaskReviewPackage(id)
  const { data: materialReports = [] } = useTaskMaterialReports(id)

  const update = useUpdateTask()
  const markReady = useMarkTaskReady()
  const replaceCriteria = useReplaceCompletionCriteria()
  const replaceSkills = useReplaceTaskSkills()
  const { data: skillsCatalog = [] } = useSkillsCatalog()

  const approveApp = useApproveTaskApplication()
  const rejectApp = useRejectTaskApplication()
  const setTeamLeader = useSetTaskTeamLeader()
  const clearTeamLeader = useClearTaskTeamLeader()
  const cancelTask = useCancelTask()
  const approveCompletion = useApproveTaskCompletion()
  const requestRevision = useRequestTaskRevision()

  const [assigning, setAssigning] = useState(false)
  const [editingCriteria, setEditingCriteria] = useState(false)
  const [criteriaValue, setCriteriaValue] = useState('')
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  // Dialogs Đợt A
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null)
  const [rejectingAppVersion, setRejectingAppVersion] = useState<number | undefined>(undefined)
  const [rejectReason, setRejectReason] = useState('')

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false)
  const [revisionReason, setRevisionReason] = useState('')

  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [approveReason, setApproveReason] = useState('')

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn()
      toast(msg)
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  if (isPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (!task) {
    return (
      <div>
        <PageHeader
          title={t('features.tasks.title')}
          actions={
            <Button variant="outline" onClick={() => navigate('/leader/tasks')}>
              <ArrowLeft className="size-4" />
              {t('common.back')}
            </Button>
          }
        />
        <EmptyState text={t('features.tasks.notFound')} />
      </div>
    )
  }

  const area = areas.find((a) => a.id === task.areaId)
  const taskMaterials = materials.filter((m) => task.materialIds.includes(m.id))
  const assignees = users.filter((u) => task.assignees.includes(u.id))

  const statBox = (Icon: typeof Users, label: string, value: string) => (
    <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      <span className="grid size-9 place-items-center rounded-md bg-card shadow-xs text-brand-pine">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
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
        {/* Trái: info + timeline + tiêu chí + gói nghiệm thu + ứng viên. */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {task.description || t('features.tasks.noDescription')}
              </p>
              <StatusTag status={task.status} scope="task" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statBox(MapPin, t('features.tasks.area'), area?.name ?? '—')}
              {statBox(
                Clock,
                t('features.tasks.estimateHours'),
                `${task.estimateHours} ${t('features.tasks.hours')}`,
              )}
              {statBox(
                Users,
                t('features.tasks.volunteersNeeded'),
                `${task.assignees.length}/${task.volunteersNeeded}`,
              )}
              {statBox(Calendar, t('features.tasks.dueDate'), viDate(task.dueDate))}
            </div>

            <div className="space-y-4 pt-2 border-t border-border/60">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="lbl-mono flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles className="size-3.5 text-brand-gold" />
                    {t('features.tasks.skillsRequiredTitle')}
                  </p>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs text-brand-pine hover:text-brand-pine hover:bg-brand-pine/10"
                      onClick={() => {
                        const matchedIds = skillsCatalog
                          .filter(
                            (sk) =>
                              task.skills.includes(sk.name) || task.skills.includes(sk.code),
                          )
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
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200"
                      >
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
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium shadow-xs"
                      >
                        <span className="size-1.5 rounded-full bg-brand-pine" />
                        {m.name} <span className="text-muted-foreground font-normal">({m.unit})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('features.tasks.materialNone')}
                    </span>
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
                <StatusTag status={task.status} scope="task" />
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
                <p className="lbl-mono text-sm font-semibold text-foreground">
                  {t('features.tasks.completionCriteriaTitle')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('features.tasks.completionCriteriaSub')}
                </p>
              </div>
              {!readOnly && (
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

          {/* Đợt A: Gói nghiệm thu hoàn thành (Review Package) */}
          {reviewPackage && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="lbl-mono font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="size-4 text-brand-gold" />
                  {t('features.tasks.reviewPackageTitle')}
                </p>
                {reviewPackage.approvedHours !== undefined && (
                  <span className="tabular text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-gold/15 text-amber-900 dark:text-amber-200">
                    {t('features.tasks.approvedHours')}: {reviewPackage.approvedHours}h
                  </span>
                )}
              </div>

              {reviewPackage.progress?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {t('features.tasks.progressSubmissions')}
                  </p>
                  {reviewPackage.progress.map((prog) => (
                    <div
                      key={prog.id}
                      className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {prog.percentComplete}% {t('status.COMPLETED')}
                        </span>
                        <span className="text-muted-foreground">{viDate(prog.submittedAt)}</span>
                      </div>
                      {prog.note && <p className="text-sm text-foreground">{prog.note}</p>}
                      {prog.evidence?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {prog.evidence.map((ev) => (
                            <EvidenceItem
                              key={ev.id}
                              taskId={task.id}
                              progressId={prog.id}
                              fileId={ev.fileId}
                              caption={ev.caption}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Đợt A: Báo cáo sử dụng vật tư (Material Reports) */}
          {materialReports.length > 0 && (
            <Card className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <p className="lbl-mono font-semibold text-foreground flex items-center gap-2">
                  <Package className="size-4 text-brand-pine" />
                  {t('features.tasks.materialReportsTitle')} ({materialReports.length})
                </p>
              </div>
              <div className="space-y-3">
                {materialReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {rep.taskName || 'Báo cáo vật tư'}
                      </span>
                      <StatusTag status={rep.status} />
                    </div>
                    {rep.note && <p className="text-xs text-muted-foreground">{rep.note}</p>}
                    <div className="space-y-1">
                      {rep.items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between text-xs py-1 border-t border-border/30"
                        >
                          <span className="text-foreground">
                            {it.materialName} ({it.unit})
                          </span>
                          <span className="tabular text-muted-foreground">
                            Đã cấp: {it.allocatedQuantity} | Đã dùng: {it.usedQuantity ?? '—'} | Còn:{' '}
                            {it.reportedRemainingQuantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Đợt A: Bảng ứng viên đăng ký (Task Applications) */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="lbl-mono font-semibold text-foreground flex items-center gap-2">
                <Users className="size-4 text-brand-pine" />
                {t('features.tasks.applicationsTitle')} ({applications.length})
              </p>
            </div>
            {applications.length > 0 ? (
              <div className="space-y-3">
                {applications.map((app) => {
                  const vol = users.find((u) => u.id === app.volunteerId)
                  return (
                    <div
                      key={app.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/15"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {vol?.name || app.volunteerId}
                          </span>
                          <StatusTag status={app.status} scope="task" />
                        </div>
                        {app.note && <p className="text-xs text-muted-foreground">{app.note}</p>}
                        {app.reason && (
                          <p className="text-xs text-destructive">Lý do: {app.reason}</p>
                        )}
                      </div>
                      {!readOnly && app.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            className="bg-brand-pine hover:bg-brand-pineHover text-white"
                            onClick={() =>
                              run(
                                () =>
                                  approveApp.mutateAsync({
                                    applicationId: app.id,
                                    version: app.version,
                                  }),
                                t('features.tasks.applicationApproved', {
                                  name: vol?.name || '',
                                }),
                              )
                            }
                          >
                            <Check className="size-3.5 mr-1" />
                            {t('common.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => {
                              setRejectingAppId(app.id)
                              setRejectingAppVersion(app.version)
                              setRejectReason('')
                              setRejectDialogOpen(true)
                            }}
                          >
                            <X className="size-3.5 mr-1" />
                            {t('features.tasks.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t('features.tasks.applicationsNone')}
              </p>
            )}
          </Card>
        </div>

        {/* Phải: phân công & trưởng nhóm + thao tác leader. */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="lbl-mono">
                {t('features.tasks.assignees')}{' '}
                <span className="tabular">
                  {assignments.length > 0 ? assignments.length : task.assignees.length}/
                  {task.volunteersNeeded}
                </span>
              </p>
              {!readOnly && (
                <Button size="sm" onClick={() => setAssigning(true)}>
                  <UserPlus className="size-4" />
                  {t('features.tasks.assign')}
                </Button>
              )}
            </div>

            {/* Danh sách phân công từ BE TaskExecution */}
            {assignments.length > 0 ? (
              <div className="space-y-2">
                {assignments.map((as) => {
                  const vol = users.find((u) => u.id === as.volunteerId)
                  const isLeader = task.teamLeaderAssignmentId === as.id
                  return (
                    <div
                      key={as.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-card text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-brand-pine/10 text-xs font-bold text-brand-pine">
                          {(vol?.name || 'V').charAt(0)}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">
                            {vol?.name || as.volunteerId}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusTag status={as.status} scope="task" />
                            {isLeader && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                                <Crown className="size-3 text-brand-gold" />
                                {t('features.tasks.teamLeader')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {!readOnly && (
                        <div>
                          {isLeader ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                run(
                                  () =>
                                    clearTeamLeader.mutateAsync({
                                      taskId: task.id,
                                      version: task.version ?? 1,
                                    }),
                                  t('features.tasks.teamLeaderCleared'),
                                )
                              }
                            >
                              {t('features.tasks.clearTeamLeader')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-brand-pine hover:bg-brand-pine/10"
                              onClick={() =>
                                run(
                                  () =>
                                    setTeamLeader.mutateAsync({
                                      taskId: task.id,
                                      teamLeaderAssignmentId: as.id,
                                      version: task.version ?? 1,
                                    }),
                                  t('features.tasks.teamLeaderSet', {
                                    name: vol?.name || '',
                                  }),
                                )
                              }
                            >
                              <Crown className="size-3 mr-1 text-brand-gold" />
                              {t('features.tasks.setTeamLeader')}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignees.map((u) => (
                  <AssigneeChip key={u.id} taskId={task.id} user={u} readOnly={readOnly} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('features.tasks.assignNone')}</p>
            )}
          </Card>

          {!readOnly && (
            <Card className="space-y-2 p-6">
              <p className="lbl-mono">{t('common.actions')}</p>
              {task.status === 'TODO' && (
                <Button
                  className="w-full"
                  onClick={() =>
                    run(
                      () => markReady.mutateAsync({ id: task.id, version: task.version }),
                      t('features.tasks.readyDone', { name: task.title }),
                    )
                  }
                >
                  <Check className="size-4" />
                  {t('features.tasks.markReady')}
                </Button>
              )}
              {task.status === 'READY' && (
                <Button className="w-full" disabled>
                  {t('features.tasks.waitingStart')}
                </Button>
              )}
              {task.status === 'DOING' && (
                <Button
                  className="w-full"
                  onClick={() =>
                    run(
                      () => update.mutateAsync({ id: task.id, status: 'REVIEW' }),
                      t('features.tasks.reviewSubmitted', { name: task.title }),
                    )
                  }
                >
                  <Check className="size-4 mr-1.5" />
                  {t('features.tasks.submitReview')}
                </Button>
              )}
              {task.status === 'REVIEW' && (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-brand-pine hover:bg-brand-pineHover text-white"
                    onClick={() => {
                      setApproveReason('')
                      setApproveDialogOpen(true)
                    }}
                  >
                    <Check className="size-4 mr-1.5" />
                    {t('features.tasks.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => {
                      setRevisionReason('')
                      setRevisionDialogOpen(true)
                    }}
                  >
                    {t('features.tasks.requestRevision')}
                  </Button>
                </div>
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

              {/* Huỷ nhiệm vụ */}
              {task.status !== 'DONE' && (
                <div className="pt-2 border-t border-border/50">
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setCancelReason('')
                      setCancelDialogOpen(true)
                    }}
                  >
                    <X className="size-3.5 mr-1" />
                    {t('features.tasks.cancelTask')}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

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
                      version: 1,
                    })
                    toast(t('features.tasks.completionCriteriaUpdated'))
                    setEditingCriteria(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  }
                }}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="task-completion-criteria">
              {t('features.tasks.completionCriteriaSub')}
            </Label>
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
                    const reqSkills = selectedSkills.map((sId) => ({
                      skillId: sId,
                      requiredSkillLevel: 'Standard',
                      requiredVolunteerCount: 1,
                    }))
                    await replaceSkills.mutateAsync({
                      taskId: task.id,
                      skills: reqSkills,
                      version: 1,
                    })
                    toast(t('features.tasks.skillsUpdated'))
                    setEditingSkills(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
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
                            setSelectedSkills((prev) => [...prev, sk.id])
                          } else {
                            setSelectedSkills((prev) => prev.filter((x) => x !== sk.id))
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

      {/* Dialog Đợt A: Từ chối đơn ứng tuyển */}
      {rejectDialogOpen && (
        <Dialog
          open
          onClose={() => setRejectDialogOpen(false)}
          title={t('features.tasks.rejectTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim()}
                onClick={async () => {
                  if (!rejectingAppId) return
                  try {
                    await rejectApp.mutateAsync({
                      applicationId: rejectingAppId,
                      reason: rejectReason.trim(),
                      version: rejectingAppVersion,
                    })
                    toast(t('features.tasks.applicationRejected', { name: '' }))
                    setRejectDialogOpen(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  }
                }}
              >
                {t('features.tasks.reject')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="reject-app-reason">{t('features.tasks.rejectReason')}</Label>
            <textarea
              id="reject-app-reason"
              rows={3}
              placeholder="Nhập lý do từ chối đơn đăng ký..."
              className={TEXTAREA_CLS}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog Đợt A: Huỷ nhiệm vụ */}
      {cancelDialogOpen && (
        <Dialog
          open
          onClose={() => setCancelDialogOpen(false)}
          title={t('features.tasks.cancelTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={!cancelReason.trim()}
                onClick={async () => {
                  try {
                    await cancelTask.mutateAsync({
                      taskId: task.id,
                      reason: cancelReason.trim(),
                      version: task.version,
                    })
                    toast(t('features.tasks.taskCancelled', { name: task.title }))
                    setCancelDialogOpen(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  }
                }}
              >
                {t('features.tasks.cancelTask')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="cancel-task-reason">{t('features.tasks.cancelReason')}</Label>
            <textarea
              id="cancel-task-reason"
              rows={3}
              placeholder="Nhập lý do huỷ nhiệm vụ..."
              className={TEXTAREA_CLS}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog Đợt A: Duyệt hoàn thành */}
      {approveDialogOpen && (
        <Dialog
          open
          onClose={() => setApproveDialogOpen(false)}
          title={t('features.tasks.approveTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                className="bg-brand-pine hover:bg-brand-pineHover text-white"
                onClick={async () => {
                  try {
                    await approveCompletion.mutateAsync({
                      taskId: task.id,
                      reason: approveReason.trim() || null,
                      version: task.version,
                    })
                    toast(t('features.tasks.approved', { name: task.title }))
                    setApproveDialogOpen(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  }
                }}
              >
                {t('features.tasks.approve')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              {t('features.tasks.approveConfirm', { name: task.title })}
            </p>
            <Label htmlFor="approve-task-note">{t('features.tasks.notes')}</Label>
            <textarea
              id="approve-task-note"
              rows={2}
              placeholder="Nhập nhận xét / ghi chú nghiệm thu (tuỳ chọn)..."
              className={TEXTAREA_CLS}
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {/* Dialog Đợt A: Yêu cầu sửa lại */}
      {revisionDialogOpen && (
        <Dialog
          open
          onClose={() => setRevisionDialogOpen(false)}
          title={t('features.tasks.revisionTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={!revisionReason.trim()}
                onClick={async () => {
                  try {
                    await requestRevision.mutateAsync({
                      taskId: task.id,
                      reason: revisionReason.trim(),
                      version: task.version,
                    })
                    toast(t('features.tasks.revisionRequested', { name: task.title }))
                    setRevisionDialogOpen(false)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  }
                }}
              >
                {t('features.tasks.requestRevision')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <Label htmlFor="revision-task-reason">{t('features.tasks.revisionNote')}</Label>
            <textarea
              id="revision-task-reason"
              rows={3}
              placeholder="Nhập chi tiết các nội dung cần chỉnh sửa hoặc làm lại..."
              className={TEXTAREA_CLS}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
            />
          </div>
        </Dialog>
      )}

      {assigning && <AssignDialog task={task} onClose={() => setAssigning(false)} />}
    </div>
  )
}
