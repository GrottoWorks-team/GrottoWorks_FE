import { describe, expect, it } from 'vitest'
import { calculateBOM, exportBOMToCsv } from './bom'
import type { GrottoCanvasItem } from './types'

describe('BOM Calculation Engine', () => {
  const mockItems: GrottoCanvasItem[] = [
    {
      instanceId: '1',
      assetId: 'statue-sheep-group',
      name: 'Đàn Chiên Cừu (3 con)',
      category: 'STATUES',
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      rotation: 0,
      zIndex: 1,
      opacity: 1,
      materialReq: {
        materialName: 'Cừu thạch cao sơn trắng',
        quantity: 3,
        unit: 'con',
      },
    },
    {
      instanceId: '2',
      assetId: 'statue-sheep-group',
      name: 'Đàn Chiên Cừu (3 con)',
      category: 'STATUES',
      x: 200,
      y: 100,
      width: 100,
      height: 50,
      rotation: 0,
      zIndex: 2,
      opacity: 1,
      materialReq: {
        materialName: 'Cừu thạch cao sơn trắng',
        quantity: 3,
        unit: 'con',
      },
    },
    {
      instanceId: '3',
      assetId: 'light-star-bethlehem',
      name: 'Ngôi sao Bê-lem phát sáng',
      category: 'LIGHTING',
      x: 300,
      y: 50,
      width: 80,
      height: 80,
      rotation: 0,
      zIndex: 3,
      opacity: 1,
      materialReq: {
        materialName: 'Khung sao Bê-lem gắn đèn LED 1.2m',
        quantity: 1,
        unit: 'bộ',
      },
    },
  ]

  it('tính toán dồn đúng số lượng vật tư cùng tên', () => {
    const bom = calculateBOM(mockItems)

    expect(bom).toHaveLength(2)

    const sheepMaterial = bom.find((b) => b.materialName === 'Cừu thạch cao sơn trắng')
    expect(sheepMaterial).toBeDefined()
    expect(sheepMaterial?.totalQuantity).toBe(6) // 3 + 3
    expect(sheepMaterial?.itemsCount).toBe(2)
    expect(sheepMaterial?.unit).toBe('con')

    const starMaterial = bom.find((b) => b.materialName === 'Khung sao Bê-lem gắn đèn LED 1.2m')
    expect(starMaterial).toBeDefined()
    expect(starMaterial?.totalQuantity).toBe(1)
    expect(starMaterial?.itemsCount).toBe(1)
  })

  it('xử lý an toàn khi danh sách vật thể rỗng', () => {
    const bom = calculateBOM([])
    expect(bom).toEqual([])
  })

  it('xuất file CSV định dạng chuẩn tiếng Việt UTF-8 BOM', () => {
    const bom = calculateBOM(mockItems)
    const csv = exportBOMToCsv(bom, 'Hang Bê-lem Chính')

    // Bắt đầu bằng UTF-8 BOM để Excel hiển thị đúng tiếng Việt có dấu
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('Hang Bê-lem Chính')
    expect(csv).toContain('Tên vật tư')
    expect(csv).toContain('Số lượng')
    expect(csv).toContain('Đơn vị tính')
    expect(csv).toContain('Cừu thạch cao sơn trắng')
    expect(csv).toContain('6')
  })
})
