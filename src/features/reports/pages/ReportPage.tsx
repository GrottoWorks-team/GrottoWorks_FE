// Báo cáo (/community/reports) — BE Reporting `/api/v1/reports/{type}`.
// ReportDataDto trả columns + rows + totals + notes nên trang render động,
// không còn gộp 6 endpoint legacy.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/inline-alert'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useSeasons } from '@/features/season/api'
import { exportCsv } from '@/lib/csv'
import { ApiError } from '@/lib/api'
import i18n from '@/lib/i18n'
import { viDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  downloadReportExport,
  useCreateReportExport,
  useReportData,
  useReportExportJob,
  type ReportType,
} from '../api'
import { useSeasonRecognition } from '@/features/recognition/api'

const TYPES: ReportType[] = ['TASKS', 'MATERIALS', 'PURCHASES', 'CONTRIBUTIONS', 'ATTENDANCE', 'READINESS']

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') return value.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
  return String(value)
}

export default function ReportPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: seasons = [] } = useSeasons()
  const { data: areas = [] } = useScopedAreas()

  const [seasonId, setSeasonId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [type, setType] = useState<ReportType>('TASKS')

  const selectedSeason = seasonId || seasons[0]?.id || ''
  const { data, isPending, isError, refetch } = useReportData({
    type,
    seasonId: selectedSeason,
    workAreaId: areaId || undefined,
  })

  const rows = useMemo(() => data?.rows ?? [], [data])

  const [jobId, setJobId] = useState<string | undefined>(() => {
    try {
      return sessionStorage.getItem('grotto-report-job') ?? undefined
    } catch {
      return undefined
    }
  })
  const [jobError, setJobError] = useState<string | null>(null)
  const createExport = useCreateReportExport()
  const { data: job, refetch: refetchJob } = useReportExportJob(jobId)
  const { data: recognition } = useSeasonRecognition(selectedSeason)

  // F-27: job chạy ở BE — giữ jobId qua điều hướng để rời trang vẫn xem lại được.
  useEffect(() => {
    try {
      if (jobId) sessionStorage.setItem('grotto-report-job', jobId)
      else sessionStorage.removeItem('grotto-report-job')
    } catch {
      // trình duyệt chặn storage → chỉ mất khả năng theo dõi sau khi rời trang
    }
  }, [jobId])

  // BE giới hạn 3 request/phút cho system-jobs → hỏi lại mỗi 25 giây khi còn chạy.
  useEffect(() => {
    if (!jobId) return
    const timer = setInterval(() => void refetchJob(), 25_000)
    return () => clearInterval(timer)
  }, [jobId, refetchJob])

  const onExport = () => {
    if (!data) return
    exportCsv(
      `grottoworks-bao-cao-${type.toLowerCase()}.csv`,
      rows.map((row) => {
        const line: Record<string, string> = {}
        for (const column of data.columns) line[column.label] = formatValue(row[column.key])
        return line
      }),
    )
    toast(t('features.reports.exported', { label: t(`features.reports.type.${type}`) }))
  }

  // Xuất bất đồng bộ của BE: tạo job → poll trạng thái → tải tệp khi xong.
  useEffect(() => {
    if (!jobId || !job) return
    if (job.status === 'COMPLETED') {
      const label = t(`features.reports.type.${job.reportType}`)
      const name =
        job.fileName ?? `grottoworks-${job.reportType.toLowerCase()}.${job.format.toLowerCase()}`
      downloadReportExport(job.id, name)
        .then(() => toast(t('features.reports.exportedFile', { label })))
        .catch(() => toast(t('common.error'), 'alert'))
        .finally(() => setJobId(undefined))
    } else if (job.status === 'FAILED') {
      setJobError(job.errorMessage ?? t('common.error'))
      setJobId(undefined)
    }
  }, [job, jobId, t, toast])

  const onServerExport = async () => {
    if (!selectedSeason) return
    setJobError(null)
    try {
      const created = await createExport.mutateAsync({
        reportType: type,
        format: 'XLSX',
        seasonId: selectedSeason,
        workAreaId: areaId || undefined,
      })
      setJobId(created.id)
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <div>
      <PageHeader
        title={t('features.reports.title')}
        sub={`${t('features.reports.sub')}.`}
        actions={
          <>
            <button
              type="button"
              onClick={onExport}
              disabled={!rows.length}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
            >
              <Download className="size-[13px] text-[#3F7F5B]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#2C463A]">{t('features.reports.export')}</span>
            </button>
            <button
              type="button"
              onClick={() => void onServerExport()}
              disabled={!selectedSeason || !!jobId}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-3 text-[12px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
            >
              <FileSpreadsheet className="size-[13px] text-[#F2D07A]" aria-hidden />
              {jobId ? t('features.reports.exportRunning') : t('features.reports.exportServer')}
            </button>
            {jobId && (
              <button
                type="button"
                onClick={() => void refetchJob()}
                className="flex h-[38px] items-center rounded-[11px] border border-[#DBE5D6] bg-white px-3 text-[12px] font-semibold text-[#2C463A] transition-colors hover:bg-[#F4F8F1]"
              >
                {t('features.parish.jobRefresh')}
              </button>
            )}
          </>
        }
      />

      {jobId ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#C9DCC9] bg-[#F1F6EE] p-4">
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold text-[#0B2E1F]">
              {job?.status === 'RUNNING'
                ? t('features.reports.jobRunning')
                : t('features.reports.jobQueued')}
            </p>
            <p className="text-[10.5px] text-[#7C9287]">{t('features.reports.jobCanLeave')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetchJob()}>
              {t('features.parish.jobRefresh')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setJobId(undefined)}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      ) : null}

      {jobError ? (
        <InlineAlert tone="alert" title={t('features.reports.jobFailedTitle')} className="mb-4">
          <p>{jobError}</p>
        </InlineAlert>
      ) : null}

      <div className="mb-[16px] flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-[12px] bg-[#EAF0E6] p-1">
            {TYPES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                aria-pressed={item === type}
                className={cn(
                  'flex h-[30px] items-center rounded-[9px] px-[11px] text-[11px] transition-colors',
                  item === type
                    ? 'bg-white font-bold text-[#0A5C36] shadow-[0px_1px_3px_#06281B1A]'
                    : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
                )}
              >
                {t(`features.reports.type.${item}`)}
              </button>
            ))}
          </div>
          <select
            aria-label={t('features.donations.season')}
            className="h-8 rounded-[9px] border border-[#DBE5D6] bg-[#F7F9F5] px-2.5 text-[10.5px] text-[#2C463A]"
            value={selectedSeason}
            onChange={(e) => setSeasonId(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label={t('features.allocations.area')}
            className="h-8 rounded-[9px] border border-[#DBE5D6] bg-[#F7F9F5] px-2.5 text-[10.5px] text-[#2C463A]"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
          >
            <option value="">{t('features.reports.allAreas')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {data && (
          <span className="font-mono text-[9px] text-[#96AAA0]">
            {t('features.reports.scope')}: {data.scope} · {t('features.reports.generatedAt')}: {viDateTime(data.generatedAt)}
          </span>
        )}
      </div>

      {isPending ? (
        <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
      ) : isError ? (
        <ErrorState message={t('features.reports.error')} onRetry={() => void refetch()} />
      ) : !data ? (
        <EmptyState text={t('features.reports.empty')} hint={t('features.reports.emptyHint')} />
      ) : (
        <>
          {data.notes.length > 0 && (
            <ul className="mb-3 flex w-full flex-col gap-1 rounded-[12px] border border-[#E9EFE6] bg-[#F7F9F5] p-[9px_12px]">
              {data.notes.map((note, index) => (
                <li key={index} className="text-[10px] leading-[15px] text-[#7C9287]">
                  {note}
                </li>
              ))}
            </ul>
          )}

          <div className="w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex w-full items-center justify-between gap-3 px-4 py-[13px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t(`features.reports.type.${type}`)}
              </span>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.reports.rowCount', { defaultValue: '{{count}} dòng', count: rows.length })}
              </span>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" />
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F7F9F5]">
                  <tr>
                    {data.columns.map((column) => (
                      <th
                        key={column.key}
                        className="whitespace-nowrap px-4 py-[10px] text-left font-mono text-[9px] font-semibold uppercase tracking-[0.9px] text-[#8C9F94]"
                      >
                        {column.label}
                        {column.unit ? ` (${column.unit})` : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={data.columns.length} className="px-4 py-8 text-center text-[11px] text-[#A3B4A9]">
                        {t('features.reports.noRows')}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={index} className="border-t border-[#F0F4EC]">
                        {data.columns.map((column) => (
                          <td key={column.key} className="whitespace-nowrap px-4 py-[10px] text-[10.5px] text-[#233A2E]">
                            {formatValue(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
                {Object.keys(data.totals ?? {}).length > 0 && (
                  <tfoot className="border-t border-[#ECF1E9] bg-[#FBFAF6]">
                    <tr>
                      {data.columns.map((column, index) => (
                        <td key={column.key} className="px-4 py-[10px] font-mono text-[10.5px] font-bold text-[#0B2E1F]">
                          {index === 0
                            ? t('features.reports.totals')
                            : formatValue((data.totals as Record<string, unknown>)[column.key])}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {recognition && recognition.ranking.length > 0 && (
        <div className="mt-4 w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-[13px]">
            <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.reports.recognitionRanking')}
            </span>
            <span className="font-mono text-[9.5px] text-[#96AAA0]">
              {t('features.reports.recognitionTotals', {
                points: recognition.totalPoints,
                contributors: recognition.contributors,
              })}
            </span>
          </div>
          <ol className="flex w-full flex-col">
            {recognition.ranking.slice(0, 10).map((row) => (
              <li
                key={row.userId}
                className="flex w-full items-center justify-between gap-3 border-t border-[#F0F4EC] px-4 py-[10px]"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-6 shrink-0 font-mono text-[10px] font-bold text-[#C98A12]">#{row.rank}</span>
                  <span className="truncate text-[11px] font-semibold text-[#0B2E1F]">
                    {row.displayName ?? row.userId.slice(0, 8)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[9.5px] text-[#8AA298]">
                  {t('features.reports.recognitionRow', {
                    points: row.totalPoints,
                    contributions: row.contributions,
                  })}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
