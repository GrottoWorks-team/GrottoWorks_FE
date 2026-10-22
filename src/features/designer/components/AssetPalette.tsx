import React, { useMemo, useState } from 'react'
import { Sparkles, Mountain, Lightbulb, TreePine, Search } from 'lucide-react'
import { GROTTO_ASSETS } from '../assets'
import type { GrottoAssetCategory, GrottoAssetDef } from '../types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface AssetPaletteProps {
  onSelectAsset: (asset: GrottoAssetDef) => void
}

const CATEGORIES: { id: GrottoAssetCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'ROCKS', label: 'Vách đá', icon: <Mountain className="size-3.5 mr-1" /> },
  { id: 'STATUES', label: 'Tượng ảnh', icon: <Sparkles className="size-3.5 mr-1 text-amber-500" /> },
  { id: 'LIGHTING', label: 'Ánh sáng', icon: <Lightbulb className="size-3.5 mr-1 text-amber-400" /> },
  { id: 'DECORATION', label: 'Trang trí', icon: <TreePine className="size-3.5 mr-1 text-emerald-600" /> },
]

export function AssetPalette({ onSelectAsset }: AssetPaletteProps) {
  const [activeTab, setActiveTab] = useState<GrottoAssetCategory>('ROCKS')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredAssets = useMemo(() => {
    return GROTTO_ASSETS.filter((asset) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.materialReq.materialName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = searchQuery.trim() !== '' || asset.category === activeTab
      return matchSearch && matchCategory
    })
  }, [activeTab, searchQuery])

  return (
    <aside className="w-[270px] shrink-0 border-r border-border bg-card/95 backdrop-blur flex flex-col h-full select-none">
      {/* Tiêu đề & Ô tìm kiếm */}
      <div className="p-3 border-b border-border/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="lbl-mono text-xs">Thư viện cấu kiện</span>
          <Badge className="text-[10px] bg-brand-pine/10 text-brand-pine border-brand-pine/20">
            16 mẫu
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm cấu kiện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-gw-canvas/60"
          />
        </div>
      </div>

      {/* Tabs danh mục */}
      <div className="grid grid-cols-2 gap-1 p-2 border-b border-border/70 bg-muted/20">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeTab === cat.id}
            onClick={() => {
              setActiveTab(cat.id)
              setSearchQuery('')
            }}
            className={`flex items-center justify-center py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
              activeTab === cat.id && searchQuery === ''
                ? 'bg-brand-pine text-white shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Danh sách thẻ cấu kiện cuộn mượt mà */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredAssets.map((asset) => (
          <div
            key={asset.assetId}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/grotto-asset', asset.assetId)
              e.dataTransfer.effectAllowed = 'copy'
            }}
            onClick={() => onSelectAsset(asset)}
            className="group relative flex items-center gap-3 p-2 rounded-lg border border-border/80 bg-card hover:border-brand-pine hover:bg-brand-pine/5 transition-all cursor-pointer shadow-sm hover:shadow"
            title="Kéo hoặc click để đưa vào bản vẽ"
          >
            {/* Thumbnail SVG */}
            <div
              className="size-12 shrink-0 rounded-md bg-slate-900/90 border border-slate-700/50 p-1 flex items-center justify-center group-hover:scale-105 transition-transform"
              dangerouslySetInnerHTML={{ __html: asset.svgMarkup }}
            />

            {/* Thông tin cấu kiện */}
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate group-hover:text-brand-pine transition-colors">
                {asset.name}
              </h4>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                Vật tư: {asset.materialReq.materialName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-muted-foreground/80">
                  {asset.defaultWidth}x{asset.defaultHeight}px
                </span>
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1 rounded">
                  +{asset.materialReq.defaultQty} {asset.materialReq.unit}
                </span>
              </div>
            </div>
          </div>
        ))}

        {filteredAssets.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Không tìm thấy cấu kiện phù hợp
          </p>
        )}
      </div>

      <div className="p-2.5 border-t border-border/70 text-center">
        <p className="text-[11px] text-muted-foreground">
          💡 <i>Kéo thả hoặc click để chèn vào giữa canvas</i>
        </p>
      </div>
    </aside>
  )
}
