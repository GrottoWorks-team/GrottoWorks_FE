// Toạ độ marker 2D: đây là logic dễ sai nhất (lệch khi zoom/resize), nên test
// trực tiếp thay vì qua DOM.
import { describe, expect, it } from 'vitest'
import { toNormalizedPoint, toPercent } from './coords'

const rect = { left: 100, top: 50, width: 400, height: 200 }

describe('toNormalizedPoint', () => {
  it('tâm khung → (0.5, 0.5)', () => {
    expect(toNormalizedPoint(rect, 300, 150)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('góc trên-trái → (0, 0) và góc dưới-phải → (1, 1)', () => {
    expect(toNormalizedPoint(rect, 100, 50)).toEqual({ x: 0, y: 0 })
    expect(toNormalizedPoint(rect, 500, 250)).toEqual({ x: 1, y: 1 })
  })

  it('điểm ngoài khung bị kẹp trong [0, 1] (không có toạ độ âm / > 1)', () => {
    expect(toNormalizedPoint(rect, 0, 0)).toEqual({ x: 0, y: 0 })
    expect(toNormalizedPoint(rect, 9999, 9999)).toEqual({ x: 1, y: 1 })
  })

  it('vẫn đúng khi ảnh đã bị transform (dùng rect ĐÃ biến đổi)', () => {
    // Cùng điểm tương đối trên ảnh ở 2 mức zoom khác nhau → cùng toạ độ.
    const zoomed = { left: -200, top: -100, width: 1600, height: 800 }
    expect(toNormalizedPoint(zoomed, 600, 300)).toEqual({ x: 0.5, y: 0.5 })
  })

  it('khung rộng/cao bằng 0 → (0, 0), không chia cho 0', () => {
    expect(toNormalizedPoint({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({
      x: 0,
      y: 0,
    })
  })
})

describe('toPercent', () => {
  it('quy đổi 0..1 → % để đặt marker bằng CSS', () => {
    expect(toPercent({ x: 0.25, y: 1 })).toEqual({ left: '25%', top: '100%' })
  })

  it('kẹp giá trị ngoài khoảng', () => {
    expect(toPercent({ x: -3, y: 7 })).toEqual({ left: '0%', top: '100%' })
  })
})
