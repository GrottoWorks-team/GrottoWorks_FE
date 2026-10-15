import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GROTTO_ASSETS } from './assets'
import { useDesignerState } from './useDesignerState'

describe('useDesignerState Hook', () => {
  const areaId = 'test-area-123'

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('khởi tạo với danh sách vật thể rỗng khi chưa có dữ liệu lưu', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    expect(result.current.items).toEqual([])
    expect(result.current.selectedId).toBeNull()
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('thêm vật thể mới vào canvas và chọn vật thể đó', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const starAsset = GROTTO_ASSETS.find((a) => a.assetId === 'light-star-bethlehem')!

    act(() => {
      result.current.addItem(starAsset, { x: 200, y: 150 })
    })

    expect(result.current.items).toHaveLength(1)
    const added = result.current.items[0]
    expect(added.assetId).toBe('light-star-bethlehem')
    expect(added.x).toBe(200)
    expect(added.y).toBe(150)
    expect(result.current.selectedId).toBe(added.instanceId)
    expect(result.current.canUndo).toBe(true)
  })

  it('hỗ trợ hoàn tác (Undo) và làm lại (Redo)', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const archAsset = GROTTO_ASSETS.find((a) => a.assetId === 'rock-arch-main')!

    act(() => {
      result.current.addItem(archAsset)
    })
    expect(result.current.items).toHaveLength(1)

    // Undo
    act(() => {
      result.current.undo()
    })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.canRedo).toBe(true)

    // Redo
    act(() => {
      result.current.redo()
    })
    expect(result.current.items).toHaveLength(1)
  })

  it('hỗ trợ cập nhật toạ độ và kích thước vật thể', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const treeAsset = GROTTO_ASSETS.find((a) => a.assetId === 'deco-pine-tree-tall')!

    act(() => {
      result.current.addItem(treeAsset)
    })
    const id = result.current.items[0].instanceId

    act(() => {
      result.current.updateItem(id, { x: 350, y: 400, rotation: 45 })
    })

    const updated = result.current.items.find((i) => i.instanceId === id)
    expect(updated?.x).toBe(350)
    expect(updated?.y).toBe(400)
    expect(updated?.rotation).toBe(45)
  })

  it('hỗ trợ nhân bản (Duplicate) vật thể đang chọn', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const sheepAsset = GROTTO_ASSETS.find((a) => a.assetId === 'statue-sheep-group')!

    act(() => {
      result.current.addItem(sheepAsset, { x: 100, y: 100 })
    })
    const firstId = result.current.items[0].instanceId

    act(() => {
      result.current.duplicateItem(firstId)
    })

    expect(result.current.items).toHaveLength(2)
    const second = result.current.items[1]
    expect(second.instanceId).not.toBe(firstId)
    expect(second.x).toBe(120) // dịch nhẹ 20px
    expect(second.y).toBe(120)
  })

  it('hỗ trợ xoá vật thể', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const archAsset = GROTTO_ASSETS.find((a) => a.assetId === 'rock-arch-main')!

    act(() => {
      result.current.addItem(archAsset)
    })
    const id = result.current.items[0].instanceId

    act(() => {
      result.current.removeItem(id)
    })
    expect(result.current.items).toHaveLength(0)
    expect(result.current.selectedId).toBeNull()
  })

  it('hỗ trợ sắp xếp thứ tự lớp bringToFront và sendToBack', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const arch = GROTTO_ASSETS[0]
    const statue = GROTTO_ASSETS[4]

    act(() => {
      result.current.addItem(arch) // zIndex: 1
      result.current.addItem(statue) // zIndex: 2
    })

    const archId = result.current.items[0].instanceId

    // Đưa arch lên trên cùng
    act(() => {
      result.current.bringToFront(archId)
    })

    const archAfter = result.current.items.find((i) => i.instanceId === archId)!
    const statueAfter = result.current.items.find((i) => i.instanceId !== archId)!
    expect(archAfter.zIndex).toBeGreaterThan(statueAfter.zIndex)
  })

  it('tự động lưu vào localStorage và khôi phục khi khởi tạo lại', () => {
    const { result } = renderHook(() => useDesignerState(areaId))
    const star = GROTTO_ASSETS.find((a) => a.assetId === 'light-star-bethlehem')!

    act(() => {
      result.current.addItem(star, { x: 500, y: 200 })
    })

    // Mount hook mới với cùng areaId
    const { result: secondHook } = renderHook(() => useDesignerState(areaId))
    expect(secondHook.current.items).toHaveLength(1)
    expect(secondHook.current.items[0].assetId).toBe('light-star-bethlehem')
  })
})
