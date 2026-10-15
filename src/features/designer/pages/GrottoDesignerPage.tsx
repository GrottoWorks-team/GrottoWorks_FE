import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAssetById } from '../assets'
import { AssetPalette } from '../components/AssetPalette'
import { DesignerToolbar } from '../components/DesignerToolbar'
import { GrottoCanvas } from '../components/GrottoCanvas'
import { InspectorPanel } from '../components/InspectorPanel'
import { useDesignerState } from '../useDesignerState'
import { useArea } from '@/features/areas/api'
import { useToast } from '@/components/ui/toast'

export default function GrottoDesignerPage() {
  const { areaId = 'default-area' } = useParams<{ areaId: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: area } = useArea(areaId)
  const areaName = area?.name || `Khu vực #${areaId.slice(0, 8)}`

  const {
    items,
    selectedId,
    selectedItem,
    canUndo,
    canRedo,
    zoom,
    pan,
    gridSnap,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    bringToFront,
    sendToBack,
    undo,
    redo,
    selectItem,
    setZoom,
    setGridSnap,
    resetDraft,
  } = useDesignerState(areaId, areaName)

  // Xuất ảnh PNG độ nét cao (HD 1200x800)
  const handleExportPng = useCallback(async () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 800
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Vẽ nền đêm Giáng sinh (Gradient xanh đen sẫm)
      const grad = ctx.createLinearGradient(0, 0, 0, 800)
      grad.addColorStop(0, '#0f172a')
      grad.addColorStop(1, '#1e293b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1200, 800)

      // Vẽ khung viền trang trí
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 2
      ctx.strokeRect(15, 15, 1170, 770)

      // Sắp xếp items theo zIndex để vẽ đúng thứ tự
      const sorted = [...items].sort((a, b) => a.zIndex - b.zIndex)

      for (const item of sorted) {
        const asset = getAssetById(item.assetId)
        if (!asset) continue

        // Chuyển đổi SVG thành Image để vẽ lên canvas
        const blob = new Blob([asset.svgMarkup], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const img = new Image()

        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.save()
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2)
            ctx.rotate((item.rotation * Math.PI) / 180)
            ctx.globalAlpha = item.opacity
            ctx.drawImage(img, -item.width / 2, -item.height / 2, item.width, item.height)
            ctx.restore()
            URL.revokeObjectURL(url)
            resolve()
          }
          img.onerror = () => {
            URL.revokeObjectURL(url)
            resolve()
          }
          img.src = url
        })
      }

      // Vẽ khung thông tin trang trọng góc dưới
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.strokeStyle = '#2f6b4f'
      ctx.lineWidth = 2
      ctx.fillRect(30, 710, 380, 60)
      ctx.strokeRect(30, 710, 380, 60)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(`GROTTOWORKS: ${areaName.toUpperCase()}`, 45, 735)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '12px monospace'
      ctx.fillText(
        `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Quy cách: 2D Blueprint`,
        45,
        755,
      )

      // Tải ảnh về
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `Ban-ve-hang-da-${areaId.slice(0, 8)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast('Đã xuất ảnh bản vẽ PNG thành công!')
    } catch {
      toast('Có lỗi khi tạo ảnh bản vẽ', 'alert')
    }
  }, [items, areaId, areaName, toast])

  const handleSave = () => {
    toast('Đã lưu bản thiết kế hang đá thành công!')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      {/* Thanh công cụ Studio */}
      <DesignerToolbar
        areaName={areaName}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={zoom}
        gridSnap={gridSnap}
        onBack={() => navigate(-1)}
        onUndo={undo}
        onRedo={redo}
        onToggleGridSnap={() => setGridSnap((v) => !v)}
        onZoomIn={() => setZoom((z) => Math.min(2.0, z + 0.1))}
        onZoomOut={() => setZoom((z) => Math.max(0.5, z - 0.1))}
        onResetZoom={() => setZoom(1.0)}
        onResetDraft={resetDraft}
        onExportPng={handleExportPng}
        onSave={handleSave}
      />

      {/* Không gian làm việc 3 cột */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Cột 1: Thư viện cấu kiện */}
        <AssetPalette
          onSelectAsset={(asset) => {
            addItem(asset, { x: 450, y: 250 })
            toast(`Đã thêm ${asset.name} vào bản vẽ`)
          }}
        />

        {/* Cột 2: Khung vẽ Canvas */}
        <main className="flex-1 min-w-0 relative h-full">
          <GrottoCanvas
            items={items}
            selectedId={selectedId}
            zoom={zoom}
            pan={pan}
            gridSnap={gridSnap}
            onSelectItem={selectItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onDuplicateItem={duplicateItem}
            onDropAsset={(assetId, pos) => {
              const asset = getAssetById(assetId)
              if (asset) {
                addItem(asset, pos)
                toast(`Đã đặt ${asset.name}`)
              }
            }}
          />
        </main>

        {/* Cột 3: Bảng thuộc tính & Vật tư */}
        <InspectorPanel
          selectedItem={selectedItem}
          allItems={items}
          areaName={areaName}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
          onDuplicateItem={duplicateItem}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
        />
      </div>
    </div>
  )
}
