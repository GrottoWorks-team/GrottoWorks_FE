import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusTag } from '@/components/shared/StatusTag'
import { useArea } from '../api'
import { Calendar, Layers, ShieldCheck, Info, Package } from 'lucide-react'
import { AreaMaterialsTab } from './AreaMaterialsTab'

interface AreaDetailDialogProps {
  areaId: string | null
  open: boolean
  onClose: () => void
}

export function AreaDetailDialog({ areaId, open, onClose }: AreaDetailDialogProps) {
  const { t } = useTranslation()
  const { data: area, isPending } = useArea(areaId ?? undefined)
  const [activeTab, setActiveTab] = useState<'info' | 'materials'>('info')

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
      </div>

      {activeTab === 'materials' && areaId ? (
        <AreaMaterialsTab workAreaId={areaId} />
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
