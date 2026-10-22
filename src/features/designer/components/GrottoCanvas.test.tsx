import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GrottoCanvasItem } from '../types'
import { GrottoCanvas } from './GrottoCanvas'

describe('GrottoCanvas Component', () => {
  const mockItems: GrottoCanvasItem[] = [
    {
      instanceId: 'item-1',
      assetId: 'rock-arch-main',
      name: 'Vòm đá chính Bê-lem',
      category: 'ROCKS',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      zIndex: 1,
      opacity: 1,
      materialReq: { materialName: 'Sắt hộp', quantity: 5, unit: 'cây' },
    },
    {
      instanceId: 'item-2',
      assetId: 'statue-nativity-core',
      name: 'Tượng Thánh Gia',
      category: 'STATUES',
      x: 150,
      y: 120,
      width: 100,
      height: 90,
      rotation: 0,
      zIndex: 2,
      opacity: 1,
      materialReq: { materialName: 'Tượng composite', quantity: 1, unit: 'bộ' },
    },
  ]

  it('render các vật thể trên canvas đúng vị trí và tên', () => {
    render(
      <GrottoCanvas
        items={mockItems}
        selectedId={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        gridSnap={true}
        onSelectItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onDuplicateItem={vi.fn()}
      />,
    )

    expect(screen.getByTestId('canvas-item-item-1')).toBeDefined()
    expect(screen.getByTestId('canvas-item-item-2')).toBeDefined()
  })

  it('gọi onSelectItem khi người dùng click vào vật thể', () => {
    const handleSelect = vi.fn()
    render(
      <GrottoCanvas
        items={mockItems}
        selectedId={null}
        zoom={1}
        pan={{ x: 0, y: 0 }}
        gridSnap={true}
        onSelectItem={handleSelect}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onDuplicateItem={vi.fn()}
      />,
    )

    fireEvent.mouseDown(screen.getByTestId('canvas-item-item-2'))
    expect(handleSelect).toHaveBeenCalledWith('item-2')
  })

  it('hiển thị Bounding Box điều khiển khi vật thể được chọn', () => {
    render(
      <GrottoCanvas
        items={mockItems}
        selectedId="item-1"
        zoom={1}
        pan={{ x: 0, y: 0 }}
        gridSnap={true}
        onSelectItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onDuplicateItem={vi.fn()}
      />,
    )

    expect(screen.getByTestId('bounding-box-item-1')).toBeDefined()
  })

  it('gọi onRemoveItem khi nhấn phím Delete trên bàn phím', () => {
    const handleRemove = vi.fn()
    render(
      <GrottoCanvas
        items={mockItems}
        selectedId="item-1"
        zoom={1}
        pan={{ x: 0, y: 0 }}
        gridSnap={true}
        onSelectItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onRemoveItem={handleRemove}
        onDuplicateItem={vi.fn()}
      />,
    )

    fireEvent.keyDown(window, { key: 'Delete' })
    expect(handleRemove).toHaveBeenCalledWith('item-1')
  })
})
