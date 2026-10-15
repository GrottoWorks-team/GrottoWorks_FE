import {
  ArrowLeft,
  Undo2,
  Redo2,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Save,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DesignerToolbarProps {
  areaName: string
  canUndo: boolean
  canRedo: boolean
  zoom: number
  gridSnap: boolean
  onBack: () => void
  onUndo: () => void
  onRedo: () => void
  onToggleGridSnap: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onResetDraft: () => void
  onExportPng: () => void
  onSave: () => void
}

export function DesignerToolbar({
  areaName,
  canUndo,
  canRedo,
  zoom,
  gridSnap,
  onBack,
  onUndo,
  onRedo,
  onToggleGridSnap,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onResetDraft,
  onExportPng,
  onSave,
}: DesignerToolbarProps) {
  return (
    <header className="h-14 border-b border-border bg-card/95 backdrop-blur px-4 flex items-center justify-between gap-4 select-none shrink-0 z-20">
      {/* Cụm trái: Nút Quay lại & Tên phân khu */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1.5" />
          Quay lại
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-foreground tracking-tight">
            {areaName}
          </h2>
          <Badge className="bg-brand-pine/10 text-brand-pine text-[10px] font-mono border-brand-pine/20">
            2D Studio
          </Badge>
        </div>
      </div>

      {/* Cụm giữa: Undo/Redo, Grid snap, Zoom controls */}
      <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          className="size-7 text-xs"
          title="Hoàn tác (Ctrl+Z)"
        >
          <Undo2 className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          className="size-7 text-xs"
          title="Làm lại (Ctrl+Y)"
        >
          <Redo2 className="size-3.5" />
        </Button>

        <div className="h-3.5 w-px bg-border mx-0.5" />

        <Button
          variant={gridSnap ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleGridSnap}
          className="h-7 px-2 text-[11px] font-medium"
          title="Bật/Tắt bám dính lưới"
        >
          <Grid className="size-3 mr-1" />
          Lưới ({gridSnap ? 'Bật' : 'Tắt'})
        </Button>

        <div className="h-3.5 w-px bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomOut}
          className="size-7"
          title="Thu nhỏ"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <span className="text-[11px] font-mono tabular-nums px-1.5 text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onZoomIn}
          className="size-7"
          title="Phóng to"
        >
          <ZoomIn className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onResetZoom}
          className="size-7"
          title="Vừa màn hình (100%)"
        >
          <Maximize2 className="size-3.5" />
        </Button>

        <div className="h-3.5 w-px bg-border mx-0.5" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onResetDraft}
          className="size-7 text-destructive hover:bg-destructive/10"
          title="Làm mới toàn bộ bản vẽ"
        >
          <RotateCcw className="size-3.5" />
        </Button>
      </div>

      {/* Cụm phải: Xuất ảnh PNG & Lưu */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPng}
          className="h-8 text-xs font-semibold border-border hover:bg-muted"
        >
          <Download className="size-3.5 mr-1.5 text-brand-pine" />
          Xuất ảnh PNG
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          className="h-8 text-xs font-semibold bg-brand-pine hover:bg-brand-pine/90 text-white shadow-sm"
        >
          <Save className="size-3.5 mr-1.5" />
          Lưu thiết kế
        </Button>
      </div>
    </header>
  )
}
