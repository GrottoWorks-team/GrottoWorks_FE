import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Search, Users, Clock, Timer, Award } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useScopedAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import { viDateTime } from '@/lib/format'
import { useWorkingHours, useMyAttendance } from '../api'
import type { AttendanceDto, WorkingHourSummary } from '@/types'

export default function TimesheetPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'summary' | 'personal'>(
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t('features.timesheets.title')}
          sub={t('features.timesheets.sub')}
        />
        {activeTab === 'summary' && areas.length > 0 && (
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
      </div>

      {/* Filters & Export */}
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

      {/* Data Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        {activeTab === 'summary' ? (
          <DataTable
            columns={summaryColumns}
            rows={filteredSummary}
            emptyText={t('features.timesheets.empty')}
          />
        ) : (
          <DataTable
            columns={personalColumns}
            rows={filteredPersonal}
            emptyText={t('features.timesheets.empty')}
          />
        )}
      </Card>
    </div>
  )
}
