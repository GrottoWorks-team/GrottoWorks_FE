import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusTag } from '@/components/shared/StatusTag'
import { useToast } from '@/components/ui/toast'
import { useArea } from '../api'
import {
  useWorkAreaProgress,
  useUpdateWorkAreaProgress,
  useWorkAreaReadinessChecks,
} from '../progressApi'
import { Calendar, Layers, ShieldCheck, Info, Package, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react'
import { AreaMaterialsTab } from './AreaMaterialsTab'

interface AreaDetailDialogProps {
  areaId: string | null
  open: boolean
  onClose: () => void
}

export function AreaDetailDialog(props: AreaDetailDialogProps) {
  if (!props.open) return null
  return <AreaDetailDialogContent {...props} />
}

function AreaDetailDialogContent({ areaId, open, onClose }: AreaDetailDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: area, isPending } = useArea(areaId ?? undefined)
  const [activeTab, setActiveTab] = useState<'info' | 'materials' | 'progress'>('info')

  const { data: progressData } = useWorkAreaProgress(areaId ?? undefined)
  const updateProgressMutation = useUpdateWorkAreaProgress()
  const { data: readinessChecks = [] } = useWorkAreaReadinessChecks(areaId ?? undefined)

  const [editProgress, setEditProgress] = useState<number>(0)

  useEffect(() => {
    if (progressData) {
      setEditProgress(progressData.progressPercentage)
    }
  }, [progressData])

  const handleSaveProgress = async () => {
    if (!areaId) return
    try {
      await updateProgressMutation.mutateAsync({
        workAreaId: areaId,
        progressPercentage: Number(editProgress),
      })
      toast('Đã cập nhật tiến độ khu vực')
    } catch {
      toast('Lỗi cập nhật tiến độ khu vực', 'alert')
    }
  }

  if (!open) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.areas.detailTitle', { defaultValue: 'Chi tiết Phân khu thi công hang đá' })}
      size={activeTab === 'materials' ? 'lg' : 'md'}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close', { defaultValue: 'Đóng' })}
        </Button>
      }
    >
      <div className="flex border-b border-border mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'info'
              ? 'border-brand-pine text-brand-pine'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Info className="size-4" />
          <span>{t('features.areas.tabs.info', { defaultValue: 'Thông tin chung' })}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'materials'
              ? 'border-brand-pine text-brand-pine'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="size-4" />
          <span>{t('features.requirements.tabTitle', { defaultValue: 'Nhu cầu vật tư' })}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-semibold transition-colors ${
            activeTab === 'progress'
              ? 'border-brand-pine text-brand-pine'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
          data-testid="area-progress-tab"
        >
          <TrendingUp className="size-4" />
          <span>Tiến độ & Sẵn sàng</span>
        </button>
      </div>

      {activeTab === 'materials' && areaId ? (
        <AreaMaterialsTab workAreaId={areaId} />
      ) : activeTab === 'progress' ? (
        <div className="space-y-4 py-2" data-testid="area-progress-content">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Tiến độ thi công khu vực</span>
              <Badge className="font-mono text-sm font-extrabold text-brand-pine">
                {progressData?.progressPercentage ?? editProgress}%
              </Badge>
            </div>

            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-brand-pine transition-all duration-300"
                style={{ width: `${progressData?.progressPercentage ?? editProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span>
                Nhiệm vụ hoàn thành: {progressData?.tasksCompleted ?? 0} / {progressData?.tasksTotal ?? 0} việc
              </span>
              <span>Cập nhật: {progressData?.updatedAt ? new Date(progressData.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <input
                type="range"
                min="0"
                max="100"
                value={editProgress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
                className="w-full accent-brand-pine"
                data-testid="progress-range-input"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveProgress}
                disabled={updateProgressMutation.isPending}
                data-testid="save-progress-btn"
              >
                {updateProgressMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Lưu'}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-brand-pine" />
              <h4 className="text-sm font-bold text-foreground">Kiểm tra điều kiện sẵn sàng</h4>
            </div>

            {readinessChecks.length > 0 ? (
              <div className="space-y-2 pt-1 max-h-40 overflow-y-auto">
                {readinessChecks.map((rc: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded border border-border/70 p-2 text-xs">
                    <span className="font-medium text-foreground">{rc.name ?? rc.title ?? `Mục kiểm tra #${idx + 1}`}</span>
                    <Badge className="text-[10px]">{rc.status ?? 'PASS'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground pt-1">
                Chưa có đợt kiểm tra sẵn sàng nào ghi nhận lỗi cho khu vực này.
              </p>
            )}
          </div>
        </div>
      ) : isPending ? (
        <p className="lbl-mono py-8 text-center">{t('common.loading')}</p>
      ) : !area ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('common.notFound', { defaultValue: 'Không tìm thấy thông tin khu vực.' })}
        </p>
      ) : (
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-brand-pine/20 bg-brand-pine/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-pine uppercase tracking-wider">
                Mã khu vực (ID)
              </span>
              <Badge className="font-mono text-xs">
                #{area.id.slice(0, 8)}
              </Badge>
            </div>
            <h3 className="mt-1 text-base font-extrabold text-foreground">
              {area.name || `Khu vực #${area.id.slice(0, 8)}`}
            </h3>
            {area.description && (
              <p className="mt-1 text-xs text-muted-foreground">{area.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/80 bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Layers className="size-3.5 text-brand-pine" />
                <span>Loại phân khu</span>
              </div>
              <p className="mt-1 text-sm font-bold text-foreground">
                {t(`features.areas.type.${area.type}`, { defaultValue: area.type || 'Hang đá Bê-lem' })}
              </p>
            </div>

            <div className="rounded-lg border border-border/80 bg-card p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5 text-brand-gold" />
                <span>Trạng thái thi công</span>
              </div>
              <div className="mt-1">
                <StatusTag status={area.status} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mã mùa công tác:</span>
              <span className="font-mono text-foreground font-medium">{area.seasonId}</span>
            </div>
            {area.communityId && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Giáo khu phụ trách:</span>
                <span className="font-mono text-foreground font-medium">{area.communityId}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phiên bản dữ liệu:</span>
              <Badge className="font-mono text-[10px]">v1</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-1">
            <ShieldCheck className="size-4 text-brand-pine shrink-0" />
            <span>Dữ liệu phân khu được xác thực từ backend ParishCoordination theo ID</span>
          </div>
        </div>
      )}
    </Dialog>
  )
}
