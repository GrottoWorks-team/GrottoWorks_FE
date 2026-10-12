// Chuyển đổi toạ độ chuột → toạ độ CHUẨN HOÁ 0..1 theo khung ảnh.
//
// QUAN TRỌNG: không lưu toạ độ marker bằng pixel màn hình. Marker lưu theo
// tỉ lệ của ảnh gốc nên vẫn đúng khi zoom, resize hoặc mở trên thiết bị khác.
// Hàm này nhận rect ĐÃ biến đổi (getBoundingClientRect sau transform) — lấy
// hiệu rồi chia cho kích thước đã biến đổi sẽ luôn ra đúng tỉ lệ.

export interface NormalizedPoint {
  x: number
  y: number
}

export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/** Chuẩn hoá một điểm trong khung; luôn kẹp trong [0, 1]. */
export function toNormalizedPoint(rect: RectLike, clientX: number, clientY: number): NormalizedPoint {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 }
  return {
    x: clamp01((clientX - rect.left) / rect.width),
    y: clamp01((clientY - rect.top) / rect.height),
  }
}

/** Quy đổi ngược 0..1 → phần trăm để đặt marker bằng CSS. */
export function toPercent(point: NormalizedPoint): { left: string; top: string } {
  return { left: `${clamp01(point.x) * 100}%`, top: `${clamp01(point.y) * 100}%` }
}
