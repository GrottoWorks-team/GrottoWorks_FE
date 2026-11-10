// Bản đồ giáo xứ lưu localStorage THEO TỪNG giáo xứ (ADMIN xem nhiều giáo xứ).
// Test: tách dữ liệu giữa 2 giáo xứ + chuyển dữ liệu bản cũ (1 bản đồ dùng chung)
// sang giáo xứ đầu tiên truy cập.
import { beforeEach, describe, expect, it } from 'vitest'
import { mapStore } from './localStore'

const KEY = 'grotto-parish-map-v1'
const P1 = 'parish-1'
const P2 = 'parish-2'

describe('mapStore (per-parish)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ảnh mặt bằng + ghim của mỗi giáo xứ độc lập', () => {
    mapStore.saveMap(P1, { imageKey: 'img-1', fileName: 'p1.png' })
    mapStore.saveMap(P2, { imageKey: 'img-2', fileName: 'p2.png' })
    mapStore.setPin(P1, 'area-1', { x: 0.1, y: 0.2 })
    mapStore.setPin(P2, 'area-1', { x: 0.9, y: 0.8 })

    expect(mapStore.getMap(P1)?.imageKey).toBe('img-1')
    expect(mapStore.getMap(P2)?.imageKey).toBe('img-2')
    expect(mapStore.listPins(P1)).toEqual({ 'area-1': { x: 0.1, y: 0.2 } })
    expect(mapStore.listPins(P2)).toEqual({ 'area-1': { x: 0.9, y: 0.8 } })
  })

  it('bỏ ghim chỉ ảnh hưởng giáo xứ tương ứng', () => {
    mapStore.setPin(P1, 'area-1', { x: 0.1, y: 0.2 })
    mapStore.setPin(P2, 'area-1', { x: 0.9, y: 0.8 })

    mapStore.setPin(P1, 'area-1', null)

    expect(mapStore.listPins(P1)).toEqual({})
    expect(mapStore.listPins(P2)).toEqual({ 'area-1': { x: 0.9, y: 0.8 } })
  })

  it('giữ id ảnh của giáo xứ khi ghi đè ảnh mới', () => {
    const first = mapStore.saveMap(P1, { imageKey: 'img-1' })
    const second = mapStore.saveMap(P1, { imageKey: 'img-2' })
    expect(second.id).toBe(first.id)
    expect(mapStore.getMap(P1)?.imageKey).toBe('img-2')
  })

  it('dữ liệu bản cũ (1 bản đồ dùng chung) được chuyển cho giáo xứ đầu tiên truy cập', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        map: { id: 'pm1', imageKey: 'legacy-img', updatedAt: '2026-11-01T00:00:00Z' },
        pins: { 'area-9': { x: 0.5, y: 0.5 } },
      }),
    )

    expect(mapStore.getMap(P1)?.imageKey).toBe('legacy-img')
    expect(mapStore.listPins(P1)).toEqual({ 'area-9': { x: 0.5, y: 0.5 } })
    // Giáo xứ khác không nhận dữ liệu legacy.
    expect(mapStore.getMap(P2)).toBeUndefined()
    expect(mapStore.listPins(P2)).toEqual({})
  })

  it('parishId rỗng không đọc/ghi gì (tránh dính dữ liệu giáo xứ khác)', () => {
    expect(mapStore.getMap('')).toBeUndefined()
    expect(mapStore.listPins('')).toEqual({})
    expect(mapStore.setPin('', 'area-1', { x: 0.2, y: 0.3 })).toEqual({})
  })
})
