import { beforeEach, describe, expect, test } from 'vitest'
import {
  findSceneDesign,
  isSceneFileKey,
  sceneFileKey,
  syncSceneDesign,
} from './designLink'
import { addItem, createScene } from './scene'
import { designStore } from '@/features/designs/localStore'

function scene(name = 'Hang đá') {
  const base = createScene({
    id: 'scene-area-1',
    workAreaId: 'area-1',
    name,
    layerNames: ['Nền móng', 'Kết cấu'],
    createdAt: '2026-10-22T00:00:00.000Z',
  })
  return addItem(base, { assetId: 'demo-block', layerId: 'ly1', position: [0, 0, 0] }).scene
}

describe('designLink', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  test('isSceneFileKey nhận đúng tiền tố scene:', () => {
    expect(isSceneFileKey(sceneFileKey('area-1'))).toBe(true)
    expect(isSceneFileKey('blob-abc')).toBe(false)
    expect(isSceneFileKey(undefined)).toBe(false)
  })

  test('lần lưu đầu tạo hồ sơ Design THREE_D + version trỏ tới scene', () => {
    const { designId, versionId } = syncSceneDesign({
      areaId: 'area-1',
      scene: scene(),
      userId: 'u1',
      title: 'Khu vực #66666666',
    })

    const design = designStore.listDesigns().find((d) => d.id === designId)!
    expect(design.designType).toBe('THREE_D')
    expect(design.title).toBe('Khu vực #66666666')
    expect(design.areaId).toBe('area-1')
    expect(design.currentVersionId).toBe(versionId)

    const version = designStore.listVersions().find((v) => v.id === versionId)!
    expect(version.fileKey).toBe(sceneFileKey('area-1'))
    expect(version.versionNumber).toBe(1)
    expect(version.status).toBe('DRAFT')
    expect(version.mimeType).toBe('application/json')
    expect(version.fileSize).toBeGreaterThan(0)

    expect(findSceneDesign('area-1')?.id).toBe(designId)
  })

  test('lưu lại không tạo hồ sơ/phiên bản trùng, chỉ cập nhật', () => {
    const first = syncSceneDesign({ areaId: 'area-1', scene: scene(), userId: 'u1' })
    const second = syncSceneDesign({
      areaId: 'area-1',
      scene: scene('Hang đá mới'),
      userId: 'u1',
      title: 'Hang đá mới',
    })

    expect(second.designId).toBe(first.designId)
    expect(second.versionId).toBe(first.versionId)
    expect(designStore.listDesigns()).toHaveLength(1)
    expect(designStore.listVersions()).toHaveLength(1)
    expect(designStore.listDesigns()[0].title).toBe('Hang đá mới')
  })

  test('khu vực khác tạo hồ sơ riêng', () => {
    syncSceneDesign({ areaId: 'area-1', scene: scene(), userId: 'u1' })
    syncSceneDesign({
      areaId: 'area-2',
      scene: createScene({
        id: 'scene-area-2',
        workAreaId: 'area-2',
        name: 'Sân nhà thờ',
        layerNames: ['Nền móng'],
      }),
      userId: 'u1',
    })
    expect(designStore.listDesigns()).toHaveLength(2)
    expect(findSceneDesign('area-2')?.title).toBe('Sân nhà thờ')
  })
})
