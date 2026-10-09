// Donations domain — query key ['donations']. Ghi nhận quyên góp đồng bộ
// material.donatedReceived theo delta (pattern 2 bước như useApproveReg/
// useCreatePurchaseRecord); huỷ/không dùng được chỉ PATCH status, không đụng
// material (theo brief).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { materialKeys } from '@/features/materials/api'
import type { Donation, Material } from '@/types'

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

// Tạo cam kết (status PLEDGED). Cam kết vật tư → đồng bộ donatedPledged
// (GET material rồi PATCH tổng mới — handler tính lại status INCOMING).
export function useCreateDonation() {
  return useDonationMutation(async (data: Omit<Donation, 'id' | 'receivedQty'>) => {
    const donation = await api<Donation>('/donations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (donation.materialId && donation.promisedQty) {
      const m = await api<Material>(`/materials/${donation.materialId}`)
      await api<Material>(`/materials/${donation.materialId}`, {
        method: 'PATCH',
        body: JSON.stringify({ donatedPledged: m.donatedPledged + donation.promisedQty }),
      })
    }
    return donation
  })
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
// RECEIVED_FULL. donatedReceived cộng delta so với lần ghi trước (ghi lại
// không đếm trùng). ponytail: ghi lại số NHỎ hơn không giảm donatedReceived
// — demo không có luồng trả lại vật tư.
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
    const patched = await api<Donation>(`/donations/${donationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ receivedQty, status }),
    })
    const delta = receivedQty - (donation.receivedQty ?? 0)
    if (donation.materialId && delta > 0) {
      const m = await api<Material>(`/materials/${donation.materialId}`)
      await api<Material>(`/materials/${donation.materialId}`, {
        method: 'PATCH',
        body: JSON.stringify({ donatedReceived: m.donatedReceived + delta }),
      })
    }
    return patched
  })
}
