// Checklist sẵn sàng (/leader/checklist, /community/checklist) — BE Readiness.
// Quy trình 12/11/2026:
//   1. Trưởng khu tạo phiếu + đặt tiêu chí cho khu của mình (BE `createReadinessCheck` = LEADER).
//   2. LEADER nộp minh chứng cho từng mục rồi đánh dấu Đạt/Không đạt (bắt buộc có minh chứng mới được Đạt).
//   3. LEADER duyệt khu vực (`confirmAreaReadiness`) → khu READY; mọi khu READY → mùa chuyển READY.
//   4. Ban hành giáo theo dõi và **mở lại** phiếu khi cần (BE `reopenReadinessCheck` = PARISH + LEADER).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, FileCheck, Link2, Paperclip, Plus, RefreshCw, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useTasks, useCreateTask } from '@/features/tasks/api'
import { ReadinessItemsEditor } from '@/features/checklist/components/ReadinessItemsEditor'
import { uploadFile } from '@/lib/files'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
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
  useReopenReadiness,
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
  // FE `COMMUNITY` = ban hành giáo (BE `PARISH`): theo dõi tiến độ, mở lại phiếu khi cần.
  const isParishBoard = user?.role === 'COMMUNITY'
  // 26/11/2026: BE chỉ cho LEADER của khu tạo phiếu / ghi kết quả / confirm (`confirmAreaReadiness`).
  // Trước đây PARISH cũng thấy nút tạo phiếu + duyệt khu vực nên bấm vào luôn 403 Forbidden.
  const canCreateCheck = isLeader
  const myAreas = useMemo(
    () => (isLeader ? areas.filter((a) => a.leaderId === user?.id) : areas),
    [isLeader, areas, user?.id],
  )
  const [areaId, setAreaId] = useState('')
  const selected = myAreas.find((a) => a.id === areaId) ?? myAreas[0]

  const { data: seasonReadiness, isPending: seasonPending, refetch: refetchSeason } = useSeasonReadiness(selected?.seasonId)
  const row = seasonReadiness?.areas.find((a) => a.workAreaId === selected?.id)
  const { data: check, isPending: checkPending, refetch: refetchCheck } = useReadinessCheck(row?.readinessCheckId)
  // Query bị `enabled: false` (khu chưa có phiếu) luôn ở trạng thái pending →
  // chỉ coi là đang tải khi thực sự có `readinessCheckId` để gọi.
  const checkLoading = Boolean(row?.readinessCheckId) && checkPending

  const record = useRecordReadinessResult()
  const recheck = useRecheckReadinessItem()
  const confirm = useConfirmReadiness()
  // 26/11/2026: BE cho PARISH + LEADER mở lại phiếu đã READY (bắt buộc nêu lý do — BR-53).
  const reopen = useReopenReadiness()
  const [reopening, setReopening] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [reopenError, setReopenError] = useState(false)
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
    } catch (error) {
      fail(error)
    }
  }

  const runRecheck = async (item: ReadinessItem, result: 'PASSED' | 'FAILED') => {
    if (!check) return
    try {
      await recheck.mutateAsync({ checkId: check.id, itemId: item.id, version: check.version, result })
      toast(t('features.checklist.saved'))
    } catch (error) {
      fail(error)
    }
  }

  const onConfirm = async () => {
    if (!check) return
    try {
      await confirm.mutateAsync({ checkId: check.id, version: check.version })
      toast(t('features.checklist.confirmed'))
    } catch (error) {
      fail(error)
    }
  }

  const onReopen = async () => {
    if (!check) return
    if (!reopenReason.trim()) return setReopenError(true)
    try {
      await reopen.mutateAsync({ checkId: check.id, version: check.version, reason: reopenReason.trim() })
      toast(t('features.checklist.reopened'))
      setReopening(false)
      setReopenReason('')
    } catch (error) {
      fail(error)
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

  const seasonAreas = seasonReadiness?.areas ?? []
  const submittedChecks = seasonAreas.filter((area) => Boolean(area.readinessCheckId)).length
  const mandatoryTotal = seasonAreas.reduce((sum, area) => sum + area.mandatoryItems, 0)
  const cardCount = row?.readinessCheckId ? 1 : 0

  const overview = [
    {
      key: 'ready',
      label: t('features.checklist.ovReady', { defaultValue: 'Khu đã sẵn sàng' }),
      value: `${seasonReadiness?.readyWorkAreas ?? 0}/${seasonReadiness?.workAreas ?? 0}`,
      tone:
        (seasonReadiness?.readyWorkAreas ?? 0) === (seasonReadiness?.workAreas ?? 0) && (seasonReadiness?.workAreas ?? 0) > 0
          ? 'text-[#1B6B45]'
          : 'text-[#A65A12]',
    },
    {
      key: 'submitted',
      label: t('features.checklist.ovSubmitted', { defaultValue: 'Phiếu đã nộp' }),
      value: String(submittedChecks),
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'missing',
      label: t('features.checklist.ovMissing', { defaultValue: 'Khu chưa có phiếu' }),
      value: String(Math.max(0, (seasonReadiness?.workAreas ?? 0) - submittedChecks)),
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'mandatory',
      label: t('features.checklist.ovMandatory', { defaultValue: 'Tiêu chí bắt buộc' }),
      value: String(mandatoryTotal),
      tone: 'text-[#0B2E1F]',
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.checklist.title')}
        sub={`${isLeader ? t('features.checklist.subLeader') : t('features.checklist.subCommittee')}.`}
        actions={
          <button
            type="button"
            onClick={() => {
              void refetchSeason()
              if (row?.readinessCheckId) void refetchCheck()
            }}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
          >
            <RefreshCw className="size-[13px] text-[#3F7F5B]" aria-hidden />
            <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.checklist.refresh', { defaultValue: 'Làm mới' })}</span>
          </button>
        }
      />

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        <div className="w-full min-w-0 flex-1 overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-[14px]">
            <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.checklist.cardHead', { defaultValue: 'Phiếu kiểm tra sẵn sàng' })}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex w-fit items-center gap-[6px] rounded-full px-[9px] py-1 text-[10px] font-bold',
                  cardCount ? 'bg-[#E9F4EC] text-[#1B6B45]' : 'bg-[#F7F4E7] text-[#8A6412]',
                )}
              >
                {t('features.checklist.cardChip', { defaultValue: '{{count}} phiếu', count: cardCount })}
              </span>
              <select
                aria-label={t('features.checklist.area')}
                className="h-[26px] max-w-[200px] rounded-[8px] border border-[#E7EEE3] bg-[#F7F9F5] px-2 text-[10px] text-[#6B8175]"
                value={selected?.id ?? ''}
                onChange={(e) => setAreaId(e.target.value)}
              >
                {myAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-px w-full bg-[#ECF1E9]" />

          {seasonPending || checkLoading ? (
            <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
          ) : !selected ? null : !row?.readinessCheckId ? (
            <div className="flex w-full flex-col items-center justify-center gap-[9px] px-5 py-12">
              <FileCheck className="size-[24px] text-[#B9C8BE]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#7C9287]">
                {t('features.checklist.emptyTitle', { defaultValue: 'Khu vực chưa có phiếu kiểm tra sẵn sàng.' })}
              </span>
              <span className="w-full max-w-[330px] text-center text-[10px] leading-[15px] text-[#A3B4A9]">
                {t('features.checklist.emptyHint', { defaultValue: 'Ban hành giáo đặt tiêu chí ngay khi tạo khu vực; trưởng khu nộp minh chứng để đánh dấu Đạt.' })}
              </span>
              {canCreateCheck && (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="mt-1 flex h-[32px] items-center gap-[6px] rounded-[9px] bg-[#0A5C36] px-[13px] text-[11px] font-bold text-white transition-colors hover:bg-[#0D7344]"
                >
                  <Plus className="size-[12px] text-[#F2D07A]" aria-hidden />
                  {t('features.checklist.create')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3 p-4">
              <div className="grid w-full gap-2 sm:grid-cols-4">
                {[
                  { key: 'total', label: t('features.checklist.items'), value: row.totalItems },
                  { key: 'passed', label: t('features.checklist.passed'), value: row.passedItems, tone: 'text-[#1B6B45]' },
                  { key: 'failed', label: t('features.checklist.failed'), value: row.failedItems, tone: 'text-[#A33F37]' },
                  { key: 'pending', label: t('features.checklist.pending'), value: row.pendingItems, tone: 'text-[#8A6412]' },
                ].map((stat) => (
                  <div key={stat.key} className="flex flex-col gap-[3px] rounded-[12px] border border-[#E3EAE0] bg-white px-[13px] py-[11px]">
                    <span className="text-[10px] text-[#96AAA0]">{stat.label}</span>
                    <span className={cn('font-mono text-[20px] font-bold leading-none text-[#0B2E1F]', stat.tone)}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[#E9EFE6] bg-[#F7F9F5] px-[13px] py-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] font-bold text-[#0B2E1F]">{check?.name ?? t('features.checklist.title')}</span>
                  {check && <StatusTag status={check.status} />}
                </div>
                <div className="flex items-center gap-2">
                  {isLeader && check && check.status !== 'READY' && (
                    <button
                      type="button"
                      onClick={() => void onConfirm()}
                      disabled={confirm.isPending}
                      className="flex h-[30px] items-center rounded-[9px] bg-[#0A5C36] px-3 text-[10.5px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
                    >
                      {t('features.checklist.confirmParish')}
                    </button>
                  )}
                  {(isLeader || isParishBoard) && check?.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => {
                        setReopenReason('')
                        setReopenError(false)
                        setReopening(true)
                      }}
                      className="flex h-[30px] items-center rounded-[9px] border border-[#DBE5D6] bg-white px-3 text-[10.5px] font-semibold text-[#2C463A] transition-colors hover:bg-[#F4F8F1]"
                    >
                      {t('features.checklist.reopen')}
                    </button>
                  )}
                </div>
              </div>

              {isParishBoard && (
                <p className="w-full rounded-[10px] border border-[#C9DCC9] bg-[#F1F6EE] px-[11px] py-[9px] text-[10px] leading-[15px] text-[#0A5C36]">
                  {t('features.checklist.parishHint')}
                </p>
              )}

              {check && (
                <div id="checklist-items-table" className="w-full">
                  <DataTable rows={check.items} columns={columns} emptyText={t('features.checklist.itemRequired')} />
                </div>
              )}
            </div>
          )}

          <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
            <span className="text-[10.5px] text-[#96AAA0]">
              {t('features.checklist.footNote', { defaultValue: 'Ban hành giáo có thể mở lại phiếu khi cần kiểm tra lại' })}
            </span>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
          <section className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center px-4 py-[14px]">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.checklist.ovHead', { defaultValue: 'Tổng quan sẵn sàng' })}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="flex w-full flex-col px-4 pb-3 pt-[6px]">
              {overview.map((item) => (
                <div
                  key={item.key}
                  className="flex w-full items-center justify-between gap-2 border-b border-[#F0F4EC] py-[9px] last:border-0"
                >
                  <span className="min-w-0 flex-1 text-[10.5px] text-[#6B8175]">{item.label}</span>
                  <span className={cn('font-mono text-[10.5px] font-bold', item.tone)}>{item.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] p-[13px_14px]">
            <div className="absolute left-[180px] top-[-80px] size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]" />
            <span className="relative z-[1] w-fit font-mono text-[9px] font-bold tracking-[1.1px] text-[#F2D07A]">
              {t('features.checklist.flowHead', { defaultValue: 'Quy trình duyệt' })}
            </span>
            <p className="relative z-[2] w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
              {t('features.checklist.flowBody', { defaultValue: 'Trưởng khu tự đánh dấu Đạt cho từng tiêu chí và duyệt khu vực; ban hành giáo mở lại phiếu khi cần kiểm tra.' })}
            </p>
          </section>
        </div>
      </div>

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

      {/* 26/11/2026: mở lại phiếu đã READY — BE yêu cầu có lý do (BR-53). */}
      {reopening && check && (
        <Dialog
          open
          onClose={() => setReopening(false)}
          title={t('features.checklist.reopenTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setReopening(false)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={reopen.isPending} onClick={() => void onReopen()}>
                {t('features.checklist.reopen')}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('features.checklist.reopenHint')}</p>
            <Label htmlFor="reopen-reason">{t('features.checklist.reopenReason')} *</Label>
            <Input
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => {
                setReopenReason(e.target.value)
                setReopenError(false)
              }}
              maxLength={500}
            />
            {reopenError ? (
              <p className="text-xs font-semibold text-destructive">{t('common.required')}</p>
            ) : null}
          </div>
        </Dialog>
      )}
    </div>
  )
}
