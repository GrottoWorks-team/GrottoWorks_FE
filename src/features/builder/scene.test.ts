import { describe, expect, test } from 'vitest'
import {
  addItem,
  addLayer,
  createScene,
  duplicateItem,
  explodeOffsets,
  isItemLocked,
  itemsOfLayer,
  linkTask,
  moveItemToLayer,
  moveLayer,
  removeItem,
  removeLayer,
  renameLayer,
  setLayerLocked,
  setLayerVisible,
  sortedLayers,
  unlinkTask,
  updateItemTransform,
} from './scene'
import type { ConstructionScene } from './types'

const base = (): ConstructionScene =>
  createScene({
    id: 'scene-1',
    workAreaId: 'area-1',
    name: 'Hang đá',
    layerNames: ['Nền móng', 'Kết cấu', 'Bao phủ', 'Trang trí'],
    createdAt: '2026-10-22T00:00:00.000Z',
  })

const withItem = () => {
  const scene = base()
  const { scene: next, itemId } = addItem(scene, {
    assetId: 'demo-block',
    layerId: 'ly2',
    position: [1, 0, 2],
  })
  return { scene: next, itemId: itemId! }
}

describe('createScene', () => {
  test('tạo 4 lớp mặc định đúng thứ tự, chưa có item', () => {
    const scene = base()
    expect(sortedLayers(scene).map((l) => l.name)).toEqual([
      'Nền móng',
      'Kết cấu',
      'Bao phủ',
      'Trang trí',
    ])
    expect(sortedLayers(scene).map((l) => l.order)).toEqual([0, 1, 2, 3])
    expect(scene.items).toEqual([])
    expect(scene.schemaVersion).toBe(1)
  })
})

describe('layer', () => {
  test('thêm, đổi tên và đổi thứ tự lớp', () => {
    let scene = addLayer(base(), 'Đèn')
    expect(scene.layers).toHaveLength(5)
    const added = scene.layers[4]
    expect(added.order).toBe(4)

    scene = renameLayer(scene, added.id, '  Hệ thống đèn  ')
    expect(scene.layers[4].name).toBe('Hệ thống đèn')

    scene = moveLayer(scene, added.id, -1)
    expect(sortedLayers(scene).map((l) => l.name)).toEqual([
      'Nền móng',
      'Kết cấu',
      'Bao phủ',
      'Hệ thống đèn',
      'Trang trí',
    ])
    expect(sortedLayers(scene).map((l) => l.order)).toEqual([0, 1, 2, 3, 4])

    // vượt biên → không đổi gì (giữ nguyên tham chiếu)
    expect(moveLayer(scene, 'ly1', -1)).toBe(scene)
  })

  test('ẩn/hiện và khoá/mở khoá', () => {
    let scene = setLayerVisible(base(), 'ly1', false)
    expect(scene.layers[0].visible).toBe(false)
    scene = setLayerLocked(scene, 'ly1', true)
    expect(scene.layers[0].locked).toBe(true)
  })

  test('chỉ xoá được lớp rỗng và giữ order liên tục', () => {
    const { scene } = withItem()
    // ly2 đang có item → bị chặn
    expect(removeLayer(scene, 'ly2')).toBe(scene)

    const next = removeLayer(scene, 'ly3')
    expect(next).not.toBe(scene)
    expect(sortedLayers(next).map((l) => l.order)).toEqual([0, 1, 2])
    expect(next.layers.map((l) => l.id)).not.toContain('ly3')
  })

  test('không xoá lớp cuối cùng', () => {
    let scene = base()
    scene = { ...scene, layers: [scene.layers[0]], items: [] }
    expect(removeLayer(scene, 'ly1')).toBe(scene)
  })
})

