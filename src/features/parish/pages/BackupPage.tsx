// Trang xuất & sao lưu (route /parish/backup) — NotificationAudit system jobs:
//   POST /api/v1/backups               → job sao lưu (poll GET /backups/{jobId})
//   GET  /api/v1/backups/{jobId}       → trạng thái + fileId khi xong
//   POST /api/v1/system-data-exports   → job xuất dữ liệu (không có endpoint poll)
// Tệp kết quả tải qua GET /api/v1/files/{fileId}/download-url.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Database, Download, FileArchive, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { openFile } from '@/lib/files'
import { viDateTime } from '@/lib/format'
import { useBackupJob, useStartBackup, useStartSystemExport } from '@/features/systemJobs/api'

export default function BackupPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const startBackup = useStartBackup()
  const startExport = useStartSystemExport()

  const [backupJobId, setBackupJobId] = useState<string | undefined>()
  const [exportInfo, setExportInfo] = useState<{ jobId: string; status: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const { data: backupJob, refetch: refetchJob } = useBackupJob(backupJobId)

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  // Job sao lưu xong → báo kết quả (người dùng bấm tải tệp khi cần).
  useEffect(() => {
    if (!backupJob) return
    if (backupJob.status === 'SUCCEEDED') toast(t('features.parish.backupDone'))
    else if (backupJob.status === 'FAILED')
      toast(backupJob.errorCode ?? t('features.parish.backupFailed'), 'alert')
  }, [backupJob, t, toast])

  // BE chỉ cho 3 request/phút cho system-jobs → sau khi tạo job chỉ hỏi lại MỘT lần.
  useEffect(() => {
    if (!backupJobId) return
    const timer = setTimeout(() => void refetchJob(), 10_000)
    return () => clearTimeout(timer)
  }, [backupJobId, refetchJob])

  const onBackup = async () => {
    try {
      const job = await startBackup.mutateAsync({})
      setBackupJobId(job.jobId)
    } catch (error) {
      fail(error)
    }
  }

  const onExport = async () => {
    try {
      const job = await startExport.mutateAsync({})
      setExportInfo({ jobId: job.jobId, status: job.status })
      toast(t('features.parish.exportQueued'))
    } catch (error) {
      fail(error)
    }
  }

  const onDownload = async () => {
    if (!backupJob?.fileId) return
    try {
      await openFile(backupJob.fileId)
    } catch (error) {
      fail(error)
    }
  }

  const doReset = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  const busy = startBackup.isPending || backupJob?.status === 'QUEUED' || backupJob?.status === 'RUNNING'

  return (
    <div>
      <PageHeader title={t('features.parish.backupTitle')} sub={t('features.parish.backupSub')} />

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="lbl-mono">{t('features.parish.backupExport')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('features.parish.backupExportSub')}</p>
            {backupJob && (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('features.parish.jobStatus')}</span>
                  <StatusTag status={backupJob.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('features.parish.jobCreatedAt')}: {viDateTime(backupJob.createdAt)}
                </p>
                {backupJob.errorCode && (
                  <p className="text-xs text-destructive">{backupJob.errorCode}</p>
                )}
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={onBackup} disabled={busy}>
              <Database className="size-4" />
              {busy ? t('features.parish.backupRunning') : t('features.parish.backupDownload')}
            </Button>
            <Button
              variant="outline"
              onClick={() => void refetchJob()}
              disabled={!backupJobId || busy}
            >
              <RotateCcw className="size-4" />
              {t('features.parish.jobRefresh')}
            </Button>
            <Button
              variant="outline"
              onClick={onDownload}
              disabled={!backupJob?.fileId || backupJob.status !== 'SUCCEEDED'}
            >
              <Download className="size-4" />
              {t('features.parish.backupFile')}
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="lbl-mono">{t('features.parish.systemExport')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('features.parish.systemExportSub')}</p>
            {exportInfo && (
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('features.parish.jobStatus')}</span>
                  <StatusTag status={exportInfo.status} />
                </div>
                <p className="font-mono text-[11px] text-muted-foreground">{exportInfo.jobId}</p>
              </div>
            )}
          </div>
          <Button className="mt-5 self-start" variant="outline" onClick={onExport} disabled={startExport.isPending}>
            <FileArchive className="size-4" />
            {t('features.parish.systemExportBtn')}
          </Button>
        </Card>

        <Card className="flex flex-col justify-between p-5 md:col-span-2">
          <div>
            <p className="lbl-mono">{t('features.parish.backupReset')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('features.parish.backupResetSub')}</p>
          </div>
          <Button variant="destructive" className="mt-5 self-start" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="size-4" />
            {t('features.parish.backupResetBtn')}
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title={t('features.parish.resetTitle')}
        description={t('features.parish.resetConfirm')}
        confirmLabel={t('features.parish.backupResetBtn')}
        tone="destructive"
        onConfirm={doReset}
        onClose={() => setConfirmReset(false)}
      />
    </div>
  )
}
