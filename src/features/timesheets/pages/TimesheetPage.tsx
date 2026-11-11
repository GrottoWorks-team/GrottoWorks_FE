// Chấm công (/leader/timesheets) — BE TaskExecution attendance.
// Leader duyệt đơn xin check-in, đơn sửa giờ và xem tổng giờ công theo khu.
// Check-in/out & gửi đơn sửa thuộc app mobile nên web không tạo bản ghi.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
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
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { viDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  attendanceRequestQuery,
  useAttendanceCorrections,
  useAttendanceRequests,
  useCloseAttendanceSession,
  useOpenAttendanceSessions,
  useReviewAttendanceRequest,
  useReviewCorrection,
  useWorkingHours,
} from '../api'
import type { OpenAttendanceSession } from '../api'
import type {
  AttendanceCorrection,
  AttendanceCorrectionStatus,
  AttendanceRequest,
  AttendanceRequestStatus,
  WorkingHourSummary,
} from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

/** Tab trạng thái — BE đã hỗ trợ `?status=` cho cả đơn check-in và đơn sửa giờ. */
function StatusTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
            value === option.value
              ? 'border-primary bg-brand-pineLight text-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/50',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ReviewDialog({
  title,
  label,
  required,
  onClose,
  onSubmit,
}: {
  title: string
  label?: string
  required?: boolean
  onClose: () => void
  onSubmit: (note: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await onSubmit(note)
      onClose()
    } finally {
      setBusy(false)
    }
  }

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
          <Button onClick={submit} disabled={busy || (required && !note.trim())}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <Label htmlFor="review-note">{label ?? t('features.timesheets.reviewNote')}</Label>
      <Input id="review-note" value={note} onChange={(e) => setNote(e.target.value)} />
    </Dialog>
  )
}

