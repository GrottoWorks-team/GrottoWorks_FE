// Chốt hợp đồng 27/11/2026: `GET /purchase-requests/{id}` trả purchases với
// `costOverrun: false` (BE truyền remainingEstimate = null) nên FE phải tự tính
// lại từ estimatedTotal để không mất nút "Duyệt vượt dự toán" và khoá xác nhận.
import { describe, expect, test } from 'vitest'
import { hasCostOverrun, isOverEstimate, isOverrunPending } from './overrun'
import type { PurchaseDto, PurchaseRequestDto } from './api'

const money = (amount: number) => ({ amount, currency: 'VND' as const })

function request(overrides: Partial<PurchaseRequestDto> = {}): PurchaseRequestDto {
  return {
    id: 'req-1',
    workAreaId: 'area-1',
    workAreaName: 'Khu A',
    seasonId: 'season-1',
    requestedBy: 'user-1',
    status: 'PURCHASED',
    items: [
      {
        id: 'item-1',
        materialId: 'mat-1',
        materialCode: 'DA',
        materialName: 'Đá dăm',
        unit: 'khối',
        requestedQuantity: 20,
        estimatedCost: 2_000_000,
        note: null,
        shortageOverrideReason: null,
      },
    ],
    estimatedTotal: money(2_000_000),
    createdAt: '2026-11-27T10:00:00Z',
    version: 1,
    ...overrides,
  }
}

function purchase(overrides: Partial<PurchaseDto> = {}): PurchaseDto {
  return {
    id: 'pur-1',
    purchaseRequestId: 'req-1',
    taskId: 'task-1',
    buyerUserId: 'user-2',
    purchaseDate: '2026-11-27',
    totalCost: money(3_000_000),
    status: 'SUBMITTED',
    costOverrun: false, // BE luôn trả false ở chi tiết — chính là lý do có file này
    costOverrunApprovedBy: null,
    receiptFileIds: [],
    items: [],
    version: 1,
    ...overrides,
  }
}

describe('overrun (BR-32)', () => {
  test('BE báo false nhưng vượt dự toán → FE vẫn nhận ra', () => {
    expect(isOverEstimate(request(), purchase())).toBe(true)
    expect(hasCostOverrun(request(), purchase())).toBe(true)
    expect(isOverrunPending(request(), purchase())).toBe(true)
  })

  test('trong dự toán → không cảnh báo', () => {
    expect(isOverrunPending(request(), purchase({ totalCost: money(1_500_000) }))).toBe(false)
  })

  test('chưa ước tính dòng nào → BE không kiểm, FE cũng không', () => {
    const noEstimate = request({
      items: [{ ...request().items[0], estimatedCost: null }],
      estimatedTotal: money(0),
    })
    expect(isOverEstimate(noEstimate, purchase())).toBe(false)
  })

  test('đã duyệt vượt dự toán → hết chờ', () => {
    expect(isOverrunPending(request(), purchase({ costOverrunApprovedBy: 'leader-1' }))).toBe(false)
  })

  test('lần mua đã xác nhận trước đó ăn vào dự toán còn lại', () => {
    const r = request({
      purchases: [purchase({ id: 'pur-0', status: 'CONFIRMED', totalCost: money(1_800_000) })],
    })
    expect(isOverEstimate(r, purchase({ id: 'pur-1', totalCost: money(300_000) }))).toBe(true)
  })

  test('lần mua đã CONFIRMED thì BE trả null → không bao giờ cảnh báo', () => {
    expect(hasCostOverrun(request(), purchase({ status: 'CONFIRMED', costOverrun: null }))).toBe(false)
  })
})
