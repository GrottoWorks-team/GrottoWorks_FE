// Purchases domain — purchaseRequests (đề nghị mua) + purchaseRecords
// (hồ sơ mua/giao hàng). Query key ['purchaseRecords'] giữ nguyên từ Task 6.
// useCreatePurchaseRecord: mock KHÔNG tính material từ record (refreshMaterial
// chỉ chạy trên PATCH/POST materials) → mutation tự PATCH material.purchased
// += qty, handler suy ra received/status (pattern 2 bước như useApproveReg).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { materialKeys } from '@/features/materials/api'
import type { Material, PurchaseRecord, PurchaseRequest } from '@/types'

export const purchaseRequestKeys = { all: ['purchaseRequests'] as const }
export const purchaseRecordKeys = { all: ['purchaseRecords'] as const }

export function usePurchaseRequests() {
  return useQuery({
    queryKey: purchaseRequestKeys.all,
    queryFn: () => api<PurchaseRequest[]>('/purchaseRequests'),
  })
}

export function usePurchaseRecords() {
  return useQuery({
    queryKey: purchaseRecordKeys.all,
    queryFn: () => api<PurchaseRecord[]>('/purchaseRecords'),
  })
}

const patchRequest = (id: string, patch: Partial<PurchaseRequest>) =>
  api<PurchaseRequest>(`/purchaseRequests/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

// Invalidate cả 3 key: request đổi status, record/material đổi sau giao hàng.
function usePurchaseMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: purchaseRequestKeys.all })
      void qc.invalidateQueries({ queryKey: purchaseRecordKeys.all })
      void qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

// createdBy optional: mock POST persist body nguyên dạng — thiếu key thì
// request không có createdBy và bảng hiển thị '—' (fallback userName).
export function useCreatePurchaseRequest() {
  return usePurchaseMutation((data: Omit<PurchaseRequest, 'id' | 'createdBy'> & { createdBy?: string }) =>
    api<PurchaseRequest>('/purchaseRequests', { method: 'POST', body: JSON.stringify(data) }),
  )
}

// DRAFT → PENDING: gửi duyệt committee.
export function useSendForApproval() {
  return usePurchaseMutation((id: string) => patchRequest(id, { status: 'PENDING' }))
}

export function useApproveRequest() {
  return usePurchaseMutation((id: string) => patchRequest(id, { status: 'APPROVED' }))
}

// Từ chối kèm lý do — ghi vào rejectReason riêng, note gốc giữ nguyên.
export function useRejectRequest() {
  return usePurchaseMutation(({ id, reason }: { id: string; reason: string }) =>
    patchRequest(id, { status: 'REJECTED', rejectReason: reason }),
  )
}

export interface NewPurchaseRecord {
  requestId: string
  materialId: string
  qty: number
  cost: number
  supplier: string
  date: string
  receiptPhoto?: string
  confirmed: boolean
  buyerId: string
}

// Tạo hồ sơ giao hàng + cộng purchased (→ received tăng qty, handler tính lại
// status). purchased lấy từ GET mới nhất rồi PATCH cả giá trị mới (shallow
// merge không tự cộng được).
export function useCreatePurchaseRecord() {
  return usePurchaseMutation(async (vars: NewPurchaseRecord) => {
    const record = await api<PurchaseRecord>('/purchaseRecords', {
      method: 'POST',
      body: JSON.stringify(vars),
    })
    const m = await api<Material>(`/materials/${vars.materialId}`)
    await api<Material>(`/materials/${vars.materialId}`, {
      method: 'PATCH',
      body: JSON.stringify({ purchased: m.purchased + vars.qty }),
    })
    return record
  })
}

// Xác nhận hồ sơ đã giao: PATCH confirmed=true.
export function useConfirmPurchase() {
  return usePurchaseMutation((recordId: string) =>
    api<PurchaseRecord>(`/purchaseRecords/${recordId}`, {
      method: 'PATCH',
      body: JSON.stringify({ confirmed: true }),
    }),
  )
}