export default function TimesheetPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [] } = useScopedAreas()
  const { data: users = [] } = useUsers()

  const myAreas = useMemo(
    () => (user?.role === 'LEADER' ? areas.filter((a) => a.leaderId === user.id) : areas),
    [areas, user],
  )
  const [areaId, setAreaId] = useState('')
  const selected = myAreas.find((a) => a.id === areaId) ?? myAreas[0]

  // Tab trạng thái: BE đã hỗ trợ `?status=` nên chỉ cần đổi tham số truy vấn.
  const [requestStatus, setRequestStatus] = useState<AttendanceRequestStatus>('PENDING')
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceCorrectionStatus>('PENDING')
  const { data: pendingRequests = [] } = useAttendanceRequests(selected?.id, 'PENDING')
  const { data: pendingCorrections = [] } = useAttendanceCorrections(selected?.id, 'PENDING')
  const { data: requests = [], isPending: requestsPending } = useAttendanceRequests(selected?.id, requestStatus)
  const { data: corrections = [], isPending: correctionsPending } = useAttendanceCorrections(
    selected?.id,
    correctionStatus,
  )
  const { data: hours = [] } = useWorkingHours(selected?.id)
  const reviewRequest = useReviewAttendanceRequest()
  const reviewCorrection = useReviewCorrection()
  const closeSession = useCloseAttendanceSession()

  // Đơn chờ ở các khu KHÁC: bảng đơn chỉ theo khu đang chọn nên cần nhắc để leader không bỏ sót.
  const areaPending = useQueries({
    queries: myAreas.map((area) => attendanceRequestQuery(area.id, 'PENDING')),
  })
  const otherAreasPending = areaPending.reduce(
    (sum, query, index) =>
      myAreas[index]?.id === selected?.id ? sum : sum + (query.data?.length ?? 0),
    0,
  )

  const [closing, setClosing] = useState<OpenAttendanceSession | null>(null)

  const [rejecting, setRejecting] = useState<
    { kind: 'request'; item: AttendanceRequest } | { kind: 'correction'; item: AttendanceCorrection } | null
  >(null)

  const userName = (id?: string | null) => {
    if (!id) return t('features.timesheets.unknownVolunteer')
    return users.find((u) => u.id === id)?.name ?? id.slice(0, 8)
  }

  // `CHECK_IN`/`CHECK_OUT` từ BE → nhãn tiếng Việt; thiếu bản dịch thì giữ nguyên.
  const requestTypeLabel = (type: string) => {
    const key = `features.timesheets.type.${type}`
    const label = t(key)
    return label === key ? type : label
  }

  const approveRequest = async (request: AttendanceRequest) => {
    try {
      await reviewRequest.mutateAsync({ requestId: request.id, approve: true, version: request.version })
      toast(t('features.timesheets.approvedReq'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const approveCorrection = async (correction: AttendanceCorrection) => {
    try {
      await reviewCorrection.mutateAsync({
        correctionId: correction.id,
        approve: true,
        version: correction.version,
      })
      toast(t('features.timesheets.approvedCorr'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const requestColumns = useMemo(
    () => [
      {
        key: 'volunteer',
        header: t('features.timesheets.volunteer'),
        render: (r: AttendanceRequest) => (
          <span className="font-semibold text-foreground">{userName(r.volunteerId)}</span>
        ),
      },
      {
        key: 'task',
        header: t('features.timesheets.task'),
        render: (r: AttendanceRequest) => (
          <span className="text-foreground">{r.taskName ?? '—'}</span>
        ),
      },
      {
        key: 'type',
        header: t('features.timesheets.requestType'),
        render: (r: AttendanceRequest) => requestTypeLabel(r.type),
      },
      {
        key: 'requestedAt',
        header: t('features.timesheets.requestedAt'),
        render: (r: AttendanceRequest) => <span className="tabular">{viDateTime(r.requestedAt)}</span>,
      },
      { key: 'note', header: t('features.purchases.note'), render: (r: AttendanceRequest) => r.note || '—' },
      {
        key: 'status',
        header: t('common.status'),
        render: (r: AttendanceRequest) => (
          <div className="flex flex-col gap-1">
            <StatusTag status={r.status} />
            {r.reviewNote && (
              <span className="text-xs text-muted-foreground">{r.reviewNote}</span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: AttendanceRequest) =>
          r.status === 'PENDING' ? (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => approveRequest(r)}>
                <Check className="size-4" /> {t('features.timesheets.approve')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting({ kind: 'request', item: r })}>
                <X className="size-4" /> {t('features.timesheets.reject')}
              </Button>
            </div>
          ) : (
            <span className="block text-right text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, users],
  )

  const correctionColumns = useMemo(
    () => [
      {
        key: 'volunteer',
        header: t('features.timesheets.volunteer'),
        render: (c: AttendanceCorrection) => userName(c.requestedBy),
      },
      {
        key: 'original',
        header: t('features.timesheets.original'),
        render: (c: AttendanceCorrection) => (
          <span className="tabular">
            {viDateTime(c.originalCheckInAt)} → {c.originalCheckOutAt ? viDateTime(c.originalCheckOutAt) : '—'}
          </span>
        ),
      },
      {
        key: 'requested',
        header: t('features.timesheets.requested'),
        render: (c: AttendanceCorrection) => (
          <span className="tabular">
            {viDateTime(c.requestedCheckInAt)} → {viDateTime(c.requestedCheckOutAt)}
          </span>
        ),
      },
      { key: 'reason', header: t('features.timesheets.reason'), render: (c: AttendanceCorrection) => c.reason },
      { key: 'status', header: t('common.status'), render: (c: AttendanceCorrection) => <StatusTag status={c.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (c: AttendanceCorrection) =>
          c.status === 'PENDING' ? (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => approveCorrection(c)}>
                <Check className="size-4" /> {t('features.timesheets.approve')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejecting({ kind: 'correction', item: c })}>
                <X className="size-4" /> {t('features.timesheets.reject')}
              </Button>
            </div>
          ) : (
            <span className="block text-right text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, users],
  )

  const hoursColumns = useMemo(
    () => [
      {
        key: 'volunteer',
        header: t('features.timesheets.volunteer'),
        render: (h: WorkingHourSummary) => userName(h.volunteerId),
      },
      {
        key: 'hours',
        header: t('features.timesheets.hours'),
        align: 'right' as const,
        render: (h: WorkingHourSummary) => <span className="tabular">{h.approvedHours}</span>,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, users],
  )

  const totalHours = hours.reduce((sum, h) => sum + Number(h.approvedHours), 0)
  // Cảnh báo phiên mở quá lâu: lọc theo khu đang chọn để khớp với bảng đơn bên trên.
  const { data: openSessions = [] } = useOpenAttendanceSessions(undefined, selected?.id)

  if (!myAreas.length) return <EmptyState text={t('features.tasks.noArea')} />

  return (
    <div>
      <PageHeader title={t('features.timesheets.title')} sub={t('features.timesheets.sub')} />

      <Card className="mb-6 p-5">
        <Label htmlFor="attendance-area">{t('features.allocations.area')}</Label>
        <select
          id="attendance-area"
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

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label={t('features.timesheets.pendingRequests')} value={pendingRequests.length} unit={t('features.timesheets.requestUnit')} />
        <StatCard label={t('features.timesheets.pendingCorrections')} value={pendingCorrections.length} unit={t('features.timesheets.requestUnit')} />
        <StatCard label={t('features.timesheets.totalApprovedHours')} value={totalHours} unit={t('features.timesheets.hours')} tone="ok" />
      </div>

      {otherAreasPending > 0 && (
        <p className="mb-6 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t('features.timesheets.otherAreasPending', { count: otherAreasPending })}
        </p>
      )}

      <h2 className="mb-3 font-semibold text-foreground">{t('features.timesheets.requestsHeading')}</h2>
      <StatusTabs
        value={requestStatus}
        onChange={setRequestStatus}
        options={[
          { value: 'PENDING', label: t('features.timesheets.statusPending') },
          { value: 'APPROVED', label: t('features.timesheets.statusApproved') },
          { value: 'REJECTED', label: t('features.timesheets.statusRejected') },
          { value: 'CANCELLED', label: t('features.timesheets.statusCancelled') },
        ]}
      />
      {requestsPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={requests} columns={requestColumns} emptyText={t('features.timesheets.emptyByStatus')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.timesheets.correctionsHeading')}</h2>
      <StatusTabs
        value={correctionStatus}
        onChange={setCorrectionStatus}
        options={[
          { value: 'PENDING', label: t('features.timesheets.statusPending') },
          { value: 'APPROVED', label: t('features.timesheets.statusApproved') },
          { value: 'REJECTED', label: t('features.timesheets.statusRejected') },
        ]}
      />
      {correctionsPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={corrections} columns={correctionColumns} emptyText={t('features.timesheets.emptyByStatus')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.timesheets.hoursTitle')}</h2>
      <DataTable rows={hours} columns={hoursColumns} emptyText={t('features.timesheets.noHours')} />

      <h2 className="mb-1 mt-8 font-semibold text-foreground">
        {t('features.timesheets.openSessionsTitle')}
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">{t('features.timesheets.openSessionsHint')}</p>
      <Card className="p-5">
        {openSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('features.timesheets.noOpenSessions')}</p>
        ) : (
          <ul className="space-y-2">
            {openSessions.map((session) => {
              const hoursOpen = (Date.now() - new Date(session.checkInAt).getTime()) / 3_600_000
              return (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-status-dangerBg/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">
                      {userName(session.volunteerId)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {session.taskName ?? '—'}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="tabular text-foreground">
                      {t('features.timesheets.checkedInAt', { at: viDateTime(session.checkInAt) })}
                    </span>
                    <span className="tabular font-semibold text-status-dangerText">
                      {t('features.timesheets.hoursOpen', { hours: hoursOpen.toFixed(1) })}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setClosing(session)}>
                      <Check className="size-3.5" />
                      {t('features.timesheets.closeSession')}
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {closing && (
        <ReviewDialog
          title={t('features.timesheets.closeSessionTitle')}
          label={t('features.timesheets.closeSessionReason')}
          required
          onClose={() => setClosing(null)}
          onSubmit={async (reason) => {
            try {
              await closeSession.mutateAsync({
                attendanceId: closing.id,
                version: closing.version,
                reason,
              })
              toast(t('features.timesheets.sessionClosed'))
            } catch {
              toast(t('common.error'), 'alert')
            }
          }}
        />
      )}

      {rejecting && (
        <ReviewDialog
          title={
            rejecting.kind === 'request'
              ? t('features.timesheets.rejectReqTitle')
              : t('features.timesheets.rejectCorrTitle')
          }
          label={t('features.timesheets.rejectReason')}
          required
          onClose={() => setRejecting(null)}
          onSubmit={async (note) => {
            try {
              if (rejecting.kind === 'request') {
                await reviewRequest.mutateAsync({
                  requestId: rejecting.item.id,
                  approve: false,
                  version: rejecting.item.version,
                  reviewNote: note,
                })
                toast(t('features.timesheets.rejectedReq'))
              } else {
                await reviewCorrection.mutateAsync({
                  correctionId: rejecting.item.id,
                  approve: false,
                  version: rejecting.item.version,
                  reviewNote: note,
                })
                toast(t('features.timesheets.rejectedCorr'))
              }
            } catch {
              toast(t('common.error'), 'alert')
            }
          }}
        />
      )}
    </div>
  )
}