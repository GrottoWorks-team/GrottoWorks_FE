// BR-32 (vượt dự toán) — BE tính cờ `costOverrun` từ "phần dự toán còn lại" của
// đề nghị mua. Nhưng `GET /purchase-requests/{id}` nhúng các lần mua với
// remainingEstimate = null ⇒ BE luôn trả `costOverrun: false`, nên nút "Duyệt
// vượt dự toán" không bao giờ hiện và MO không thấy lý do bị chặn.
// Trước khi BE sửa response, FE tự đối chiếu bằng dữ liệu đã có trong cùng payload:
// tổng tiền các lần mua (trừ lần đang xét, chỉ tính lần đã xác nhận) so với
// `estimatedTotal`. Công thức y hệt PurchaseBudget.Remaining bên BE.
import type { PurchaseDto, PurchaseRequestDto } from './api'

export function isOverEstimate(request: PurchaseRequestDto, purchase: PurchaseDto): boolean {
  // Chưa có dòng nào ước tính ⇒ BE không kiểm vượt dự toán (HasEstimate = false).
  if (!request.items?.some((item) => item.estimatedCost != null)) return false
  const confirmedElsewhere = (request.purchases ?? [])
    .filter((other) => other.id !== purchase.id && other.status === 'CONFIRMED')
    .reduce((sum, other) => sum + other.totalCost.amount, 0)
  const remaining = (request.estimatedTotal?.amount ?? 0) - confirmedElsewhere
  return purchase.totalCost.amount > remaining
}

/** Cờ hiệu lực để hiện cảnh báo / khoá nút: BE báo vượt, hoặc FE tự tính ra vượt. */
export function hasCostOverrun(request: PurchaseRequestDto, purchase: PurchaseDto): boolean {
  if (purchase.status === 'CONFIRMED') return false
  return purchase.costOverrun === true || isOverEstimate(request, purchase)
}

export function isOverrunPending(request: PurchaseRequestDto, purchase: PurchaseDto): boolean {
  return hasCostOverrun(request, purchase) && !purchase.costOverrunApprovedBy
}
