// Checklist sẵn sàng (/leader/checklist, /community/checklist) — BE Readiness.
// Quy trình 12/11/2026:
//   1. Ban hành giáo (FE `COMMUNITY` = BE `PARISH`) đặt tiêu chí cho từng khu vực.
//   2. LEADER nộp minh chứng cho từng mục rồi đánh dấu Đạt/Không đạt (bắt buộc có minh chứng mới được Đạt).
//   3. Ban hành giáo duyệt tổng thể khu vực → khu READY; mọi khu READY → mùa chuyển READY.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Link2, Paperclip, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useTasks, useCreateTask } from '@/features/tasks/api'
import { ReadinessItemsEditor } from '@/features/checklist/components/ReadinessItemsEditor'
import { uploadFile } from '@/lib/files'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import {
  getReadinessEvidenceUrl,
  useAttachReadinessEvidence,
  useConfirmReadiness,
  useCreateReadinessCheck,
  useLinkCorrectiveTask,
  useReadinessCheck,
  useRecheckReadinessItem,
  useRecordReadinessResult,
  useSeasonReadiness,
} from '../api'
import type { ReadinessItem } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

function CreateCheckDialog({ areaId, onClose }: { areaId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateReadinessCheck()
  const [name, setName] = useState(t('features.checklist.defaultName'))
  const [items, setItems] = useState([{ name: '', mandatory: true }])

  const submit = async () => {
    const cleaned = items.filter((i) => i.name.trim())
    if (!name.trim() || cleaned.length === 0) {
      toast(t('features.checklist.itemRequired'), 'alert')
      return
    }
    try {
      await create.mutateAsync({ workAreaId: areaId, name: name.trim(), items: cleaned })
      toast(t('features.checklist.created'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.checklist.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="check-name">{t('features.checklist.name')}</Label>
          <Input id="check-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <Label>{t('features.checklist.items')}</Label>
        </div>
        <ReadinessItemsEditor items={items} onChange={setItems} idPrefix="check-item" />
      </div>
    </Dialog>
  )
}

export default function ChecklistPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [] } = useScopedAreas()
  const isLeader = user?.role === 'LEADER'
  // FE `COMMUNITY` = ban hành giáo (BE `PARISH`): người đặt tiêu chí và duyệt cuối.
  const isParishBoard = user?.role === 'COMMUNITY'
  const canCreateCheck = isLeader || isParishBoard
  const myAreas = useMemo(
    () => (isLeader ? areas.filter((a) => a.leaderId === user?.id) : areas),
    [isLeader, areas, user?.id],
  )
  const [areaId, setAreaId] = useState('')
  const selected = myAreas.find((a) => a.id === areaId) ?? myAreas[0]

  const { data: seasonReadiness, isPending: seasonPending } = useSeasonReadiness(selected?.seasonId)
  const row = seasonReadiness?.areas.find((a) => a.workAreaId === selected?.id)
  const { data: check, isPending: checkPending } = useReadinessCheck(row?.readinessCheckId)
  // Query bị `enabled: false` (khu chưa có phiếu) luôn ở trạng thái pending →
  // chỉ coi là đang tải khi thực sự có `readinessCheckId` để gọi.
  const checkLoading = Boolean(row?.readinessCheckId) && checkPending

  const record = useRecordReadinessResult()
  const recheck = useRecheckReadinessItem()
  const confirm = useConfirmReadiness()
  const attachEvidence = useAttachReadinessEvidence()
  const linkCorrective = useLinkCorrectiveTask()
  const createCorrectiveTask = useCreateTask()
  const { data: areaTasks = [] } = useTasks(selected?.id)
  // BR-66: chỉ task loại `CORRECTIVE` còn mở mới gắn được vào hạng mục bắt buộc bị fail.
  const correctiveTasks = useMemo(
    () =>
      areaTasks.filter(
        (task) =>
          task.taskType === 'CORRECTIVE' &&
          task.backendStatus !== 'COMPLETED' &&
          task.backendStatus !== 'CANCELLED',
      ),
    [areaTasks],
  )
  const [creating, setCreating] = useState(false)
  const [evidenceBusy, setEvidenceBusy] = useState<string | null>(null)
  const [correctiveTarget, setCorrectiveTarget] = useState<ReadinessItem | null>(null)
  const [correctiveTaskId, setCorrectiveTaskId] = useState('')
  const [creatingCorrective, setCreatingCorrective] = useState(false)

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  const uploadEvidence = async (item: ReadinessItem, file: File) => {
    if (!check) return
    setEvidenceBusy(item.id)
    try {
      const fileId = await uploadFile(file, 'ReadinessEvidence')
      await attachEvidence.mutateAsync({ checkId: check.id, itemId: item.id, fileIds: [fileId] })
      toast(t('features.checklist.evidenceUploaded'))
    } catch (error) {
      fail(error)
    } finally {
      setEvidenceBusy(null)
    }
  }

  const openEvidence = async (item: ReadinessItem, fileId: string) => {
    if (!check) return
    try {
      const url = await getReadinessEvidenceUrl(check.id, item.id, fileId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      fail(error)
    }
  }

  const submitCorrective = async () => {
    if (!check || !correctiveTarget) return
    try {
      await linkCorrective.mutateAsync({
        checkId: check.id,
        itemId: correctiveTarget.id,
        version: check.version,
        taskId: correctiveTaskId || null,
      })
      toast(t('features.checklist.correctiveLinked'))
      setCorrectiveTarget(null)
      setCorrectiveTaskId('')
    } catch (error) {
      fail(error)
    }
  }

  // BR-66: khu chưa có task CORRECTIVE → tạo mới rồi gắn luôn vào hạng mục đang fail.
  const createAndLinkCorrective = async () => {
    if (!check || !correctiveTarget) return
    setCreatingCorrective(true)
    try {
      const task = await createCorrectiveTask.mutateAsync({
        areaId: check.workAreaId,
        title: `${t('features.checklist.correctivePrefix')}: ${correctiveTarget.name}`.slice(0, 160),
        description: correctiveTarget.description ?? '',
        skills: [],
        skillIds: [],
        materialIds: [],
        assignees: [],
        estimateHours: 2,
        volunteersNeeded: 1,
        status: 'TODO',
        dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10),
        submittedPhotos: 0,
        taskType: 'CORRECTIVE',
      })
      await linkCorrective.mutateAsync({
        checkId: check.id,
        itemId: correctiveTarget.id,
        version: check.version,
        taskId: task.id,
      })
      toast(t('features.checklist.correctiveLinked'))
      setCorrectiveTarget(null)
      setCorrectiveTaskId('')
    } catch (error) {
      fail(error)
    } finally {
      setCreatingCorrective(false)
    }
  }

  const setResult = async (item: ReadinessItem, result: 'PASSED' | 'FAILED') => {
    if (!check) return
    try {
      await record.mutateAsync({ checkId: check.id, itemId: item.id, version: check.version, result })
      toast(t('features.checklist.saved'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const runRecheck = async (item: ReadinessItem, result: 'PASSED' | 'FAILED') => {
    if (!check) return
    try {
      await recheck.mutateAsync({ checkId: check.id, itemId: item.id, version: check.version, result })
      toast(t('features.checklist.saved'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const onConfirm = async () => {
    if (!check) return
    try {
      await confirm.mutateAsync({ checkId: check.id, version: check.version })
      toast(t('features.checklist.confirmed'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: t('features.checklist.itemName'), render: (i: ReadinessItem) => <span className="font-semibold text-foreground">{i.name}</span> },
      {
        key: 'mandatory',
        header: t('features.checklist.mandatory'),
        render: (i: ReadinessItem) => (i.mandatory ? t('common.yes') : '—'),
      },
      { key: 'status', header: t('common.status'), render: (i: ReadinessItem) => <StatusTag status={i.status} /> },
      {
        key: 'evidence',
        header: t('features.checklist.evidence'),
        render: (i: ReadinessItem) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {i.evidenceFileIds.length === 0 && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {i.evidenceFileIds.map((fileId) => (
              <Button
                key={fileId}
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                title={t('features.checklist.downloadEvidence')}
                onClick={() => void openEvidence(i, fileId)}
              >
                <Paperclip className="size-3.5" />
              </Button>
            ))}
            {isLeader && (
              <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/30">
                <input
                  type="file"
                  className="hidden"
                  disabled={evidenceBusy === i.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void uploadEvidence(i, file)
                    e.target.value = ''
                  }}
                />
                {evidenceBusy === i.id ? t('common.loading') : t('features.checklist.addEvidence')}
              </label>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (i: ReadinessItem) => {
          if (!isLeader) return <span className="text-muted-foreground">—</span>
          if (i.status === 'PENDING') {
            // Bắt buộc có minh chứng trước khi đánh Đạt (BE trả 422 READINESS_EVIDENCE_REQUIRED).
            const canPass = i.evidenceFileIds.length > 0
            return (
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canPass}
                  title={canPass ? undefined : t('features.checklist.evidenceRequired')}
                  onClick={() => setResult(i, 'PASSED')}
                >
                  <Check className="size-4" /> {t('features.checklist.pass')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResult(i, 'FAILED')}>
                  <X className="size-4" /> {t('features.checklist.fail')}
                </Button>
              </div>
            )
          }
          if (i.status === 'RECHECK') {
            return (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => runRecheck(i, 'PASSED')}>
                  <Check className="size-4" /> {t('features.checklist.recheck')}
                </Button>
              </div>
            )
          }
          if (i.status === 'FAILED') {
            return (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCorrectiveTaskId(i.correctiveTaskId ?? '')
                    setCorrectiveTarget(i)
                  }}
                >
                  <Link2 className="size-4" /> {t('features.checklist.correctiveTask')}
                </Button>
              </div>
            )
          }
          return <span className="text-muted-foreground">—</span>
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, isLeader, check?.version],
  )

  if (!myAreas.length && isLeader) return <EmptyState text={t('features.tasks.noArea')} />

  return (
    <div>
      <PageHeader
        title={t('features.checklist.title')}
        sub={isLeader ? t('features.checklist.subLeader') : t('features.checklist.subCommittee')}
      />
      <Card className="mb-6 p-5">
        <Label htmlFor="check-area">{t('features.checklist.area')}</Label>
        <select
          id="check-area"
          className={SELECT_CLS}
          value={selected?.id ?? ''}
          onChange={(e) => setAreaId(e.target.value)}
        >
          {myAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Card>

      {seasonPending || checkLoading ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !selected ? null : !row?.readinessCheckId ? (
        <div className="space-y-3">
          <EmptyState text={t('features.checklist.noCheck')} />
          {canCreateCheck && (
            <div className="flex justify-center">
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                {t('features.checklist.create')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label={t('features.checklist.items')} value={row.totalItems} unit={t('features.checklist.itemUnit')} />
            <StatCard label={t('features.checklist.passed')} value={row.passedItems} unit={t('features.checklist.itemUnit')} tone="ok" />
            <StatCard label={t('features.checklist.failed')} value={row.failedItems} unit={t('features.checklist.itemUnit')} tone="alert" />
            <StatCard label={t('features.checklist.pending')} value={row.pendingItems} unit={t('features.checklist.itemUnit')} />
          </div>

          <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">{check?.name ?? t('features.checklist.title')}</span>
              {check && <StatusTag status={check.status} />}
            </div>
            {isParishBoard && check && check.status !== 'READY' && (
              <Button onClick={onConfirm} disabled={confirm.isPending}>
                {t('features.checklist.confirmParish')}
              </Button>
            )}
          </Card>

          {isParishBoard && (
            <p className="mb-4 rounded-card border border-brand-pine/15 bg-brand-pineLight px-3 py-2 text-xs leading-relaxed text-brand-pine">
              {t('features.checklist.parishHint')}
            </p>
          )}

          {check && (
            <DataTable
              rows={check.items}
              columns={columns}
              emptyText={t('features.checklist.itemRequired')}
            />
          )}
        </>
      )}

      {creating && selected && <CreateCheckDialog areaId={selected.id} onClose={() => setCreating(false)} />}

      {correctiveTarget && (
        <Dialog
          open
          onClose={() => setCorrectiveTarget(null)}
          title={t('features.checklist.correctiveTask')}
          footer={
            <>
              <Button variant="outline" onClick={() => setCorrectiveTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={linkCorrective.isPending}
                onClick={() => void submitCorrective()}
              >
                {t('common.save')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{correctiveTarget.name}</p>
            <Label htmlFor="corrective-task">{t('features.checklist.correctiveTaskPick')}</Label>
            {correctiveTasks.length > 0 ? (
              <select
                id="corrective-task"
                className={SELECT_CLS}
                value={correctiveTaskId}
                onChange={(e) => setCorrectiveTaskId(e.target.value)}
              >
                <option value="">{t('common.selectPlaceholder')}</option>
                {correctiveTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{t('features.checklist.correctiveNone')}</p>
                <Button
                  type="button"
                  size="sm"
                  disabled={createCorrectiveTask.isPending || creatingCorrective}
                  onClick={() => void createAndLinkCorrective()}
                >
                  <Plus className="size-4" />
                  {t('features.checklist.correctiveCreate')}
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}