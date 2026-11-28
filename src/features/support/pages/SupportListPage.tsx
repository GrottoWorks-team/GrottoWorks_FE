// Yêu cầu hỗ trợ chéo cộng đoàn (/leader/support, /community/support).
//   LEADER : list / create / publish / close + duyệt thành viên & vật tư của phản hồi
//   PARISH (community): xem danh sách + tổng hợp hỗ trợ theo mùa
//   MO/Volunteer: gửi phản hồi (app mobile / API)
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Mùa — Hỗ Trợ Khẩn Cấp".
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { CalendarClock, ChevronRight, HandHeart, LifeBuoy, Plus, Users2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusTag } from '@/components/shared/StatusTag'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
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

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const TH = 'font-mono text-[8.5px] font-semibold uppercase tracking-[0.8px] text-[#8C9F94]'
const TONE: Record<string, string> = {
  PLANNING: 'border-[#E7E0CB] bg-[#F8F6EE] text-[#8A6412]',
  PUBLISHED: 'border-[#CBE3D2] bg-[#E9F4EC] text-[#1B6B45]',
  PARTIALLY_FULFILLED: 'border-[#E7E0CB] bg-[#F8F6EE] text-[#8A6412]',
  FULFILLED: 'border-[#CBE3D2] bg-[#E9F4EC] text-[#1B6B45]',
  CLOSED: 'border-[#E7EEE3] bg-[#F7F9F5] text-[#6B8175]',
  CANCELLED: 'border-[#E7EEE3] bg-[#F7F9F5] text-[#6B8175]',
}

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

  const totalRequests = summary?.totalRequests ?? requests.length
  const communityCount = summary?.communities.length ?? 0
  const approvedMembers = summary?.communities.reduce((sum, row) => sum + row.approvedMembers, 0) ?? 0
  const openCount = summary
    ? (summary.requests.find((row) => row.status === 'PUBLISHED')?.count ?? 0)
    : requests.filter((r) => r.status !== 'CLOSED' && r.status !== 'CANCELLED').length
  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = requests.filter(
    (r) =>
      r.deadline &&
      r.deadline.slice(0, 10) < today &&
      r.status !== 'CLOSED' &&
      r.status !== 'CANCELLED' &&
      r.status !== 'FULFILLED',
  ).length

  const stats = [
    {
      key: 'requests',
      icon: HandHeart,
      label: t('features.support.summaryRequests'),
      value: totalRequests,
      hint: totalRequests
        ? t('features.support.statRequestsHint', { defaultValue: 'Yêu cầu trong mùa đang chạy' })
        : t('features.support.statRequestsNone', { defaultValue: 'Chưa có yêu cầu' }),
      warn: !totalRequests,
    },
    {
      key: 'communities',
      icon: Users2,
      label: t('features.support.summaryCommunities'),
      value: communityCount,
      hint: t('features.support.statCommunitiesHint', { defaultValue: 'Cộng đoàn nhận hỗ trợ' }),
      warn: false,
    },
    {
      key: 'approved',
      icon: LifeBuoy,
      label: t('features.support.summaryApproved'),
      value: approvedMembers,
      hint: t('features.support.statApprovedHint', { defaultValue: 'Tình nguyện viên tham gia' }),
      warn: false,
    },
  ]

  const overview = [
    {
      key: 'open',
      label: t('features.support.overviewOpen', { defaultValue: 'Yêu cầu mở' }),
      value: openCount,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'communities',
      label: t('features.support.overviewCommunities', { defaultValue: 'Cộng đoàn tham gia' }),
      value: communityCount,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'approved',
      label: t('features.support.overviewApproved', { defaultValue: 'Thành viên duyệt' }),
      value: approvedMembers,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'overdue',
      label: t('features.support.overviewOverdue', { defaultValue: 'Quá hạn' }),
      value: overdueCount,
      tone: overdueCount > 0 ? 'text-[#A33F37]' : 'text-[#0B2E1F]',
    },
  ]

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

  const rows = useMemo(
    () =>
      requests.map((request) => ({
        request,
        area: areaName(request.workAreaId),
        kind: t(`features.support.type.${request.supportType}`),
        detailText: request.description || '—',
        positions: positionsOf(request),
        materials: materialsOf(request),
        deadline: request.deadline ? viDate(request.deadline) : '—',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests, t, areas, materials],
  )

  return (
    <div>
      <PageHeader
        title={t('features.support.title')}
        sub={`${t('features.support.sub')}.`}
        actions={
          canManage && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-3 transition-colors hover:bg-[#0D7344]"
            >
              <Plus className="size-[13px] text-[#F2D07A]" aria-hidden />
              <span className="text-[12px] font-bold text-white">{t('features.support.create')}</span>
            </button>
          )
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="grid w-full gap-[14px] md:grid-cols-3">
          {stats.map(({ key, icon: Icon, label, value, hint, warn }) => (
            <section
              key={key}
              className="flex w-full flex-col gap-[9px] rounded-[16px] border border-[#E3EAE0] bg-white p-[15px]"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={cn(
                    'grid size-[26px] shrink-0 place-items-center rounded-[8px]',
                    warn ? 'bg-[#F7F4E7]' : 'bg-[#EDF4EA]',
                  )}
                >
                  <Icon
                    className={cn('size-[13px]', warn ? 'text-[#A8830F]' : 'text-[#3F7F5B]')}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1 text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                  {label}
                </span>
              </div>
              <span className="font-mono text-[28px] font-extrabold leading-none tracking-[-1px] text-[#0B2E1F]">
                {value}
              </span>
              <span className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</span>
            </section>
          ))}
        </div>

        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className={cn(CARD, 'min-w-0 flex-1')}>
            <div className="flex w-full items-center justify-between gap-3 px-4 py-[14px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.support.listHead', { defaultValue: 'Yêu cầu hỗ trợ khẩn cấp' })}
              </span>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.support.countRequests', {
                  defaultValue: '{{count}} yêu cầu',
                  count: requests.length,
                })}
              </span>
            </div>
            <div className={RULE} />
            <div className="flex w-full items-center gap-[10px] bg-[#F7F9F5] px-4 py-[10px]">
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.support.area')}</span>
              <span className={cn(TH, 'w-[120px] shrink-0')}>{t('features.support.kind')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>
                {t('features.support.detailShort', { defaultValue: 'Chi tiết' })}
              </span>
              <span className={cn(TH, 'w-[140px] shrink-0')}>{t('features.support.positions')}</span>
              <span className={cn(TH, 'w-[120px] shrink-0')}>{t('features.support.materials')}</span>
              <span className={cn(TH, 'w-[100px] shrink-0')}>{t('features.support.deadline')}</span>
              <span className={cn(TH, 'w-[120px] shrink-0')}>{t('common.status')}</span>
            </div>

            {isPending ? (
              <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
            ) : rows.length === 0 ? (
              <div className="flex w-full flex-col items-center justify-center gap-[10px] px-5 py-12">
                <span className="grid size-[52px] place-items-center rounded-[16px] bg-[#EDF4EA]">
                  <LifeBuoy className="size-[22px] text-[#3F7F5B]" aria-hidden />
                </span>
                <span className="text-[13px] font-bold text-[#4F7A61]">
                  {t('features.support.empty')}
                </span>
                <span className="w-full max-w-[420px] text-center text-[10.5px] leading-[17px] text-[#A3B4A9]">
                  {t('features.support.emptyBody')}
                </span>
              </div>
            ) : (
              <ul className="flex w-full flex-col">
                {rows.map(({ request, area, kind, detailText, positions, materials: mats, deadline }) => (
                  <li key={request.id}>
                    <button
                      type="button"
                      onClick={() => setDetail(request)}
                      aria-label={t('features.support.detail')}
                      className="flex w-full items-center gap-[10px] border-b border-[#F0F4EC] px-4 py-[11px] text-left transition-colors hover:bg-[#FAFCF8]"
                    >
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#0B2E1F]">
                        {area}
                      </span>
                      <span className="w-[120px] shrink-0 text-[10.5px] text-[#2C463A]">{kind}</span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-[#7C9287]">
                        {detailText}
                      </span>
                      <span className="w-[140px] shrink-0 truncate text-[10.5px] text-[#2C463A]">
                        {positions}
                      </span>
                      <span className="w-[120px] shrink-0 truncate text-[10.5px] text-[#2C463A]">
                        {mats}
                      </span>
                      <span className="w-[100px] shrink-0 font-mono text-[10px] text-[#6B8175]">
                        {deadline}
                      </span>
                      <span className="flex w-[120px] shrink-0 items-center gap-1">
                        {TONE[request.status] ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-[3px] text-[9.5px] font-semibold',
                              TONE[request.status],
                            )}
                          >
                            {t(`status.${request.status}`, { defaultValue: request.status })}
                          </span>
                        ) : (
                          <StatusTag status={request.status} />
                        )}
                        <ChevronRight className="size-[11px] shrink-0 text-[#B0BFB4]" aria-hidden />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
            <section className={CARD}>
              <div className="flex w-full items-center justify-between px-[15px] py-[13px]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.support.overviewHead', { defaultValue: 'Tổng quan hỗ trợ' })}
                </span>
              </div>
              <div className={RULE} />
              <div className="flex w-full flex-col px-[15px] pb-[11px] pt-[5px]">
                {overview.map((row) => (
                  <div
                    key={row.key}
                    className="flex w-full items-center justify-between border-b border-[#F0F4EC] py-2 last:border-0"
                  >
                    <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                    <span className={cn('font-mono text-[10.5px] font-bold', row.tone)}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-[7px] overflow-hidden rounded-[16px] bg-[#06281B] p-[15px]">
              <div className="absolute left-[170px] top-[-50px] size-[150px] rounded-full bg-[#0E7A4633] blur-[20px]" />
              <span className="relative z-[1] flex w-fit items-center gap-[6px] font-mono text-[8.5px] font-bold tracking-[1.1px] text-[#F2D07A]">
                <CalendarClock className="size-[10px]" aria-hidden />
                {t('features.support.whenHead', { defaultValue: 'Khi nào dùng' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[17px] text-[#CFE0D4]">
                {t('features.support.whenBody')}
              </p>
            </section>
          </div>
        </div>
      </div>

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
