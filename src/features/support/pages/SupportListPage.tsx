// Yêu cầu hỗ trợ chéo cộng đoàn (/leader/support, /community/support).
//   LEADER : list / create / publish / close + duyệt thành viên & vật tư của phản hồi
//   PARISH (community): xem danh sách + tổng hợp hỗ trợ theo mùa
//   MO/Volunteer: gửi phản hồi (app mobile / API)
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Eye, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { StatCard } from '@/components/shared/StatCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useScopedAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useSeasonContext } from '@/features/season/season-context'
import {
  useApproveSupportMaterial,
  useApproveSupportMember,
  useCloseSupportRequest,
  usePublishSupportRequest,
  useRejectSupportMaterial,
  useRejectSupportMember,
  useSupportRequests,
  useSupportResponses,
  useSupportSummary,
} from '../api'
import { SupportFormDialog } from './SupportFormDialog'
import type { SupportRequest } from '@/types'
import { viDate } from '@/lib/format'

const TEXTAREA_CLS =
  'mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export default function SupportListPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const toast = useToast()
  const canManage = pathname.startsWith('/leader/')
  const { seasonId } = useSeasonContext()

  const { user } = useAuth()
  const { data: allAreas = [] } = useScopedAreas()
  // BE chỉ cho LEADER tạo yêu cầu trên khu mình phụ trách (403 WORK_AREA_ACCESS_DENIED).
  const areas = canManage && user ? allAreas.filter((a) => a.leaderId === user.id) : allAreas
  const { data: materials = [] } = useMaterials()
  const { data: requests = [], isPending } = useSupportRequests()
  // support-summary chỉ BE-PARISH/ADMIN đọc được → leader không gọi (tránh 403).
  const { data: summary } = useSupportSummary(!canManage ? (seasonId ?? undefined) : undefined)
  const [creating, setCreating] = useState(false)
  const [detail, setDetail] = useState<SupportRequest | null>(null)
  const [closing, setClosing] = useState(false)
  const [closeReason, setCloseReason] = useState('')
  const [reviewTarget, setReviewTarget] = useState<{
    kind: 'member' | 'material'
    id: string
    version: number
    title: string
    quantity?: number
  } | null>(null)
  const [reviewReason, setReviewReason] = useState('')

  const { data: responses = [] } = useSupportResponses(detail?.id)
  const publish = usePublishSupportRequest()
  const close = useCloseSupportRequest()
  const approveMember = useApproveSupportMember()
  const rejectMember = useRejectSupportMember()
  const approveMaterial = useApproveSupportMaterial()
  const rejectMaterial = useRejectSupportMaterial()

  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'
  const materialName = (id: string) => materials.find((m) => m.id === id)?.name ?? id

  const positionsOf = (r: SupportRequest) =>
    r.positions.map((p) => `${p.name} ×${p.requiredVolunteerCount}`).join(', ') || '—'

  const materialsOf = (r: SupportRequest) =>
    r.materials.map((m) => `${materialName(m.materialId)} ×${m.requiredQuantity}`).join(', ') || '—'

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  const onPublish = async () => {
    if (!detail) return
    try {
      const updated = await publish.mutateAsync({ id: detail.id, version: detail.version })
      setDetail(updated)
      toast(t('features.support.published'))
    } catch (error) {
      fail(error)
    }
  }

  const onClose = async () => {
    if (!detail) return
    try {
      const updated = await close.mutateAsync({
        id: detail.id,
        version: detail.version,
        status: 'CLOSED',
        reason: closeReason.trim() || undefined,
      })
      setDetail(updated)
      setClosing(false)
      setCloseReason('')
      toast(t('features.support.closed'))
    } catch (error) {
      fail(error)
    }
  }

  const submitReview = async (approve: boolean) => {
    if (!reviewTarget) return
    try {
      if (reviewTarget.kind === 'member') {
        if (approve) {
          await approveMember.mutateAsync({
            memberId: reviewTarget.id,
            version: reviewTarget.version,
          })
        } else {
          await rejectMember.mutateAsync({
            memberId: reviewTarget.id,
            version: reviewTarget.version,
            reason: reviewReason.trim(),
          })
        }
      } else if (approve) {
        await approveMaterial.mutateAsync({
          itemId: reviewTarget.id,
          version: reviewTarget.version,
          approvedQuantity: reviewTarget.quantity ?? 0,
        })
      } else {
        await rejectMaterial.mutateAsync({
          itemId: reviewTarget.id,
          version: reviewTarget.version,
          reason: reviewReason.trim(),
        })
      }
      toast(t('features.support.reviewed'))
      setReviewTarget(null)
      setReviewReason('')
    } catch (error) {
      fail(error)
    }
  }

  const columns = useMemo(
    () => [
      { key: 'area', header: t('features.support.area'), render: (r: SupportRequest) => areaName(r.workAreaId) },
      {
        key: 'kind',
        header: t('features.support.kind'),
        render: (r: SupportRequest) => t(`features.support.type.${r.supportType}`),
      },
      { key: 'detail', header: t('features.support.detail'), render: (r: SupportRequest) => <span className="text-sm">{r.description || '—'}</span> },
      { key: 'positions', header: t('features.support.positions'), render: positionsOf },
      { key: 'materials', header: t('features.support.materials'), render: materialsOf },
      {
        key: 'deadline',
        header: t('features.support.deadline'),
        render: (r: SupportRequest) => <span className="tabular">{r.deadline ? viDate(r.deadline) : '—'}</span>,
      },
      { key: 'status', header: t('common.status'), render: (r: SupportRequest) => <StatusTag status={r.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: SupportRequest) => (
          <Button variant="ghost" size="icon" aria-label={t('features.support.detail')} onClick={() => setDetail(r)}>
            <Eye className="size-4" />
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, areas, materials],
  )

  return (
    <div>
      <PageHeader
        title={t('features.support.title')}
        sub={t('features.support.sub')}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('features.support.create')}
            </Button>
          )
        }
      />

      {!canManage && summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={t('features.support.summaryRequests')} value={summary.totalRequests} />
          <StatCard
            label={t('features.support.summaryCommunities')}
            value={summary.communities.length}
          />
          <StatCard
            label={t('features.support.summaryApproved')}
            value={summary.communities.reduce((sum, row) => sum + row.approvedMembers, 0)}
            tone="ok"
          />
        </div>
      )}

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={requests} columns={columns} emptyText={t('features.support.empty')} />
      )}

      {creating && <SupportFormDialog open onClose={() => setCreating(false)} />}

      {detail && (
        <Dialog
          open
          onClose={() => setDetail(null)}
          title={t('features.support.detailTitle')}
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setDetail(null)}>
                {t('common.close')}
              </Button>
              {canManage && detail.status === 'PLANNING' && (
                <Button onClick={() => void onPublish()} disabled={publish.isPending}>
                  {t('features.support.publish')}
                </Button>
              )}
              {canManage && detail.status !== 'CLOSED' && detail.status !== 'CANCELLED' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setCloseReason('')
                    setClosing(true)
                  }}
                >
                  {t('features.support.closeRequest')}
                </Button>
              )}
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <p><span className="font-semibold">{t('features.support.area')}:</span> {areaName(detail.workAreaId)}</p>
              <p><span className="font-semibold">{t('common.status')}:</span> <StatusTag status={detail.status} /></p>
              <p className="col-span-2"><span className="font-semibold">{t('features.support.detail')}:</span> {detail.description || '—'}</p>
              <p className="col-span-2"><span className="font-semibold">{t('features.support.positions')}:</span> {positionsOf(detail)}</p>
              <p className="col-span-2"><span className="font-semibold">{t('features.support.materials')}:</span> {materialsOf(detail)}</p>
            </div>

            <div className="border-t border-border/60 pt-3">
              <p className="lbl-mono mb-2">{t('features.support.responsesTitle')}</p>
              {responses.length === 0 ? (
                <p className="text-muted-foreground">{t('features.support.noResponses')}</p>
              ) : (
                <ul className="space-y-3">
                  {responses.map((response) => (
                    <li key={response.id} className="rounded-md border border-border/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {response.volunteerId ?? response.respondingCommunityId ?? '—'}
                        </span>
                        <StatusTag status={response.status} />
                      </div>
                      {response.note && (
                        <p className="mb-2 text-xs text-muted-foreground">{response.note}</p>
                      )}
                      <div className="space-y-1">
                        {response.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 px-2 py-1 text-xs"
                          >
                            <span>
                              {t('features.support.member')}: {member.volunteerId}
                            </span>
                            <span className="flex items-center gap-1">
                              <StatusTag status={member.status} />
                              {canManage && member.status === 'OFFERED' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                    onClick={() =>
                                      setReviewTarget({
                                        kind: 'member',
                                        id: member.id,
                                        version: member.version,
                                        title: member.volunteerId,
                                      })
                                    }
                                  >
                                    {t('features.support.review')}
                                  </Button>
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                        {response.materials.map((material) => (
                          <div
                            key={material.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 px-2 py-1 text-xs"
                          >
                            <span>
                              {materialName(material.materialId)} ×{material.offeredQuantity}
                            </span>
                            <span className="flex items-center gap-1">
                              <StatusTag status={material.status} />
                              {canManage && material.status === 'OFFERED' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2"
                                  onClick={() =>
                                    setReviewTarget({
                                      kind: 'material',
                                      id: material.id,
                                      version: material.version,
                                      title: materialName(material.materialId),
                                      quantity: material.offeredQuantity,
                                    })
                                  }
                                >
                                  {t('features.support.review')}
                                </Button>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {closing && detail && (
        <Dialog
          open
          onClose={() => setClosing(false)}
          title={t('features.support.closeRequest')}
          footer={
            <>
              <Button variant="outline" onClick={() => setClosing(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void onClose()} disabled={close.isPending}>
                {t('features.support.closeRequest')}
              </Button>
            </>
          }
        >
          <Label htmlFor="support-close-reason">{t('features.support.closeReason')}</Label>
          <textarea
            id="support-close-reason"
            rows={3}
            maxLength={500}
            className={TEXTAREA_CLS}
            value={closeReason}
            onChange={(e) => setCloseReason(e.target.value)}
          />
        </Dialog>
      )}

      {reviewTarget && (
        <Dialog
          open
          onClose={() => setReviewTarget(null)}
          title={t('features.support.reviewTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setReviewTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void submitReview(false)} disabled={!reviewReason.trim()}>
                {t('features.support.reject')}
              </Button>
              <Button onClick={() => void submitReview(true)}>{t('features.support.approve')}</Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{reviewTarget.title}</p>
            <Label htmlFor="support-review-reason">{t('features.support.reviewReason')}</Label>
            <textarea
              id="support-review-reason"
              rows={3}
              maxLength={500}
              className={TEXTAREA_CLS}
              value={reviewReason}
              onChange={(e) => setReviewReason(e.target.value)}
            />
            <Card className="p-2 text-xs text-muted-foreground">
              {t('features.support.reviewHint')}
            </Card>
          </div>
        </Dialog>
      )}
    </div>
  )
}
