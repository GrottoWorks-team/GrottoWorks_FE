// Màn hình chi tiết yêu cầu mua (F3: GET /api/v1/purchase-requests/{requestId})
// kèm Khối Timeline lịch sử chuyển trạng thái (F8: GET /api/v1/purchase-requests/{requestId}/history).
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, History, Send, CheckCircle2, XCircle, FileText, Package, AlertTriangle, Edit } from 'lucide-react'
import { PurchaseFormDialog } from './PurchaseFormDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { viDateTime } from '@/lib/format'
import { errorMessage } from '@/lib/errorMessage'
import {
  usePurchaseRequest,
  usePurchaseRequestHistory,
  useSendForApproval,
  useApproveRequest,
  useRejectRequest,
  type StateChangeDto,
} from '../api'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()

  const { data: request, isLoading, isError } = usePurchaseRequest(id)
  const { data: history = [], isLoading: historyLoading } = usePurchaseRequestHistory(id)

  const send = useSendForApproval()
  const approve = useApproveRequest()
  const reject = useRejectRequest()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [decisionNote, setDecisionNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) {
    return <p className="lbl-mono p-6">{t('common.loading')}</p>
  }

  if (isError || !request) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-destructive">{t('common.error')}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          {t('common.back')}
        </Button>
      </div>
    )
  }

  const isLeader = user?.role === 'LEADER' || user?.role === 'PARISH'
  const isOfficer = user?.role === 'MATERIAL_OFFICER'

  const handleSend = async () => {
    try {
      await send.mutateAsync({ requestId: request.id, version: request.version })
      toast(t('features.purchases.sent', { code: request.id.slice(0, 8) }))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  const handleApprove = async () => {
    try {
      await approve.mutateAsync({
        requestId: request.id,
        version: request.version,
        note: decisionNote.trim() || undefined,
      })
      toast(t('features.purchases.approved', { code: request.id.slice(0, 8) }))
      setApproveOpen(false)
      setDecisionNote('')
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return
    try {
      await reject.mutateAsync({
        requestId: request.id,
        version: request.version,
        reason: rejectReason.trim(),
      })
      toast(t('features.purchases.rejected', { code: request.id.slice(0, 8) }))
      setRejectOpen(false)
      setRejectReason('')
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          <span>{t('features.purchases.backToList')}</span>
        </Button>
      </div>

      <PageHeader
        title={`${t('features.purchases.detailTitle')} #${request.id.slice(0, 8)}`}
        sub={t('features.purchases.detailSub')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {request.status === 'DRAFT' && isOfficer && (
              <>
                <Button
                  variant="outline"
                  id="btn-edit-purchase-request"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit className="size-4" />
                  <span>{t('features.purchases.actions.edit')}</span>
                </Button>
                <Button
                  id="btn-submit-purchase-request"
                  disabled={send.isPending}
                  onClick={() => void handleSend()}
                >
                  <Send className="size-4" />
                  <span>{t('features.purchases.actions.submit')}</span>
                </Button>
              </>
            )}

            {request.status === 'PENDING_APPROVAL' && isLeader && (
              <>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="size-4" />
                  <span>{t('features.purchases.actions.reject')}</span>
                </Button>
                <Button onClick={() => setApproveOpen(true)}>
                  <CheckCircle2 className="size-4" />
                  <span>{t('features.purchases.actions.approve')}</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols): Info + Items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card Thông tin chung */}
          <Card id="purchase-detail-info-card" className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FileText className="size-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {t('features.purchases.infoCard')}
              </h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-muted-foreground">{t('features.purchases.code')}</span>
                <p className="lbl-mono font-semibold text-foreground">#{request.id}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('common.status')}</span>
                <div className="mt-0.5">
                  <StatusTag status={request.status} />
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('features.purchases.area')}</span>
                <p className="font-medium text-foreground">{request.workAreaName || '—'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('features.purchases.total')}</span>
                <p className="tabular text-lg font-bold text-foreground">
                  {(request.estimatedTotal?.amount ?? 0).toLocaleString()} {request.estimatedTotal?.currency ?? 'VND'}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('features.purchases.createdAt')}</span>
                <p className="text-sm text-foreground">{viDateTime(request.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{t('features.purchases.version')}</span>
                <p className="lbl-mono text-sm text-foreground">{request.version}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground">{t('features.purchases.reasonLabel')}</span>
                <p className="mt-0.5 rounded-md bg-muted/40 p-3 text-sm text-foreground">
                  {request.reason || '—'}
                </p>
              </div>
              {request.decisionNote && (
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">{t('features.purchases.decisionNote')}</span>
                  <p className="mt-0.5 rounded-md border border-border/60 bg-card p-3 text-sm text-foreground">
                    {request.decisionNote}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Card Danh sách Items */}
          <Card id="purchase-detail-items-card" className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Package className="size-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {t('features.purchases.itemsCard')}
              </h2>
              <span className="text-xs text-muted-foreground">
                ({t('features.purchases.itemsCount', { count: request.items?.length ?? 0 })})
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 pr-3">{t('features.purchases.materialCode')}</th>
                    <th className="py-2.5 pr-3">{t('features.purchases.materialName')}</th>
                    <th className="py-2.5 pr-3 text-right">{t('features.purchases.requestedQty')}</th>
                    <th className="py-2.5 pr-3">{t('features.purchases.unit')}</th>
                    <th className="py-2.5 pr-3 text-right">{t('features.purchases.estimatedCost')}</th>
                    <th className="py-2.5">{t('features.purchases.shortageOverrideReason')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {request.items && request.items.length > 0 ? (
                    request.items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="py-3 pr-3 font-mono text-xs text-foreground">{item.materialCode}</td>
                        <td className="py-3 pr-3 font-medium text-foreground">{item.materialName}</td>
                        <td className="py-3 pr-3 text-right tabular font-semibold text-foreground">
                          {item.requestedQuantity}
                        </td>
                        <td className="py-3 pr-3 text-muted-foreground">{item.unit}</td>
                        <td className="py-3 pr-3 text-right tabular text-foreground">
                          {item.estimatedCost != null ? `${item.estimatedCost.toLocaleString()} ₫` : '—'}
                        </td>
                        <td className="py-3 text-xs">
                          {item.shortageOverrideReason ? (
                            <div className="flex items-start gap-1 text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                              <span>{item.shortageOverrideReason}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        {t('features.purchases.noItems')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column (1 col): Timeline History F8 */}
        <div className="space-y-6">
          <Card id="purchase-history-timeline-card" className="p-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <History className="size-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">
                {t('features.purchases.historyCard')}
              </h2>
            </div>

            {historyLoading ? (
              <p className="lbl-mono py-4 text-xs">{t('common.loading')}</p>
            ) : history.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">{t('features.purchases.noHistory')}</p>
            ) : (
              <div className="relative mt-4 space-y-4 border-l-2 border-primary/20 pl-4">
                {history.map((change: StateChangeDto, idx: number) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {change.fromStatus ? (
                          <>
                            <StatusTag status={change.fromStatus} />
                            <span className="text-xs text-muted-foreground">→</span>
                          </>
                        ) : (
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                            {t('features.purchases.history.initial')}
                          </span>
                        )}
                        <StatusTag status={change.toStatus} />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        <span>{viDateTime(change.changedAt)}</span>
                      </div>

                      {change.note && (
                        <p className="mt-1 rounded border border-border/50 bg-muted/30 p-2 text-xs text-foreground">
                          {change.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Dialog Duyệt F6 */}
      {approveOpen && (
        <Dialog
          open
          onClose={() => setApproveOpen(false)}
          title={t('features.purchases.approveTitle', { code: request.id.slice(0, 8) })}
          footer={
            <>
              <Button variant="outline" onClick={() => setApproveOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button disabled={approve.isPending} onClick={() => void handleApprove()}>
                {t('common.confirm')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('features.purchases.approveConfirm')}</p>
            <div>
              <Label htmlFor="approve-note">{t('features.purchases.decisionNote')}</Label>
              <textarea
                id="approve-note"
                rows={3}
                className={TEXTAREA_CLS}
                placeholder={t('features.purchases.approveNotePlaceholder')}
                maxLength={500}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
              />
            </div>
          </div>
        </Dialog>
      )}

{/* Dialog Chỉnh sửa F4 */}
      {editOpen && (
        <PurchaseFormDialog
          initialData={request}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Dialog Từ chối F7 */}
      {rejectOpen && (
        <Dialog
          open
          onClose={() => setRejectOpen(false)}
          title={t('features.purchases.rejectTitle', { code: request.id.slice(0, 8) })}
          footer={
            <>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectReason.trim() || reject.isPending}
                onClick={() => void handleReject()}
              >
                {t('features.purchases.reject')}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <Label htmlFor="reject-reason">{t('features.purchases.reason')} *</Label>
            <textarea
              id="reject-reason"
              rows={3}
              className={TEXTAREA_CLS}
              placeholder={t('features.purchases.rejectReasonPlaceholder')}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {!rejectReason.trim() && (
              <p className="text-xs text-destructive">{t('features.purchases.reasonRequired')}</p>
            )}
            <p className="text-right text-[11px] text-muted-foreground">
              {rejectReason.length}/500
            </p>
          </div>
        </Dialog>
      )}
    </div>
  )
}
