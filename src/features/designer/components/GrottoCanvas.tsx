import React, { useEffect, useRef, useState } from 'react'
import type { GrottoCanvasItem } from '../types'
import { CanvasItemView } from './CanvasItemView'

interface GrottoCanvasProps {
  items: GrottoCanvasItem[]
  selectedId: string | null
  zoom: number
  pan: { x: number; y: number }
  gridSnap: boolean
  onSelectItem: (id: string | null) => void
  onUpdateItem: (id: string, patch: Partial<GrottoCanvasItem>) => void
  onRemoveItem: (id: string) => void
  onDuplicateItem: (id: string) => void
  onDropAsset?: (assetId: string, pos: { x: number; y: number }) => void
}

const GRID_SIZE = 20

export function GrottoCanvas({
  items,
  selectedId,
  zoom,
  pan,
  gridSnap,
  onSelectItem,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
  onDropAsset,
}: GrottoCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Dragging state
  const [dragState, setDragState] = useState<{
    type: 'move' | 'scale' | 'rotate'
    itemId: string
    startX: number
    startY: number
    initialItemX: number
    initialItemY: number
    initialWidth: number
    initialHeight: number
    initialRotation: number
  } | null>(null)

  // Xử lý phím tắt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Tránh bắt phím khi đang gõ vào input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }

      if (selectedId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        onRemoveItem(selectedId)
      } else if (selectedId && e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        onDuplicateItem(selectedId)
      } else if (e.key === 'Escape') {
        onSelectItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, onRemoveItem, onDuplicateItem, onSelectItem])

  // Chuột bắt đầu tương tác trên vật thể
  const handleStartDrag = (
    e: React.MouseEvent,
    item: GrottoCanvasItem,
    type: 'move' | 'scale' | 'rotate',
  ) => {
    e.stopPropagation()
    setDragState({
      type,
      itemId: item.instanceId,
      startX: e.clientX,
      startY: e.clientY,
      initialItemX: item.x,
      initialItemY: item.y,
      initialWidth: item.width,
      initialHeight: item.height,
      initialRotation: item.rotation,
    })
  }

  // Chuột di chuyển trên Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return

    const deltaX = (e.clientX - dragState.startX) / zoom
    const deltaY = (e.clientY - dragState.startY) / zoom

    if (dragState.type === 'move') {
      let nextX = dragState.initialItemX + deltaX
      let nextY = dragState.initialItemY + deltaY

      if (gridSnap) {
        nextX = Math.round(nextX / GRID_SIZE) * GRID_SIZE
        nextY = Math.round(nextY / GRID_SIZE) * GRID_SIZE
      }

      onUpdateItem(dragState.itemId, { x: nextX, y: nextY })
    } else if (dragState.type === 'scale') {
      const nextW = Math.max(30, dragState.initialWidth + deltaX)
      const nextH = Math.max(30, dragState.initialHeight + deltaY)
      onUpdateItem(dragState.itemId, {
        width: Math.round(nextW),
        height: Math.round(nextH),
      })
    } else if (dragState.type === 'rotate') {
      // Tính góc xoay dựa trên delta
      const nextRotation = Math.round((dragState.initialRotation + deltaX * 0.8) % 360)
      onUpdateItem(dragState.itemId, {
        rotation: nextRotation < 0 ? nextRotation + 360 : nextRotation,
      })
    }
  }

  const handleMouseUp = () => {
    setDragState(null)
  }

  // Xử lý kéo thả từ AssetPalette vào canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const assetId = e.dataTransfer.getData('application/grotto-asset')
    if (assetId && onDropAsset && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      let x = (e.clientX - rect.left - pan.x) / zoom - 50
      let y = (e.clientY - rect.top - pan.y) / zoom - 50
      if (gridSnap) {
        x = Math.round(x / GRID_SIZE) * GRID_SIZE
        y = Math.round(y / GRID_SIZE) * GRID_SIZE
      }
      onDropAsset(assetId, { x, y })
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative size-full overflow-hidden bg-slate-900 select-none cursor-default"
      onMouseDown={(e) => {
        if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-grid-bg') {
          onSelectItem(null)
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Nền lưới kỹ thuật tỷ lệ (Blueprint Grid) */}
      <div
        id="canvas-grid-bg"
        className="absolute inset-0 pointer-events-auto"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px, ${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px, ${GRID_SIZE * 5 * zoom}px ${GRID_SIZE * 5 * zoom}px, ${GRID_SIZE * 5 * zoom}px ${GRID_SIZE * 5 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Sân khấu Canvas biến đổi theo zoom và pan */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: '1200px',
          height: '800px',
        }}
      >
        {/* Đường biên sân thi công */}
        <div className="absolute inset-0 rounded-xl border-2 border-dashed border-white/20 pointer-events-none" />

        {/* Danh sách các vật thể được xếp theo zIndex */}
        {items.map((item) => (
          <CanvasItemView
            key={item.instanceId}
            item={item}
            isSelected={item.instanceId === selectedId}
            onSelect={(e) => {
              e.stopPropagation()
              onSelectItem(item.instanceId)
            }}
            onStartDrag={(e, type) => handleStartDrag(e, item, type)}
          />
        ))}
      </div>
    </div>
  )
}
