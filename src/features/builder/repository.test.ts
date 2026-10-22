import { beforeEach, describe, expect, test } from 'vitest'
import { LocalSceneRepository, SCENE_STORAGE_PREFIX } from './repository'
import { addItem, createScene, linkTask } from './scene'

function demoScene() {
  const base = createScene({
    id: 'scene-1',
    workAreaId: 'area-1',
    name: 'Hang đá',
    layerNames: ['Nền móng', 'Kết cấu'],
    createdAt: '2026-10-22T00:00:00.000Z',
  })
  const { scene } = addItem(base, {
    assetId: 'demo-block',
    layerId: 'ly1',
    position: [0, 0, 0],
  })
  return linkTask(scene, 'ly2', 'task-a')
}

describe('LocalSceneRepository', () => {
  const repo = new LocalSceneRepository(window.localStorage)

  beforeEach(() => {
    window.localStorage.clear()
  })

  test('chưa lưu gì → load trả null', async () => {
    expect(await repo.load('area-x')).toBeNull()
  })

  test('save rồi load giữ nguyên item, layer và taskIds', async () => {
    const saved = await repo.save(demoScene())
    expect(saved.updatedAt).not.toBe('2026-10-22T00:00:00.000Z')

    const loaded = await repo.load('area-1')
    expect(loaded).not.toBeNull()
    expect(loaded!.items).toHaveLength(1)
    expect(loaded!.layers[1].taskIds).toEqual(['task-a'])
    expect(window.localStorage.getItem(`${SCENE_STORAGE_PREFIX}:area-1`)).toBeTruthy()
  })

  test('dữ liệu hỏng trong localStorage → coi như chưa có scene', async () => {
    window.localStorage.setItem(`${SCENE_STORAGE_PREFIX}:area-1`, '{broken')
    expect(await repo.load('area-1')).toBeNull()
  })

  test('clear xoá scene của đúng work area', async () => {
    await repo.save(demoScene())
    await repo.clear('area-1')
    expect(await repo.load('area-1')).toBeNull()
  })
})
