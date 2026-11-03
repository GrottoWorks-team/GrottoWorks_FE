// Chấm công (/leader/timesheets) — BE TaskExecution attendance.
// Leader duyệt đơn xin check-in, đơn sửa giờ và xem tổng giờ công theo khu.
// Check-in/out & gửi đơn sửa thuộc app mobile nên web không tạo bản ghi.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import {
  useAttendanceCorrections,
  useAttendanceRequests,
  useReviewAttendanceRequest,
  useReviewCorrection,
  useWorkingHours,
} from '../api'
import type { AttendanceCorrection, AttendanceRequest, WorkingHourSummary } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

function ReviewDialog({
  title,
  onClose,
  onSubmit,
}: {
  title: string
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
          <Button onClick={submit} disabled={busy}>
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <Label htmlFor="review-note">{t('features.timesheets.reviewNote')}</Label>
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

  const { data: requests = [], isPending: requestsPending } = useAttendanceRequests(selected?.id)
  const { data: corrections = [], isPending: correctionsPending } = useAttendanceCorrections(selected?.id)
  const { data: hours = [] } = useWorkingHours(selected?.id)
  const reviewRequest = useReviewAttendanceRequest()
  const reviewCorrection = useReviewCorrection()

  const [rejecting, setRejecting] = useState<
    { kind: 'request'; item: AttendanceRequest } | { kind: 'correction'; item: AttendanceCorrection } | null
  >(null)

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id.slice(0, 8)

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
        key: 'requestedAt',
        header: t('features.timesheets.requestedAt'),
        render: (r: AttendanceRequest) => <span className="tabular">{viDateTime(r.requestedAt)}</span>,
      },
      { key: 'type', header: t('common.status'), render: (r: AttendanceRequest) => r.type },
      { key: 'note', header: t('features.purchases.note'), render: (r: AttendanceRequest) => r.note || '—' },
      { key: 'status', header: t('common.status'), render: (r: AttendanceRequest) => <StatusTag status={r.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (r: AttendanceRequest) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => approveRequest(r)}>
              <Check className="size-4" /> {t('features.timesheets.approve')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting({ kind: 'request', item: r })}>
              <X className="size-4" /> {t('features.timesheets.reject')}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
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
        render: (c: AttendanceCorrection) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => approveCorrection(c)}>
              <Check className="size-4" /> {t('features.timesheets.approve')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting({ kind: 'correction', item: c })}>
              <X className="size-4" /> {t('features.timesheets.reject')}
            </Button>
          </div>
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
        <StatCard label={t('features.timesheets.pendingRequests')} value={requests.length} unit={t('features.timesheets.requestUnit')} />
        <StatCard label={t('features.timesheets.pendingCorrections')} value={corrections.length} unit={t('features.timesheets.requestUnit')} />
        <StatCard label={t('features.timesheets.totalApprovedHours')} value={totalHours} unit={t('features.timesheets.hours')} tone="ok" />
      </div>

      <h2 className="mb-3 font-semibold text-foreground">{t('features.timesheets.requestsTitle')}</h2>
      {requestsPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={requests} columns={requestColumns} emptyText={t('features.timesheets.noRequests')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.timesheets.correctionsTitle')}</h2>
      {correctionsPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={corrections} columns={correctionColumns} emptyText={t('features.timesheets.noCorrections')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.timesheets.hoursTitle')}</h2>
      <DataTable rows={hours} columns={hoursColumns} emptyText={t('features.timesheets.noHours')} />

      {rejecting && (
        <ReviewDialog
          title={
            rejecting.kind === 'request'
              ? t('features.timesheets.rejectReqTitle')
              : t('features.timesheets.rejectCorrTitle')
          }
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