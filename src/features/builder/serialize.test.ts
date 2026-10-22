import { describe, expect, test } from 'vitest'
import { deserializeScene, SceneFormatError, serializeScene } from './serialize'
import { addItem, createScene, linkTask } from './scene'
import type { ConstructionScene } from './types'

function demoScene(): ConstructionScene {
  const base = createScene({
    id: 'scene-1',
    workAreaId: 'area-1',
    name: 'Hang đá',
    layerNames: ['Nền móng', 'Kết cấu'],
    createdAt: '2026-10-22T00:00:00.000Z',
  })
  const { scene } = addItem(base, {
    assetId: 'demo-block',
    layerId: 'ly2',
    position: [1.23456, 0, -2],
    rotation: [0, 0.5, 0],
  })
  return linkTask(scene, 'ly2', 'task-a')
}

describe('serialize/deserialize', () => {
  test('round-trip giữ layer, item, transform và taskIds', () => {
    const scene = demoScene()
    const restored = deserializeScene(serializeScene(scene))

    expect(restored.layers.map((l) => l.name)).toEqual(['Nền móng', 'Kết cấu'])
    expect(restored.layers[1].taskIds).toEqual(['task-a'])
    expect(restored.items).toHaveLength(1)
    expect(restored.items[0]).toMatchObject({
      assetId: 'demo-block',
      layerId: 'ly2',
      position: [1.235, 0, -2],
      rotation: [0, 0.5, 0],
      scale: [1, 1, 1],
    })
    expect(restored.workAreaId).toBe('area-1')
  })

  test('giữ schemaVersion hiện tại', () => {
    const scene = demoScene()
    const restored = deserializeScene(serializeScene({ ...scene, schemaVersion: 1 }))
    expect(restored.schemaVersion).toBe(1)
  })

  test('từ chối JSON hỏng', () => {
    expect(() => deserializeScene('{not json')).toThrow(SceneFormatError)
  })

  test('từ chối schemaVersion lạ', () => {
    const raw = JSON.stringify({ ...demoScene(), schemaVersion: 99 })
    expect(() => deserializeScene(raw)).toThrow(/schemaVersion/)
  })

  test('từ chối item trỏ tới layer không tồn tại', () => {
    const scene = demoScene()
    const broken = {
      ...scene,
      items: [{ ...scene.items[0], layerId: 'ly-missing' }],
    }
    expect(() => deserializeScene(JSON.stringify(broken))).toThrow(/layer không tồn tại/)
  })

  test('từ chối toạ độ không phải số hữu hạn', () => {
    const scene = demoScene()
    const broken = { ...scene, items: [{ ...scene.items[0], position: [0, null, 0] }] }
    expect(() => deserializeScene(JSON.stringify(broken))).toThrow(SceneFormatError)
  })

  test('từ chối scene không có layer', () => {
    const scene = demoScene()
    const broken = { ...scene, layers: [], items: [] }
    expect(() => deserializeScene(JSON.stringify(broken))).toThrow(SceneFormatError)
  })
})
