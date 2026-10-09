// Trang xuất & sao lưu (route /parish/backup):
//   • "Tải backup JSON" — POST /api/export/backup → blob download
//     (endpoint có thật: handlers.ts trả toàn bộ db + header attachment).
//   • "Đặt lại dữ liệu demo" — resetDb() (xoá 'grotto-db-v1') + reload;
//     ConfirmDialog tone destructive trước khi thực hiện.
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { resetDb } from '@/lib/db'
import { useBackup } from '../api'
import { useState } from 'react'

export default function BackupPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const backup = useBackup()
  const [confirmReset, setConfirmReset] = useState(false)

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
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const doReset = () => {
    resetDb()
    // Token cũ có thể trỏ user đã bị xoá reset → đăng nhập lại từ đầu.
    localStorage.removeItem('grotto-token')
    window.location.href = '/login'
  }

  return (
    <div>
      <PageHeader title={t('features.parish.backupTitle')} sub={t('features.parish.backupSub')} />

      <div className="grid gap-5 md:grid-cols-2">
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
