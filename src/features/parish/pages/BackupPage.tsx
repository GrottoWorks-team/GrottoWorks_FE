// Trang xuất & sao lưu (route /parish/backup):
//   • "Tải backup JSON" — POST /api/export/backup → blob download.
//   • "Đặt lại dữ liệu demo" — xoá localStorage + reload;
//     ConfirmDialog tone destructive trước khi thực hiện.
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw, ShieldCheck, Loader2, DownloadCloud } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { errorMessage } from '@/lib/errorMessage'
import { useBackup, useStartBackup, useBackupStatus } from '../api'

export default function BackupPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const backup = useBackup()
  const startBackupMutation = useStartBackup()
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const { data: backupJob } = useBackupStatus(activeJobId ?? undefined)
  const [confirmReset, setConfirmReset] = useState(false)

  const handleStartBackup = async () => {
    try {
      const res = await startBackupMutation.mutateAsync({})
      setActiveJobId(res.jobId)
      toast('Đã khởi tạo yêu cầu sao lưu hệ thống')
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  // Backup: api() đã parse JSON → stringify lại với indent cho dễ đọc;
  // tên file từ header mock: grottoworks-backup.json.
  const download = async () => {
    try {
      const data = await backup.mutateAsync()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'grottoworks-backup.json'
      a.click()
      URL.revokeObjectURL(url)
      toast(t('features.parish.backupDone'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  const doReset = () => {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div>
      <PageHeader title={t('features.parish.backupTitle')} sub={t('features.parish.backupSub')} />

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="flex flex-col justify-between p-5" data-testid="server-backup-card">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand-pine" />
              <p className="lbl-mono">Sao lưu cơ sở dữ liệu máy chủ</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Khởi tạo sao lưu toàn bộ cơ sở dữ liệu PostgreSQL đã mã hoá trên máy chủ.
            </p>

            {backupJob && (
              <div className="mt-3 rounded border border-border bg-muted/40 p-2.5 text-xs space-y-1.5" data-testid="backup-job-status">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <Badge className="font-mono">{backupJob.status}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Mã việc: </span>
                  <span className="font-mono">{backupJob.jobId}</span>
                </div>
                {backupJob.fileId && (
                  <div className="pt-1">
                    <a
                      href={`/api/v1/files/${backupJob.fileId}/download-url`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-brand-pine hover:underline"
                      data-testid="download-backup-file-link"
                    >
                      <DownloadCloud className="size-3.5" />
                      Tải tệp sao lưu máy chủ
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            className="mt-5 self-start"
            onClick={handleStartBackup}
            disabled={startBackupMutation.isPending}
            data-testid="start-server-backup-btn"
          >
            {startBackupMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {startBackupMutation.isPending ? 'Đang khởi tạo...' : 'Tạo bản sao lưu máy chủ'}
          </Button>
        </Card>

        <Card className="flex flex-col justify-between p-5">
          <div>
            <p className="lbl-mono">{t('features.parish.backupExport')}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t('features.parish.backupExportSub')}</p>
          </div>
          <Button className="mt-5 self-start" onClick={() => void download()} disabled={backup.isPending}>
            <Download className="size-4" />
            {backup.isPending ? t('common.loading') : t('features.parish.backupDownload')}
          </Button>
        </Card>

        <Card className="flex flex-col justify-between p-5">
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
