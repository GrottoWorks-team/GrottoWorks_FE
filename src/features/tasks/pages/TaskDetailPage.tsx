// Chi tiết việc (LEADER, route /leader/tasks/:id): 2 cột — trái info panel
// (mọi field + materials chips + StatusTag) + timeline (submittedNotes +
// status hiện tại); phải assignee chips và thao tác trạng thái.
// Mount dưới /community/* → read-only (không nút thao tác).
//
// PHẠM VI API THẬT: TaskExecution chỉ có POST /tasks/{id}/ready (OPEN → NOT_STARTED).
// Việc phân công TNV / nộp duyệt / duyệt hoàn thành chưa có endpoint → UI hiện
// ghi chú thay vì giả lập thành công (xem BE-gap-requests-activity-flows.md).
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Calendar, Clock, Edit3, MapPin, Package, Sparkles, Users } from 'lucide-react'
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
import {
  useReadyTask,
  useReplaceCompletionCriteria,
  useReplaceTaskSkills,
  useSkillsCatalog,
  useTask,
} from '../api'
import { viDate } from '@/lib/format'

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
  const { data: skillsCatalog = [] } = useSkillsCatalog()
  const [editingCriteria, setEditingCriteria] = useState(false)
  const [criteriaValue, setCriteriaValue] = useState('')
  const [editingSkills, setEditingSkills] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

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
        </div>

        {/* Phải: thao tác leader (BE chưa có API phân công TNV). */}
        <div className="space-y-6">
          <Card className="p-6">
            <p className="lbl-mono">{t('features.tasks.assignees')}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t('features.tasks.assignApiMissing')}
            </p>
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
              {task.backendStatus !== 'OPEN' && (
                <p className="text-[11px] font-medium text-amber-700">
                  {t('features.tasks.editOnlyWhenOpen')}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {t('features.tasks.statusApiMissing')}
              </p>
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
                      version: task.version ?? 1,
                    })
                    toast(t('features.tasks.completionCriteriaUpdated'))
                    setEditingCriteria(false)
                  } catch {
                    toast(t('common.error'), 'alert')
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
                  } catch {
                    toast(t('common.error'), 'alert')
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
