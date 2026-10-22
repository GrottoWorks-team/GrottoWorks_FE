import { useState } from 'react'
import {
  Sliders,
  Layers,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  FileSpreadsheet,
  Check,
  ClipboardCopy,
} from 'lucide-react'
import { calculateBOM, exportBOMToCsv } from '../bom'
import type { GrottoCanvasItem } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

interface InspectorPanelProps {
  selectedItem: GrottoCanvasItem | null
  allItems: GrottoCanvasItem[]
  areaName?: string
  onUpdateItem: (id: string, patch: Partial<GrottoCanvasItem>) => void
  onRemoveItem: (id: string) => void
  onDuplicateItem: (id: string) => void
  onBringToFront: (id: string) => void
  onSendToBack: (id: string) => void
}

export function InspectorPanel({
  selectedItem,
  allItems,
  areaName,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onBringToFront,
  onSendToBack,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'PROPS' | 'BOM'>('PROPS')
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const bom = calculateBOM(allItems)

  const handleCopyBOM = () => {
    const text = bom
      .map(
        (b, idx) =>
          `${idx + 1}. ${b.materialName}: ${b.totalQuantity} ${b.unit} (${b.itemsCount} vị trí)`,
      )
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast('Đã sao chép bảng danh mục vật tư!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadCsv = () => {
    const csvContent = exportBOMToCsv(bom, areaName)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Vat-tu-hang-da-${areaName || 'khu-vuc'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast('Đã tải xuống file CSV danh mục vật tư!')
  }

  return (
    <aside className="w-[290px] shrink-0 border-l border-border bg-card/95 backdrop-blur flex flex-col h-full select-none">
      {/* Tab chuyển đổi giữa Thuộc tính & Vật tư BOM */}
      <div className="flex border-b border-border/70 p-2 gap-1 bg-muted/20">
        <button
          onClick={() => setActiveTab('PROPS')}
          className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'PROPS'
              ? 'bg-brand-pine text-white shadow-sm'
              : 'text-muted-foreground hover:bg-card hover:text-foreground'
          }`}
        >
          <Sliders className="size-3.5 mr-1.5" />
          Thuộc tính
        </button>
        <button
          onClick={() => setActiveTab('BOM')}
          className={`flex-1 flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'BOM'
              ? 'bg-brand-pine text-white shadow-sm'
              : 'text-muted-foreground hover:bg-card hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="size-3.5 mr-1.5 text-amber-500" />
          Vật tư ({bom.length})
        </button>
      </div>

      {/* Nội dung Tab */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {activeTab === 'PROPS' ? (
          selectedItem ? (
            <div className="space-y-4">
              {/* Tiêu đề vật thể */}
              <div className="rounded-lg border border-brand-pine/20 bg-brand-pine/5 p-3">
                <span className="text-[10px] font-mono text-brand-pine font-bold uppercase tracking-wider">
                  Vật thể đang chọn
                </span>
                <h3 className="text-sm font-extrabold text-foreground mt-0.5">
                  {selectedItem.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Định mức: {selectedItem.materialReq.quantity} {selectedItem.materialReq.unit}{' '}
                  {selectedItem.materialReq.materialName}
                </p>
              </div>

              {/* Toạ độ X, Y */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Toạ độ X (px)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedItem.x)}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.instanceId, { x: Number(e.target.value) || 0 })
                    }
                    className="h-8 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Toạ độ Y (px)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedItem.y)}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.instanceId, { y: Number(e.target.value) || 0 })
                    }
                    className="h-8 font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Rộng, Cao */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Chiều rộng (W)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedItem.width)}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.instanceId, {
                        width: Math.max(20, Number(e.target.value) || 20),
                      })
                    }
                    className="h-8 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Chiều cao (H)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedItem.height)}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.instanceId, {
                        height: Math.max(20, Number(e.target.value) || 20),
                      })
                    }
                    className="h-8 font-mono text-xs tabular-nums"
                  />
                </div>
              </div>

              {/* Góc xoay & Z-index */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Góc xoay (°)</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedItem.rotation)}
                    onChange={(e) =>
                      onUpdateItem(selectedItem.instanceId, {
                        rotation: (Number(e.target.value) || 0) % 360,
                      })
                    }
                    className="h-8 font-mono text-xs tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Thứ tự lớp (Z)</Label>
                  <Input
                    type="number"
                    value={selectedItem.zIndex}
                    disabled
                    className="h-8 font-mono text-xs bg-muted/50 tabular-nums cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Nút điều chỉnh lớp */}
              <div className="space-y-1.5 pt-2">
                <Label className="text-[11px] text-muted-foreground">Thứ tự hiển thị lớp:</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBringToFront(selectedItem.instanceId)}
                    className="h-8 text-xs font-medium"
                  >
                    <ArrowUp className="size-3.5 mr-1 text-emerald-600" />
                    Lên trên
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSendToBack(selectedItem.instanceId)}
                    className="h-8 text-xs font-medium"
                  >
                    <ArrowDown className="size-3.5 mr-1 text-slate-500" />
                    Xuống dưới
                  </Button>
                </div>
              </div>

              {/* Hành động: Nhân bản / Xoá */}
              <div className="pt-3 border-t border-border flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDuplicateItem(selectedItem.instanceId)}
                  className="flex-1 h-8 text-xs"
                >
                  <Copy className="size-3.5 mr-1 text-blue-500" />
                  Nhân bản (Ctrl+D)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveItem(selectedItem.instanceId)}
                  className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Xoá
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-14 text-center space-y-2">
              <Layers className="size-8 mx-auto text-muted-foreground/40" />
              <p className="text-xs font-semibold text-muted-foreground">
                Chưa chọn vật thể nào
              </p>
              <p className="text-[11px] text-muted-foreground/70 max-w-[200px] mx-auto">
                Nhấp chuột vào một vật thể trên khung vẽ để tinh chỉnh kích thước và toạ độ.
              </p>
            </div>
          )
        ) : (
          /* TAB 2: BÓC TÁCH VẬT TƯ (BOM) */
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="lbl-mono text-xs">Vật tư dự trù thi công</span>
              <Badge className="font-mono text-xs bg-amber-50 text-amber-700 border-amber-200">
                {allItems.length} vật thể
              </Badge>
            </div>

            {bom.length > 0 ? (
              <div className="space-y-2">
                <div className="divide-y divide-border/60 rounded-lg border border-border bg-card overflow-hidden">
                  {bom.map((mat, idx) => (
                    <div key={idx} className="p-2.5 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground leading-snug">
                          {mat.materialName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Dùng tại {mat.itemsCount} vị trí trên bản vẽ
                        </p>
                      </div>
                      <Badge className="font-mono text-xs bg-emerald-50 text-emerald-800 border-emerald-200 shrink-0">
                        {mat.totalQuantity} {mat.unit}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBOM}
                    className="w-full text-xs font-medium"
                  >
                    {copied ? (
                      <Check className="size-3.5 mr-1.5 text-emerald-600" />
                    ) : (
                      <ClipboardCopy className="size-3.5 mr-1.5 text-brand-pine" />
                    )}
                    Sao chép danh sách vật tư
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadCsv}
                    className="w-full text-xs font-medium bg-brand-pine hover:bg-brand-pine/90 text-white"
                  >
                    <FileSpreadsheet className="size-3.5 mr-1.5" />
                    Xuất file Excel / CSV
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-14 text-center space-y-2">
                <FileSpreadsheet className="size-8 mx-auto text-muted-foreground/40" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Chưa có vật tư nào
                </p>
                <p className="text-[11px] text-muted-foreground/70 max-w-[210px] mx-auto">
                  Hãy kéo cấu kiện từ thư viện vào bản vẽ, danh mục vật tư sẽ tự động được bóc tách tại đây.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
