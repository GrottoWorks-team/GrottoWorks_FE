import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Paperclip,
  Download,
  ArrowLeft,
  ShieldCheck,
  FileCheck,
  ExternalLink,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errorMessage'
import {
  getReadinessEvidenceDownloadUrl,
  useAttachReadinessEvidence,
  useConfirmAreaReadiness,
  useLinkCorrectiveTask,
  useReadinessCheck,
  useRecheckReadinessItem,
  useRecordReadinessResult,
  useReopenReadinessCheck,
  useReplaceReadinessItems,
} from '../api'
import type { ChecklistStatus, ItemStatus, ReadinessItemDto } from '@/types'

function getStatusBadge(status: ChecklistStatus) {
  const norm = String(status).toUpperCase()
  switch (norm) {
    case 'PLANNING':
      return <Badge className="bg-muted text-muted-foreground border-border">Đang chuẩn bị</Badge>
    case 'INREVIEW':
    case 'IN_REVIEW':
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">Đang kiểm tra</Badge>
    case 'NEEDSCORRECTION':
    case 'NEEDS_CORRECTION':
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Cần khắc phục</Badge>
    case 'READY':
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Sẵn sàng</Badge>
    case 'REOPENED':
      return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30">Mở lại</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

function getItemStatusBadge(status: ItemStatus) {
  const norm = String(status).toUpperCase()
  switch (norm) {
    case 'PENDING':
      return <Badge className="bg-muted text-muted-foreground border-border">Chờ kiểm tra</Badge>
    case 'PASSED':
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1 w-fit"><CheckCircle2 className="size-3" /> Đã đạt</Badge>
    case 'FAILED':
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 flex items-center gap-1 w-fit"><XCircle className="size-3" /> Không đạt</Badge>
    case 'CORRECTIVEACTION':
    case 'CORRECTIVE_ACTION':
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 flex items-center gap-1 w-fit"><AlertTriangle className="size-3" /> Đang khắc phục</Badge>
    case 'RECHECK':
      return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 flex items-center gap-1 w-fit"><RotateCcw className="size-3" /> Kiểm tra lại</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function ReadinessPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const params = useParams<{ id?: string; checkId?: string }>()
  const activeCheckId = params.checkId || params.id || 'check-1'

  const { data: checklist, isLoading } = useReadinessCheck(activeCheckId)

  // Mutations
  const recordResultMut = useRecordReadinessResult()
  const recheckMut = useRecheckReadinessItem()
  const linkTaskMut = useLinkCorrectiveTask()
  const attachEvidenceMut = useAttachReadinessEvidence()
  const confirmMut = useConfirmAreaReadiness()
  const reopenMut = useReopenReadinessCheck()
  const replaceItemsMut = useReplaceReadinessItems()

  // Local dialog states
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [failDialogOpen, setFailDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ReadinessItemDto | null>(null)
  const [failNote, setFailNote] = useState('')
  const [linkTaskDialogOpen, setLinkTaskDialogOpen] = useState(false)
  const [correctiveTaskId, setCorrectiveTaskId] = useState('')
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [newFileId, setNewFileId] = useState('')
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemMandatory, setNewItemMandatory] = useState(true)

  const items = checklist?.items || []
  const totalItems = items.length
  const mandatoryItems = items.filter((i) => i.mandatory).length
  const passedItems = items.filter((i) => String(i.status).toUpperCase() === 'PASSED').length
  const failedItems = items.filter((i) => String(i.status).toUpperCase() === 'FAILED').length
  const pendingItems = items.filter((i) => String(i.status).toUpperCase() === 'PENDING').length

  const isReady = checklist ? String(checklist.status).toUpperCase() === 'READY' : false

  // Action: Mark Pass
  const handleMarkPass = async (item: ReadinessItemDto) => {
    if (!checklist) return
    try {
      await recordResultMut.mutateAsync({
        checkId: checklist.id,
        itemId: item.id,
        version: checklist.version,
        data: {
          result: 'Passed',
          note: item.note || 'Đã kiểm tra đạt yêu cầu kỹ thuật',
          evidenceFileIds: item.evidenceFileIds,
        },
      })
      toast(t('features.readiness.recordSuccess'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Mark Fail (Submit from dialog)
  const handleSubmitFail = async () => {
    if (!checklist || !selectedItem) return
    try {
      await recordResultMut.mutateAsync({
        checkId: checklist.id,
        itemId: selectedItem.id,
        version: checklist.version,
        data: {
          result: 'Failed',
          note: failNote.trim() || 'Hạng mục chưa đạt tiêu chuẩn an toàn',
          evidenceFileIds: selectedItem.evidenceFileIds,
        },
      })
      toast(t('features.readiness.recordSuccess'))
      setFailDialogOpen(false)
      setFailNote('')
      setSelectedItem(null)
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Recheck Item
  const handleRecheck = async (item: ReadinessItemDto) => {
    if (!checklist) return
    try {
      await recheckMut.mutateAsync({
        checkId: checklist.id,
        itemId: item.id,
        version: checklist.version,
        data: {
          result: 'Passed',
          note: 'Kiểm tra lại: đã khắc phục đạt chuẩn',
          evidenceFileIds: item.evidenceFileIds,
        },
      })
      toast(t('features.readiness.recheckSuccess'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Link Corrective Task
  const handleLinkTask = async () => {
    if (!checklist || !selectedItem || !correctiveTaskId.trim()) return
    try {
      await linkTaskMut.mutateAsync({
        checkId: checklist.id,
        itemId: selectedItem.id,
        version: checklist.version,
        taskId: correctiveTaskId.trim(),
      })
      toast(t('features.readiness.linkTaskSuccess'))
      setLinkTaskDialogOpen(false)
      setCorrectiveTaskId('')
      setSelectedItem(null)
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Attach Evidence
  const handleAttachEvidence = async () => {
    if (!checklist || !selectedItem || !newFileId.trim()) return
    try {
      await attachEvidenceMut.mutateAsync({
        checkId: checklist.id,
        itemId: selectedItem.id,
        fileIds: [...selectedItem.evidenceFileIds, newFileId.trim()],
      })
      toast('Đã đính kèm minh chứng thành công')
      setEvidenceDialogOpen(false)
      setNewFileId('')
      setSelectedItem(null)
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Download Evidence URL
  const handleDownloadEvidence = async (itemId: string, fileId: string) => {
    if (!checklist) return
    try {
      const res = await getReadinessEvidenceDownloadUrl(checklist.id, itemId, fileId)
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, '_blank')
      } else {
        toast('Không tìm thấy liên kết tải minh chứng', 'alert')
      }
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Confirm Readiness
  const handleConfirmReadiness = async () => {
    if (!checklist) return
    try {
      await confirmMut.mutateAsync({
        checkId: checklist.id,
        version: checklist.version,
      })
      toast(t('features.readiness.confirmSuccess'))
      setConfirmOpen(false)
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Reopen Checklist
  const handleReopenChecklist = async () => {
    if (!checklist || !reopenReason.trim()) return
    try {
      await reopenMut.mutateAsync({
        checkId: checklist.id,
        version: checklist.version,
        reason: reopenReason.trim(),
      })
      toast(t('features.readiness.reopenSuccess'))
      setReopenOpen(false)
      setReopenReason('')
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Action: Add Item (Replace Items API)
  const handleAddItem = async () => {
    if (!checklist || !newItemName.trim()) return
    try {
      const newItems = [
        ...items.map((i) => ({
          name: i.name,
          description: i.description,
          mandatory: i.mandatory,
        })),
        {
          name: newItemName.trim(),
          description: newItemDesc.trim() || undefined,
          mandatory: newItemMandatory,
        },
      ]
      await replaceItemsMut.mutateAsync({
        checkId: checklist.id,
        version: checklist.version,
        items: newItems,
      })
      toast('Đã cập nhật danh mục kiểm tra')
      setAddItemDialogOpen(false)
      setNewItemName('')
      setNewItemDesc('')
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('features.readiness.title')} sub={t('common.loading')} />
        <Card className="p-8 text-center text-muted-foreground">{t('common.loading')}</Card>
      </div>
    )
  }

  if (!checklist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="size-8 p-0"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <PageHeader title={t('features.readiness.title')} sub={t('features.readiness.sub')} />
        </div>
        <Card className="p-8">
          <EmptyState text={t('features.readiness.empty')} />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="size-8 p-0"
              aria-label={t('common.back')}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{checklist.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('features.readiness.workArea')}: <span className="font-semibold text-foreground">{checklist.workAreaName}</span> · Phiên bản: #{checklist.version}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {getStatusBadge(checklist.status)}

          {!isReady ? (
            <Button
              onClick={() => setConfirmOpen(true)}
              className="bg-brand-pine hover:bg-brand-pine/90 text-white flex items-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="size-4" />
              {t('features.readiness.confirm')}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setReopenOpen(true)}
              className="text-orange-600 border-orange-500/40 hover:bg-orange-500/10 flex items-center gap-1.5"
            >
              <RotateCcw className="size-4" />
              {t('features.readiness.reopen')}
            </Button>
          )}

          {String(checklist.status).toUpperCase() === 'PLANNING' && (
            <Button
              variant="outline"
              onClick={() => setAddItemDialogOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              {t('features.readiness.createChecklist')}
            </Button>
          )}
        </div>
      </div>

      {checklist.reopenReason && (
        <Card className="p-4 border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200 flex items-start gap-3">
          <AlertTriangle className="size-5 shrink-0 text-orange-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">{t('features.readiness.reopenReason')}</p>
            <p className="text-sm">{checklist.reopenReason}</p>
          </div>
        </Card>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Tổng số hạng mục" value={totalItems} />
        <StatCard label="Bắt buộc" value={mandatoryItems} />
        <StatCard label="Đã đạt" value={passedItems} />
        <StatCard label="Không đạt" value={failedItems} />
        <StatCard label="Chờ kiểm tra" value={pendingItems} />
      </div>

      {/* Items List */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="size-5 text-brand-pine" />
              Hạng mục kiểm tra sẵn sàng ({totalItems})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tất cả các hạng mục bắt buộc phải đạt kiểm tra trước khi xác nhận sẵn sàng
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <EmptyState text={t('features.readiness.empty')} />
        ) : (
          <div className="divide-y divide-border/40">
            {items.map((item, idx) => (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">#{idx + 1}</span>
                      <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                      {item.mandatory ? (
                        <Badge className="text-rose-600 border-rose-500/30 bg-rose-500/10 text-[11px]">
                          {t('features.readiness.mandatory')}
                        </Badge>
                      ) : (
                        <Badge className="text-muted-foreground border-border bg-muted/40 text-[11px]">
                          {t('features.readiness.optional')}
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {getItemStatusBadge(item.status)}
                  </div>
                </div>

                {item.note && (
                  <div className="rounded-md bg-muted/30 p-2.5 text-xs text-muted-foreground border border-border/40">
                    <span className="font-semibold text-foreground">{t('features.readiness.note')}: </span>
                    {item.note}
                  </div>
                )}

                {item.correctiveTaskId && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="size-3.5" />
                    <span>Nhiệm vụ khắc phục liên kết: <code className="font-mono font-bold">{item.correctiveTaskId}</code></span>
                  </div>
                )}

                {/* Evidence files */}
                {item.evidenceFileIds && item.evidenceFileIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="size-3" /> Minh chứng ({item.evidenceFileIds.length}):
                    </span>
                    {item.evidenceFileIds.map((fid) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => handleDownloadEvidence(item.id, fid)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        <Download className="size-3 text-brand-pine" />
                        <span className="font-mono text-[11px] truncate max-w-[120px]">{fid}</span>
                        <ExternalLink className="size-2.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Actions per item */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/20">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(item)
                      setEvidenceDialogOpen(true)
                    }}
                    className="h-8 text-xs flex items-center gap-1"
                  >
                    <Paperclip className="size-3.5" />
                    Đính kèm minh chứng
                  </Button>

                  {String(item.status).toUpperCase() === 'FAILED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedItem(item)
                        setLinkTaskDialogOpen(true)
                      }}
                      className="h-8 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/10 flex items-center gap-1"
                    >
                      <AlertTriangle className="size-3.5" />
                      Gán nhiệm vụ khắc phục
                    </Button>
                  )}

                  {String(item.status).toUpperCase() === 'RECHECK' && (
                    <Button
                      size="sm"
                      onClick={() => handleRecheck(item)}
                      className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1"
                    >
                      <RotateCcw className="size-3.5" />
                      Kiểm tra lại
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedItem(item)
                      setFailDialogOpen(true)
                    }}
                    className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-1"
                  >
                    <XCircle className="size-3.5" />
                    Không đạt
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleMarkPass(item)}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Đạt
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog: Confirm Readiness */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t('features.readiness.confirmTitle')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('features.readiness.confirmDesc')}
          </p>
          <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground border border-border/50">
            <p>• Phân khu: <b className="text-foreground">{checklist.workAreaName}</b></p>
            <p>• Số hạng mục bắt buộc đạt: <b className="text-foreground">{passedItems}/{mandatoryItems}</b></p>
            <p>• Concurrency Version: <code className="font-mono font-bold text-foreground">#{checklist.version}</code></p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmReadiness} className="bg-brand-pine hover:bg-brand-pine/90 text-white">
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Reopen Checklist */}
      <Dialog open={reopenOpen} onClose={() => setReopenOpen(false)} title={t('features.readiness.reopenTitle')}>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reopen-reason">{t('features.readiness.reopenReason')} *</Label>
            <Textarea
              id="reopen-reason"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={t('features.readiness.reopenReasonPlaceholder')}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setReopenOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleReopenChecklist}
              disabled={!reopenReason.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {t('features.readiness.reopen')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Mark Failed with Note */}
      <Dialog open={failDialogOpen} onClose={() => setFailDialogOpen(false)} title="Đánh giá không đạt">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hạng mục: <b className="text-foreground">{selectedItem?.name}</b>
          </p>
          <div className="space-y-2">
            <Label htmlFor="fail-note">Lý do không đạt &amp; Yêu cầu khắc phục *</Label>
            <Textarea
              id="fail-note"
              value={failNote}
              onChange={(e) => setFailNote(e.target.value)}
              placeholder="Nhập chi tiết hiện trạng không đạt và yêu cầu xử lý..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFailDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmitFail} className="bg-destructive hover:bg-destructive/90 text-white">
              Ghi nhận Không đạt
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Link Corrective Task */}
      <Dialog open={linkTaskDialogOpen} onClose={() => setLinkTaskDialogOpen(false)} title="Gán nhiệm vụ khắc phục">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gán nhiệm vụ khắc phục cho hạng mục: <b className="text-foreground">{selectedItem?.name}</b>
          </p>
          <div className="space-y-2">
            <Label htmlFor="task-id">Mã nhiệm vụ (Task ID) *</Label>
            <Input
              id="task-id"
              value={correctiveTaskId}
              onChange={(e) => setCorrectiveTaskId(e.target.value)}
              placeholder="Nhập mã nhiệm vụ khắc phục (ví dụ: task-corr-102)..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setLinkTaskDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleLinkTask} disabled={!correctiveTaskId.trim()} className="bg-brand-pine hover:bg-brand-pine/90 text-white">
              Xác nhận gán
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Attach Evidence */}
      <Dialog open={evidenceDialogOpen} onClose={() => setEvidenceDialogOpen(false)} title="Đính kèm minh chứng">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Đính kèm minh chứng cho hạng mục: <b className="text-foreground">{selectedItem?.name}</b>
          </p>
          <div className="space-y-2">
            <Label htmlFor="file-id">Mã tệp minh chứng (File ID) *</Label>
            <Input
              id="file-id"
              value={newFileId}
              onChange={(e) => setNewFileId(e.target.value)}
              placeholder="Nhập mã tệp đã tải lên hệ thống..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEvidenceDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAttachEvidence} disabled={!newFileId.trim()} className="bg-brand-pine hover:bg-brand-pine/90 text-white">
              Đính kèm
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Add Item */}
      <Dialog open={addItemDialogOpen} onClose={() => setAddItemDialogOpen(false)} title="Thêm hạng mục kiểm tra">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-item-name">Tên hạng mục *</Label>
            <Input
              id="new-item-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Ví dụ: Kiểm tra neo giằng chống bão..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-item-desc">Mô tả tiêu chuẩn</Label>
            <Textarea
              id="new-item-desc"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Mô tả tiêu chí và phương pháp đo đạc..."
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="new-item-mandatory"
              checked={newItemMandatory}
              onChange={(e) => setNewItemMandatory(e.target.checked)}
              className="rounded border-border text-brand-pine focus:ring-brand-pine"
            />
            <Label htmlFor="new-item-mandatory" className="text-sm font-normal cursor-pointer">
              Hạng mục bắt buộc phải đạt
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddItem} disabled={!newItemName.trim()} className="bg-brand-pine hover:bg-brand-pine/90 text-white">
              Thêm hạng mục
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
