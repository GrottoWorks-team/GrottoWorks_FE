import React from 'react'
import { getAssetById } from '../assets'
import type { GrottoCanvasItem } from '../types'

interface CanvasItemViewProps {
  item: GrottoCanvasItem
  isSelected: boolean
  onSelect: (e: React.MouseEvent) => void
  onStartDrag: (e: React.MouseEvent, type: 'move' | 'scale' | 'rotate') => void
}

export function CanvasItemView({
  item,
  isSelected,
  onSelect,
  onStartDrag,
}: CanvasItemViewProps) {
  const asset = getAssetById(item.assetId)

  return (
    <div
      data-testid={`canvas-item-${item.instanceId}`}
      className="absolute select-none cursor-move transition-shadow"
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: item.zIndex,
        opacity: item.opacity,
      }}
      onMouseDown={(e) => {
        onSelect(e)
        onStartDrag(e, 'move')
      }}
    >
      {/* Nội dung hình ảnh SVG */}
      <div
        className="size-full pointer-events-none"
        dangerouslySetInnerHTML={{ __html: asset?.svgMarkup || '' }}
      />

      {/* Bounding box khi được chọn */}
      {isSelected && (
        <div
          data-testid={`bounding-box-${item.instanceId}`}
          className="absolute -inset-1 rounded border-2 border-brand-pine/80 pointer-events-none ring-2 ring-brand-pine/20"
        >
          {/* Núm xoay trên đỉnh */}
          <div
            className="absolute -top-6 left-1/2 -translate-x-1/2 size-3.5 rounded-full bg-amber-500 border-2 border-white shadow cursor-grab pointer-events-auto hover:scale-125 transition-transform"
            title="Xoay góc"
            onMouseDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, 'rotate')
            }}
          />
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-amber-500" />

          {/* 4 điểm mút điều chỉnh kích thước ở góc */}
          <div
            className="absolute -top-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-pine shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, 'scale')
            }}
          />
          <div
            className="absolute -top-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-pine shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, 'scale')
            }}
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 size-3 rounded-full bg-white border-2 border-brand-pine shadow cursor-nesw-resize pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, 'scale')
            }}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 size-3 rounded-full bg-white border-2 border-brand-pine shadow cursor-nwse-resize pointer-events-auto hover:scale-125 transition-transform"
            onMouseDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, 'scale')
            }}
          />
        </div>
      )}
    </div>
  )
}
