// Vị trí gắn kèm của một yêu cầu review — hỗ trợ cả 2D (ảnh) và 3D (model).
//
// QUAN TRỌNG: không lưu toạ độ theo pixel màn hình.
// - IMAGE_2D: toạ độ CHUẨN HOÁ 0..1 theo ảnh gốc (xem coords.ts).
// - MODEL_3D: toạ độ trong hệ toạ độ của model (world coords của gltf.scene
//   root, gắn với một phiên bản thiết kế cụ thể). Không tự chuyển toạ độ sang
//   phiên bản mới vì hình học có thể đã thay đổi.
import type { NormalizedPoint } from './coords'

/** Toạ độ 3D trong hệ toạ độ model. */
export interface ModelPoint {
  x: number
  y: number
  z: number
}

/** Union vị trí dùng chung cho canvas 2D/3D và form comment. */
export type ReviewPoint =
  | { type: 'IMAGE_2D'; point: NormalizedPoint }
  | { type: 'MODEL_3D'; point: ModelPoint }

/** Chuỗi hiển thị gọn của một vị trí (dùng trong form/ danh sách). */
export function formatReviewPoint(p: ReviewPoint): string {
  if (p.type === 'IMAGE_2D') return `${p.point.x.toFixed(2)}, ${p.point.y.toFixed(2)}`
  return `${p.point.x.toFixed(2)}, ${p.point.y.toFixed(2)}, ${p.point.z.toFixed(2)}`
}