describe('item + khoá lớp', () => {
  test('thêm item vào lớp được chọn với id tăng dần', () => {
    const { scene } = withItem()
    expect(itemsOfLayer(scene, 'ly2')).toHaveLength(1)
    expect(scene.items[0].id).toBe('it1')

    const { scene: next, itemId } = addItem(scene, {
      assetId: 'demo-lamp',
      layerId: 'ly2',
      position: [0, 0, 0],
    })
    expect(itemId).toBe('it2')
    expect(next.items).toHaveLength(2)
  })

  test('không thêm item vào lớp đang khoá', () => {
    const locked = setLayerLocked(base(), 'ly2', true)
    const result = addItem(locked, { assetId: 'demo-block', layerId: 'ly2', position: [0, 0, 0] })
    expect(result.scene).toBe(locked)
    expect(result.itemId).toBeUndefined()
  })

  test('layer khoá chặn transform, nhân bản và xoá thật (không chỉ UI)', () => {
    const { scene, itemId } = withItem()
    expect(isItemLocked(scene, itemId)).toBe(false)

    const locked = setLayerLocked(scene, 'ly2', true)
    expect(isItemLocked(locked, itemId)).toBe(true)

    expect(updateItemTransform(locked, itemId, { position: [9, 9, 9] })).toBe(locked)
    expect(duplicateItem(locked, itemId).scene).toBe(locked)
    expect(removeItem(locked, itemId)).toBe(locked)

    // mở khoá → chỉnh lại được
    const unlocked = setLayerLocked(locked, 'ly2', false)
    const moved = updateItemTransform(unlocked, itemId, { position: [3, 0, 4] })
    expect(moved.items[0].position).toEqual([3, 0, 4])
  })

  test('chuyển item sang lớp khác; bị chặn khi lớp đích khoá', () => {
    const { scene, itemId } = withItem()
    const moved = moveItemToLayer(scene, itemId, 'ly3')
    expect(itemsOfLayer(moved, 'ly3')).toHaveLength(1)
    expect(itemsOfLayer(moved, 'ly2')).toHaveLength(0)

    const targetLocked = setLayerLocked(moved, 'ly1', true)
    expect(moveItemToLayer(targetLocked, itemId, 'ly1')).toBe(targetLocked)
  })

  test('nhân bản lệch vị trí một chút để nhìn thấy item mới', () => {
    const { scene, itemId } = withItem()
    const { scene: next, itemId: copyId } = duplicateItem(scene, itemId)
    expect(copyId).toBe('it2')
    expect(next.items[1].position[0]).toBeCloseTo(1.5)
  })
})

describe('liên kết nhiệm vụ', () => {
  test('link/unlink chỉ giữ ID và không nhân đôi', () => {
    let scene = linkTask(base(), 'ly2', 'task-a')
    expect(scene.layers[1].taskIds).toEqual(['task-a'])

    // gọi lại cùng task → không tạo scene mới
    const again = linkTask(scene, 'ly2', 'task-a')
    expect(again).toBe(scene)

    scene = linkTask(scene, 'ly2', 'task-b')
    expect(scene.layers[1].taskIds).toEqual(['task-a', 'task-b'])

    scene = unlinkTask(scene, 'ly2', 'task-a')
    expect(scene.layers[1].taskIds).toEqual(['task-b'])

    // unlink task không tồn tại → không đổi
    expect(unlinkTask(scene, 'ly2', 'task-a')).toBe(scene)
  })
})

describe('exploded view', () => {
  test('offset chỉ để hiển thị: không ghi vào transform item', () => {
    const { scene } = withItem()
    const offsets = explodeOffsets(scene, 1)
    expect(offsets.ly1).toEqual([0, 0, 0])
    expect(offsets.ly4).toEqual([0, 6, 0])
    // transform gốc giữ nguyên
    expect(scene.items[0].position).toEqual([1, 0, 2])
    // hệ số 0 → mọi lớp về 0
    const flat = explodeOffsets(scene, 0)
    expect(Object.values(flat).every((v) => v[1] === 0)).toBe(true)
  })
})
