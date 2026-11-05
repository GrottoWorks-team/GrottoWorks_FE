// Báo cáo (/community/reports) — BE Reporting `/api/v1/reports/{type}`.
// ReportDataDto trả columns + rows + totals + notes nên trang render động,
// không còn gộp 6 endpoint legacy.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useSeasons } from '@/features/season/api'
import { exportCsv } from '@/lib/csv'
import { ApiError } from '@/lib/api'
import i18n from '@/lib/i18n'
import { viDateTime } from '@/lib/format'
import {
  downloadReportExport,
  useCreateReportExport,
  useReportData,
  useReportExportJob,
  type ReportType,
} from '../api'
import { useSeasonRecognition } from '@/features/recognition/api'

const TYPES: ReportType[] = ['TASKS', 'MATERIALS', 'PURCHASES', 'CONTRIBUTIONS', 'ATTENDANCE', 'READINESS']

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

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
  const { data, isPending, isError } = useReportData({
    type,
    seasonId: selectedSeason,
    workAreaId: areaId || undefined,
  })

  const rows = useMemo(() => data?.rows ?? [], [data])

  const [jobId, setJobId] = useState<string | undefined>()
  const createExport = useCreateReportExport()
  const { data: job, refetch: refetchJob } = useReportExportJob(jobId)
  const { data: recognition } = useSeasonRecognition(selectedSeason)

  // BE giới hạn 3 request/phút cho system-jobs → hỏi lại trạng thái một lần sau khi tạo.
  useEffect(() => {
    if (!jobId) return
    const timer = setTimeout(() => void refetchJob(), 10_000)
    return () => clearTimeout(timer)
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
      toast(job.errorMessage ?? t('common.error'), 'alert')
      setJobId(undefined)
    }
  }, [job, jobId, t, toast])

  const onServerExport = async () => {
    if (!selectedSeason) return
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
        sub={t('features.reports.sub')}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onExport} disabled={!rows.length}>
              <Download className="size-4" />
              {t('features.reports.export')}
            </Button>
            <Button onClick={onServerExport} disabled={!selectedSeason || !!jobId}>
              <FileSpreadsheet className="size-4" />
              {jobId ? t('features.reports.exportRunning') : t('features.reports.exportServer')}
            </Button>
            {jobId && (
              <Button variant="outline" onClick={() => void refetchJob()}>
                {t('features.parish.jobRefresh')}
              </Button>
            )}
          </div>
        }
      />

      <Card className="mb-6 grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="lbl-mono text-xs" htmlFor="report-season">
            {t('features.donations.season')}
          </label>
          <select
            id="report-season"
            className={SELECT_CLS}
            value={selectedSeason}
            onChange={(e) => setSeasonId(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="lbl-mono text-xs" htmlFor="report-area">
            {t('features.allocations.area')}
          </label>
          <select id="report-area" className={SELECT_CLS} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">{t('features.reports.allAreas')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={item === type ? 'default' : 'outline'}
            onClick={() => setType(item)}
          >
            {t(`features.reports.type.${item}`)}
          </Button>
        ))}
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : isError ? (
        <EmptyState text={t('features.reports.error')} />
      ) : !data ? (
        <EmptyState text={t('features.reports.empty')} />
      ) : (
        <>
          <Card className="mb-4 p-4 text-xs text-muted-foreground">
            <p>
              {t('features.reports.scope')}: <span className="font-semibold">{data.scope}</span> ·{' '}
              {t('features.reports.generatedAt')}: {viDateTime(data.generatedAt)}
            </p>
            {data.notes.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {data.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            )}
          </Card>

          <div className="overflow-x-auto rounded-card border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {data.columns.map((column) => (
                    <th key={column.key} className="px-3 py-2 text-left font-semibold text-foreground">
                      {column.label}
                      {column.unit ? ` (${column.unit})` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={data.columns.length} className="px-3 py-6 text-center text-muted-foreground">
                      {t('features.reports.noRows')}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr key={index} className="border-t border-border/60">
                      {data.columns.map((column) => (
                        <td key={column.key} className="px-3 py-2 tabular">
                          {formatValue(row[column.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
              {Object.keys(data.totals ?? {}).length > 0 && (
                <tfoot className="border-t border-border bg-muted/20 font-semibold">
                  <tr>
                    {data.columns.map((column, index) => (
                      <td key={column.key} className="px-3 py-2 tabular">
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
        </>
      )}

      {recognition && recognition.ranking.length > 0 && (
        <Card className="mt-6 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="lbl-mono">{t('features.reports.recognitionRanking')}</p>
            <span className="tabular text-xs text-muted-foreground">
              {t('features.reports.recognitionTotals', {
                points: recognition.totalPoints,
                contributors: recognition.contributors,
              })}
            </span>
          </div>
          <ol className="space-y-1.5">
            {recognition.ranking.slice(0, 10).map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="tabular w-6 shrink-0 text-xs font-bold text-brand-gold">
                    #{row.rank}
                  </span>
                  <span className="truncate font-semibold">
                    {row.displayName ?? row.userId.slice(0, 8)}
                  </span>
                </span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {t('features.reports.recognitionRow', {
                    points: row.totalPoints,
                    contributions: row.contributions,
                  })}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  )
}