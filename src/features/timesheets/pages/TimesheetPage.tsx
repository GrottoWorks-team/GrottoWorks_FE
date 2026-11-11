import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Search, Users, Clock, Timer, Award, Check, X, AlertTriangle, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { useScopedAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import { viDateTime } from '@/lib/format'
import { errorMessage } from '@/lib/errorMessage'
import {
  useWorkingHours,
  useMyAttendance,
  useAttendanceRequests,
  useApproveAttendanceRequest,
  useRejectAttendanceRequest,
  useAttendanceCorrections,
  useApproveAttendanceCorrection,
  useRejectAttendanceCorrection,
  useOpenAttendanceSessions,
} from '../api'
import type {
  AttendanceDto,
  WorkingHourSummary,
  AttendanceRequestDto,
  AttendanceCorrectionDto,
} from '@/types'

interface ReviewModalState {
  type: 'request' | 'correction'
  action: 'approve' | 'reject'
  id: string
  version: number
}

export default function TimesheetPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'personal' | 'approvals'>(
    (user?.role as string) === 'VOLUNTEER' ? 'personal' : 'summary',
  )

  const { data: areas = [] } = useScopedAreas()
  const myAreas = areas.filter((a) => a.leaderId === user?.id)
  const defaultAreaId = myAreas[0]?.id || areas[0]?.id || ''
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const areaId = selectedAreaId || defaultAreaId

  const { data: users = [] } = useUsers()
  const userNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of users) {
      map.set(u.id, u.name || u.email)
    }
    return map
  }, [users])

  const { data: workingHours = [] } = useWorkingHours(areaId)
  const { data: myAttendance = [] } = useMyAttendance()
  const { data: attendanceRequests = [] } = useAttendanceRequests(areaId)
  const { data: attendanceCorrections = [] } = useAttendanceCorrections(areaId)
  const { data: openSessions = [] } = useOpenAttendanceSessions(12)

  const approveRequestMut = useApproveAttendanceRequest()
  const rejectRequestMut = useRejectAttendanceRequest()
  const approveCorrectionMut = useApproveAttendanceCorrection()
  const rejectCorrectionMut = useRejectAttendanceCorrection()

  const [modalState, setModalState] = useState<ReviewModalState | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Aggregates for working hours summary
  const totalVolunteers = workingHours.length
  const totalHours = workingHours.reduce((s, r) => s + (r.approvedHours || 0), 0)
  const totalMinutes = workingHours.reduce((s, r) => s + (r.approvedMinutes || 0), 0)
  const avgHours = totalVolunteers > 0 ? totalHours / totalVolunteers : 0

  // Filtered summary
  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workingHours
    return workingHours.filter((row) => {
      const name = userNameMap.get(row.volunteerId) || ''
      return (
        row.volunteerId.toLowerCase().includes(q) ||
        name.toLowerCase().includes(q)
      )
    })
  }, [workingHours, search, userNameMap])

  // Filtered personal attendance
  const filteredPersonal = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return myAttendance
    return myAttendance.filter((row) => {
      return (
        row.id.toLowerCase().includes(q) ||
        row.assignmentId.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      )
    })
  }, [myAttendance, search])

  // Filtered attendance requests
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return attendanceRequests
    return attendanceRequests.filter((row) => {
      return (
        row.id.toLowerCase().includes(q) ||
        row.assignmentId.toLowerCase().includes(q) ||
        (row.note && row.note.toLowerCase().includes(q)) ||
        row.status.toLowerCase().includes(q)
      )
    })
  }, [attendanceRequests, search])

  // Filtered attendance corrections
  const filteredCorrections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return attendanceCorrections
    return attendanceCorrections.filter((row) => {
      return (
        row.id.toLowerCase().includes(q) ||
        row.attendanceId.toLowerCase().includes(q) ||
        row.reason.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      )
    })
  }, [attendanceCorrections, search])

  // Export CSV
  const handleExportSummaryCsv = () => {
    const rows = filteredSummary.map((r) => ({
      VolunteerId: r.volunteerId,
      [t('features.timesheets.volunteer')]: userNameMap.get(r.volunteerId) || r.volunteerId,
      [t('features.timesheets.minutes')]: r.approvedMinutes,
      [t('features.timesheets.approvedHours')]: Number(r.approvedHours.toFixed(2)),
    }))
    exportCsv(`working-hours-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const handleExportPersonalCsv = () => {
    const rows = filteredPersonal.map((r) => ({
      Id: r.id,
      AssignmentId: r.assignmentId,
      [t('features.timesheets.checkIn')]: viDateTime(r.checkInAt),
      [t('features.timesheets.checkOut')]: r.checkOutAt ? viDateTime(r.checkOutAt) : '',
      [t('features.timesheets.minutes')]: r.approvedMinutes,
      [t('common.status')]: r.status,
    }))
    exportCsv(`personal-attendance-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const handleConfirmReview = async () => {
    if (!modalState) return
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      if (modalState.type === 'request') {
        if (modalState.action === 'approve') {
          await approveRequestMut.mutateAsync({
            id: modalState.id,
            version: modalState.version,
            reviewNote: reviewNote.trim() || undefined,
          })
        } else {
          await rejectRequestMut.mutateAsync({
            id: modalState.id,
            version: modalState.version,
            reviewNote: reviewNote.trim() || undefined,
          })
        }
      } else {
        if (modalState.action === 'approve') {
          await approveCorrectionMut.mutateAsync({
            id: modalState.id,
            version: modalState.version,
            reviewNote: reviewNote.trim() || undefined,
          })
        } else {
          await rejectCorrectionMut.mutateAsync({
            id: modalState.id,
            version: modalState.version,
            reviewNote: reviewNote.trim() || undefined,
          })
        }
      }
      setModalState(null)
      setReviewNote('')
    } catch (err) {
      setErrorMsg(errorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const summaryColumns: Column<WorkingHourSummary>[] = [
    {
      key: 'volunteerId',
      header: t('features.timesheets.volunteer'),
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-medium text-stone-900">
            {userNameMap.get(row.volunteerId) || row.volunteerId}
          </p>
          <p className="text-xs text-stone-500 font-mono">{row.volunteerId}</p>
        </div>
      ),
    },
    {
      key: 'approvedMinutes',
      header: t('features.timesheets.minutes'),
      render: (row) => (
        <span className="font-medium text-stone-800">
          {row.approvedMinutes.toLocaleString('vi-VN')} phút
        </span>
      ),
    },
    {
      key: 'approvedHours',
      header: t('features.timesheets.approvedHours'),
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          {row.approvedHours.toFixed(2)} giờ
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: () => <StatusTag status="CLOSED" />,
    },
  ]

  const personalColumns: Column<AttendanceDto>[] = [
    {
      key: 'id',
      header: 'Mã phiên',
      render: (row) => (
        <span className="font-mono text-xs text-stone-600">{row.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'checkInAt',
      header: t('features.timesheets.checkIn'),
      render: (row) => <span className="text-xs text-stone-800">{viDateTime(row.checkInAt)}</span>,
    },
    {
      key: 'checkOutAt',
      header: t('features.timesheets.checkOut'),
      render: (row) => (
        <span className="text-xs text-stone-600">
          {row.checkOutAt ? viDateTime(row.checkOutAt) : '—'}
        </span>
      ),
    },
    {
      key: 'approvedMinutes',
      header: t('features.timesheets.minutes'),
      render: (row) => (
        <span className="font-semibold text-emerald-700">{row.approvedMinutes} phút</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row) => <StatusTag status={row.status} />,
    },
  ]

  const requestColumns: Column<AttendanceRequestDto>[] = [
    {
      key: 'assignmentId',
      header: t('features.attendance.assignment'),
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-mono text-xs font-semibold text-stone-900">
            {row.assignmentId.slice(0, 8)}...
          </p>
          <p className="text-xs text-stone-500">{row.type}</p>
        </div>
      ),
    },
    {
      key: 'requestedAt',
      header: t('features.attendance.requestedAt'),
      render: (row) => <span className="text-xs text-stone-800">{viDateTime(row.requestedAt)}</span>,
    },
    {
      key: 'note',
      header: 'Ghi chú',
      render: (row) => <span className="text-xs text-stone-600">{row.note || '—'}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row) => <StatusTag status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const isPending =
          row.status === 'Pending' || row.status === 'PENDING'
        if (!isPending) {
          return row.reviewNote ? (
            <span className="text-xs text-stone-500 italic">{row.reviewNote}</span>
          ) : (
            <span className="text-xs text-stone-400">—</span>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-1"
              onClick={() => {
                setErrorMsg(null)
                setReviewNote('')
                setModalState({
                  type: 'request',
                  action: 'approve',
                  id: row.id,
                  version: row.version,
                })
              }}
            >
              <Check className="size-3.5" />
              {t('features.attendance.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-rose-600 text-rose-700 hover:bg-rose-50 gap-1"
              onClick={() => {
                setErrorMsg(null)
                setReviewNote('')
                setModalState({
                  type: 'request',
                  action: 'reject',
                  id: row.id,
                  version: row.version,
                })
              }}
            >
              <X className="size-3.5" />
              {t('features.attendance.reject')}
            </Button>
          </div>
        )
      },
    },
  ]

  const correctionColumns: Column<AttendanceCorrectionDto>[] = [
    {
      key: 'attendanceId',
      header: 'Phiên chấm công',
      render: (row) => (
        <span className="font-mono text-xs text-stone-600">{row.attendanceId.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'originalTime',
      header: t('features.attendance.originalTime'),
      render: (row) => (
        <div className="text-xs text-stone-600">
          <p>{viDateTime(row.originalCheckInAt)}</p>
          <p>→ {row.originalCheckOutAt ? viDateTime(row.originalCheckOutAt) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'requestedTime',
      header: t('features.attendance.requestedTime'),
      render: (row) => (
        <div className="text-xs text-stone-800 font-medium">
          <p>{viDateTime(row.requestedCheckInAt)}</p>
          <p>→ {viDateTime(row.requestedCheckOutAt)}</p>
        </div>
      ),
    },
    {
      key: 'reason',
      header: t('features.attendance.reason'),
      render: (row) => <span className="text-xs text-stone-700">{row.reason}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row) => <StatusTag status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (row) => {
        const isPending =
          row.status === 'Pending' || row.status === 'PENDING'
        if (!isPending) {
          return row.reviewNote ? (
            <span className="text-xs text-stone-500 italic">{row.reviewNote}</span>
          ) : (
            <span className="text-xs text-stone-400">—</span>
          )
        }
        return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50 gap-1"
              onClick={() => {
                setErrorMsg(null)
                setReviewNote('')
                setModalState({
                  type: 'correction',
                  action: 'approve',
                  id: row.id,
                  version: row.version,
                })
              }}
            >
              <Check className="size-3.5" />
              {t('features.attendance.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-rose-600 text-rose-700 hover:bg-rose-50 gap-1"
              onClick={() => {
                setErrorMsg(null)
                setReviewNote('')
                setModalState({
                  type: 'correction',
                  action: 'reject',
                  id: row.id,
                  version: row.version,
                })
              }}
            >
              <X className="size-3.5" />
              {t('features.attendance.reject')}
            </Button>
          </div>
        )
      },
    },
  ]

  const pendingApprovalsCount =
    attendanceRequests.filter((r) => r.status === 'Pending' || r.status === 'PENDING').length +
    attendanceCorrections.filter((r) => r.status === 'Pending' || r.status === 'PENDING').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t('features.timesheets.title')}
          sub={t('features.timesheets.sub')}
        />
        {activeTab !== 'personal' && areas.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700">Khu vực:</span>
            <select
              value={areaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t('features.timesheets.statTotalVolunteers')}
          value={totalVolunteers}
          tone="ok"
          icon={Users}
        />
        <StatCard
          label={t('features.timesheets.statTotalHours')}
          value={Math.round(totalHours)}
          unit="giờ"
          tone="ok"
          icon={Clock}
        />
        <StatCard
          label={t('features.timesheets.statTotalMinutes')}
          value={totalMinutes}
          unit="phút"
          tone="ok"
          icon={Timer}
        />
        <StatCard
          label={t('features.timesheets.statAvgHours')}
          value={Math.round(avgHours * 10) / 10}
          unit="h/người"
          tone="ok"
          icon={Award}
        />
      </div>

      {/* View Toggle Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          {t('features.timesheets.tabSummary')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'personal'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          {t('features.timesheets.tabPersonal')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'approvals'
              ? 'border-emerald-600 text-emerald-700 font-semibold'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>{t('features.attendance.tabApprovals')}</span>
          {pendingApprovalsCount > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5">
              {pendingApprovalsCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters & Export */}
      {activeTab !== 'approvals' && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={activeTab === 'summary' ? handleExportSummaryCsv : handleExportPersonalCsv}
            className="flex items-center gap-2 self-end sm:self-auto"
          >
            <Download className="h-4 w-4" />
            {t('features.timesheets.exportCsv')}
          </Button>
        </div>
      )}

      {/* Tab Contents */}
      {activeTab === 'summary' && (
        <Card className="p-0 overflow-hidden shadow-sm">
          <DataTable
            columns={summaryColumns}
            rows={filteredSummary}
            emptyText={t('features.timesheets.empty')}
          />
        </Card>
      )}

      {activeTab === 'personal' && (
        <Card className="p-0 overflow-hidden shadow-sm">
          <DataTable
            columns={personalColumns}
            rows={filteredPersonal}
            emptyText={t('features.timesheets.empty')}
          />
        </Card>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-6">
          {openSessions.length > 0 ? (
            <div data-testid="open-sessions-alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 text-amber-800">
              <AlertTriangle className="size-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <span className="font-semibold">
                  {t('features.attendance.openSessionsAlert', { count: openSessions.length })}
                </span>
              </div>
            </div>
          ) : (
            <div data-testid="open-sessions-empty" className="rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3.5 flex items-center gap-2.5 text-emerald-800 text-sm">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span>Không có phiên chấm công nào mở quá 12 giờ (0 ca mở)</span>
            </div>
          )}

          {/* Yêu cầu chấm công */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-900">
                {t('features.attendance.requestsTitle')}
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                {attendanceRequests.length} yêu cầu
              </span>
            </div>
            <Card className="p-0 overflow-hidden shadow-sm">
              <DataTable
                columns={requestColumns}
                rows={filteredRequests}
                emptyText={t('features.attendance.emptyRequests')}
              />
            </Card>
          </div>

          {/* Yêu cầu sửa công */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-900">
                {t('features.attendance.correctionsTitle')}
              </h3>
              <span className="text-xs text-stone-500 font-mono">
                {attendanceCorrections.length} yêu cầu
              </span>
            </div>
            <Card className="p-0 overflow-hidden shadow-sm">
              <DataTable
                columns={correctionColumns}
                rows={filteredCorrections}
                emptyText={t('features.attendance.emptyCorrections')}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Dialog Duyệt / Từ chối */}
      {modalState && (
        <Dialog
          open={Boolean(modalState)}
          onClose={() => {
            if (!isSubmitting) setModalState(null)
          }}
          title={
            modalState.action === 'approve'
              ? t('features.attendance.confirmApprove')
              : t('features.attendance.confirmReject')
          }
          footer={
            <>
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => setModalState(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                data-testid="review-confirm-btn"
                variant={modalState.action === 'reject' ? 'destructive' : 'default'}
                disabled={isSubmitting}
                onClick={handleConfirmReview}
              >
                {isSubmitting
                  ? t('common.loading')
                  : modalState.action === 'approve'
                    ? t('features.attendance.approve')
                    : t('features.attendance.reject')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              {modalState.action === 'approve'
                ? 'Bạn có chắc chắn muốn phê duyệt yêu cầu này?'
                : 'Bạn có chắc chắn muốn từ chối yêu cầu này?'}
            </p>
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t('features.attendance.reviewNote')}
              </label>
              <Input
                placeholder="Ghi chú duyệt (không bắt buộc)..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
            {errorMsg && (
              <div className="rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}
