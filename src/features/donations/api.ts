// Donations domain — query key ['donations']. BE CHƯA có domain này (path legacy
// `/donations`); KHÔNG còn gọi chéo sang /api/v1/materials để cộng tồn kho vì
// endpoint/field đó không tồn tại.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { materialKeys } from '@/features/materials/api'
import type { Donation } from '@/types'

export const donationKeys = { all: ['donations'] as const }

export function useDonations() {
  return useQuery({
    queryKey: donationKeys.all,
    queryFn: () => api<Donation[]>('/donations'),
  })
}

function useDonationMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donationKeys.all })
      void qc.invalidateQueries({ queryKey: materialKeys.all })
    },
  })
}

// Tạo cam kết (status PLEDGED).
// LƯU Ý: BE CHƯA có domain Donation. Code cũ còn gọi GET /api/v1/materials/{id}
// + PATCH `{ donatedPledged }` để đồng bộ tồn kho, nhưng endpoint GET đó không
// tồn tại (405) và `donatedPledged` không có trên MaterialDto → đã bỏ. Khi BE
// bổ sung donation phải có API nhập kho riêng (xem BE-gap-requests-field-audit).
export function useCreateDonation() {
  return useDonationMutation((data: Omit<Donation, 'id' | 'receivedQty'>) =>
    api<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  )
}

// PATCH chung — CANCELED/UNUSABLE chỉ đổi status, không đụng material.
export function useUpdateDonation() {
  return useDonationMutation(
    ({ id, ...data }: Partial<Omit<Donation, 'id'>> & { id: string }) =>
      api<Donation>(`/donations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

// Ghi nhận số đã nhận (TỔNG mới, không phải phần tăng) cho 1 donation.
// Status tự suy: 0 → PLEDGED; < promisedQty → RECEIVED_PARTIAL; còn lại
// RECEIVED_FULL. Không tự cộng donatedReceived vào material nữa — BE chưa có
// endpoint/field đó (xem BE-gap-requests-field-audit-2026-10-29.md).
export function useRecordReception(donationId: string) {
  return useDonationMutation(async (receivedQty: number) => {
    const donation = await api<Donation>(`/donations/${donationId}`)
    const promisedQty = donation.promisedQty ?? 0
    const status: Donation['status'] =
      receivedQty === 0
        ? 'PLEDGED'
        : promisedQty && receivedQty < promisedQty
          ? 'RECEIVED_PARTIAL'
          : 'RECEIVED_FULL'
    return api<Donation>(`/donations/${donationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ receivedQty, status }),
    })
  })
}
