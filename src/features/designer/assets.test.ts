import { describe, expect, it } from 'vitest'
import { GROTTO_ASSETS, getAssetsByCategory, getAssetById } from './assets'
import type { GrottoAssetCategory } from './types'

describe('2D Grotto Assets Library', () => {
  it('chứa đủ 16 cấu kiện chuẩn Giáng sinh', () => {
    expect(GROTTO_ASSETS).toHaveLength(16)
  })

  it('mỗi cấu kiện có assetId duy nhất và thông tin đầy đủ', () => {
    const ids = new Set<string>()
    const validCategories: GrottoAssetCategory[] = ['ROCKS', 'STATUES', 'LIGHTING', 'DECORATION']

    for (const asset of GROTTO_ASSETS) {
      expect(ids.has(asset.assetId)).toBe(false)
      ids.add(asset.assetId)

      expect(asset.name.trim().length).toBeGreaterThan(0)
      expect(validCategories).toContain(asset.category)
      expect(asset.defaultWidth).toBeGreaterThan(0)
      expect(asset.defaultHeight).toBeGreaterThan(0)
      expect(asset.svgMarkup).toContain('<svg')
      expect(asset.materialReq.materialName.trim().length).toBeGreaterThan(0)
      expect(asset.materialReq.defaultQty).toBeGreaterThan(0)
      expect(asset.materialReq.unit.trim().length).toBeGreaterThan(0)
    }
  })

  it('hỗ trợ tìm kiếm theo danh mục thông qua getAssetsByCategory', () => {
    const rocks = getAssetsByCategory('ROCKS')
    const statues = getAssetsByCategory('STATUES')
    const lighting = getAssetsByCategory('LIGHTING')
    const deco = getAssetsByCategory('DECORATION')

    expect(rocks.length).toBe(4)
    expect(statues.length).toBe(5)
    expect(lighting.length).toBe(4)
    expect(deco.length).toBe(3)
    expect(rocks.length + statues.length + lighting.length + deco.length).toBe(16)
  })

  it('hỗ trợ tra cứu nhanh cấu kiện theo id qua getAssetById', () => {
    const star = getAssetById('light-star-bethlehem')
    expect(star).toBeDefined()
    expect(star?.name).toContain('Ngôi sao Bê-lem')
    expect(star?.category).toBe('LIGHTING')

    const notFound = getAssetById('non-existent-id')
    expect(notFound).toBeUndefined()
  })
})
