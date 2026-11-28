// Trang xuất & sao lưu (route /parish/backup) — NotificationAudit system jobs:
//   POST /api/v1/backups               → job sao lưu (poll GET /backups/{jobId})
//   GET  /api/v1/backups/{jobId}       → trạng thái + fileId khi xong
//   POST /api/v1/system-data-exports   → job xuất dữ liệu (không có endpoint poll)
// Tệp kết quả tải qua GET /api/v1/files/{fileId}/download-url.
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Xuất & Sao Lưu — Dữ Liệu".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  Database,
  DatabaseBackup,
  Download,
  History,
  PackageOpen,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusTag } from '@/components/shared/StatusTag'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { openFile } from '@/lib/files'
import { viDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useBackupJob, useStartBackup, useStartSystemExport } from '@/features/systemJobs/api'

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const HEAD = 'font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#8C9F94]'
const ROW_BTN =
  'flex h-8 shrink-0 items-center gap-[6px] rounded-[9px] px-[11px] transition-colors disabled:opacity-55'

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
  const fileReady = Boolean(backupJob?.fileId) && backupJob?.status === 'SUCCEEDED'

  return (
    <div>
      <PageHeader
        title={t('features.parish.backupTitle')}
        sub={t('features.parish.backupSub')}
        actions={
          <>
            <Link
              to="/parish/activity"
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1]"
            >
              <History className="size-[14px] text-[#5C7468]" aria-hidden />
              <span className="text-[12px] font-semibold text-[#2C463A]">
                {t('features.parish.backupViewLog', { defaultValue: 'Xem nhật ký' })}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => void onBackup()}
              disabled={busy}
              className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344] disabled:opacity-55"
            >
              <DatabaseBackup className="size-[14px] text-[#F2D07A]" aria-hidden />
              <span className="text-[12px] font-bold text-white">
                {busy ? t('features.parish.backupRunning') : t('features.parish.backupDownload')}
              </span>
            </button>
          </>
        }
      />

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-[16px]">
          {/* Sao lưu dữ liệu */}
          <section className={CARD}>
            <div className="flex items-center justify-between px-[18px] py-[14px]">
              <p className={HEAD}>{t('features.parish.backupExport')}</p>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1">
                <span className="text-[10px] font-bold text-[#4F7A61]">
                  {t('features.parish.backupServerChip', { defaultValue: 'Server-side' })}
                </span>
              </span>
            </div>
            <div className={RULE} aria-hidden />

            <div className="flex items-center justify-between gap-4 border-b border-[#F0F4EC] px-[18px] py-[13px]">
              <div className="flex min-w-0 flex-1 items-center gap-[11px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[#DDE8D6] bg-[#EDF4EA]">
                  <Database className="size-[13px] text-[#3F7F5B]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[12.5px] font-bold text-[#0B2E1F]">
                    {t('features.parish.backupDownload')}
                  </span>
                  <span className="w-full text-[10.5px] leading-4 text-[#8AA298]">
                    {t('features.parish.backupRowNowSub', {
                      defaultValue: 'Tạo bản sao lưu cơ sở dữ liệu của các service trên máy chủ.',
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onBackup()}
                disabled={busy}
                className={cn(ROW_BTN, 'bg-[#0A5C36] hover:bg-[#0D7344]')}
              >
                <span className="text-[11px] font-bold text-white">
                  {t('features.parish.backupDownload')}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-[#F0F4EC] px-[18px] py-[13px]">
              <div className="flex min-w-0 flex-1 items-center gap-[11px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[#EDF1E9] bg-[#F7F9F5]">
                  <RotateCcw className="size-[13px] text-[#8AA298]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[12.5px] font-bold text-[#3B5348]">
                    {t('features.parish.jobRefresh')}
                  </span>
                  <span className="w-full text-[10.5px] leading-4 text-[#8AA298]">
                    {t('features.parish.jobRefreshSub', {
                      defaultValue: 'Tải lại trạng thái job và tệp sao lưu mới nhất.',
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refetchJob()}
                disabled={!backupJobId}
                className={cn(
                  ROW_BTN,
                  'border border-[#E7EEE3] bg-white text-[#6B8175] hover:bg-[#F4F8F1]',
                )}
              >
                <span className="text-[11px] font-bold">{t('features.parish.jobRefresh')}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 px-[18px] py-[13px]">
              <div className="flex min-w-0 flex-1 items-center gap-[11px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[#EDF1E9] bg-[#F7F9F5]">
                  <Download className="size-[13px] text-[#8AA298]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <span className="truncate text-[12.5px] font-bold text-[#3B5348]">
                    {t('features.parish.backupFile')}
                  </span>
                  <span className="w-full text-[10.5px] leading-4 text-[#8AA298]">
                    {t('features.parish.backupFileSub', {
                      defaultValue: 'Tệp kết quả được tải về ngay khi job hoàn tất.',
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onDownload()}
                disabled={!fileReady}
                className={cn(
                  ROW_BTN,
                  'border border-[#E7EEE3] bg-white text-[#6B8175] hover:bg-[#F4F8F1]',
                )}
              >
                <span className="text-[11px] font-bold">
                  {t('features.parish.backupFileDownload', { defaultValue: 'Tải tệp' })}
                </span>
              </button>
            </div>

            {backupJob && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#F0F4EC] px-[18px] py-[11px]">
                <span className="text-[10.5px] text-[#96AAA0]">
                  {t('features.parish.jobStatus')}
                </span>
                <StatusTag status={backupJob.status} />
                <span className="font-mono text-[10px] text-[#96AAA0]">
                  {viDateTime(backupJob.createdAt)}
                </span>
                {backupJob.errorCode && (
                  <span className="font-mono text-[10px] text-[#B42318]">{backupJob.errorCode}</span>
                )}
              </div>
            )}
          </section>

          {/* Xuất dữ liệu hệ thống */}
          <section className={CARD}>
            <div className="flex items-center justify-between px-[18px] py-[14px]">
              <p className={HEAD}>{t('features.parish.systemExport')}</p>
              <span className="flex w-fit items-center rounded-full bg-[#F7F4E7] px-[9px] py-1">
                <span className="text-[10px] font-bold text-[#8A6412]">
                  {t('features.parish.exportJobChip', { defaultValue: 'Job chạy nền' })}
                </span>
              </span>
            </div>
            <div className={RULE} aria-hidden />
            <div className="flex flex-col gap-4 px-[18px] py-[18px]">
              <div className="flex items-start gap-[13px]">
                <span className="grid size-[38px] shrink-0 place-items-center rounded-[12px] border border-[#E7EEE3] bg-[#F7F9F5]">
                  <PackageOpen className="size-[15px] text-[#5C7468]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <span className="truncate text-[14px] font-bold text-[#0B2E1F]">
                    {t('features.parish.exportCardTitle', {
                      defaultValue: 'Đóng gói dữ liệu để bàn giao',
                    })}
                  </span>
                  <span className="w-full text-[11.5px] leading-[18px] text-[#7C9287]">
                    {t('features.parish.systemExportSub')}
                  </span>
                  {exportInfo && (
                    <span className="flex items-center gap-2">
                      <StatusTag status={exportInfo.status} />
                      <span className="font-mono text-[10px] text-[#96AAA0]">{exportInfo.jobId}</span>
                    </span>
                  )}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => void onExport()}
                  disabled={startExport.isPending}
                  className="flex h-9 items-center gap-[7px] rounded-[10px] border border-[#DDE7D8] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
                >
                  <span className="text-[11.5px] font-bold text-[#0A5C36]">
                    {startExport.isPending ? t('common.loading') : t('features.parish.systemExportBtn')}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Cột phụ 300px */}
        <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
          <section className="flex w-full flex-col gap-3 overflow-hidden rounded-[16px] border border-[#F0D9D2] bg-[#FFF8F6] p-4">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1.1px] text-[#B4634F]">
              {t('features.parish.backupReset')}
            </span>
            <p className="w-full text-[13.5px] font-extrabold leading-[18px] text-[#7A2E22]">
              {t('features.parish.resetCardTitle', {
                defaultValue: 'Xoá mọi thay đổi trong trình duyệt',
              })}
            </p>
            <p className="w-full text-[10.5px] leading-[17px] text-[#9C6A5C]">
              {t('features.parish.backupResetSub')}
            </p>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="flex h-9 w-full items-center justify-center rounded-[10px] bg-[#B4483F] transition-colors hover:bg-[#9E3B33]"
            >
              <span className="text-[11.5px] font-bold text-white">
                {t('features.parish.backupResetBtn')}
              </span>
            </button>
          </section>

          <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[14px] bg-[#0A5C36] px-[14px] py-[13px]">
            <div
              className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
              aria-hidden
            />
            <span className="relative z-[1] flex w-fit items-center gap-[7px]">
              <ShieldCheck className="size-[11px] text-[#F2D07A]" aria-hidden />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                {t('features.parish.safetyHead', { defaultValue: 'An toàn dữ liệu' })}
              </span>
            </span>
            <p className="relative z-[2] w-full text-[10.5px] leading-4 text-[#A9D7BF]">
              {t('features.parish.safetyBody', {
                defaultValue: 'Bản sao lưu chỉ tải về bởi quản trị viên. Mọi thao tác sao lưu, xuất và đặt lại đều ghi vào nhật ký hệ thống.',
              })}
            </p>
          </section>
        </aside>
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
