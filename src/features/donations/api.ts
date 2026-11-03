// Quyên góp — BE Resource `Donation` (API Contract v1.3.2).
//   cam kết vật tư → POST /donations/material-pledges
//   cam kết tiền   → POST /donations/monetary-pledges
//   ghi nhận       → POST /donations/{id}/receipts (số lượng là PHẦN TĂNG của lần này)
//   huỷ            → POST /donations/{id}/cancel
// Donor do BE tự gán theo user đăng nhập (VolunteerDonorResolver).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'
import type { Donation, DonationItem } from '@/types'

export const donationKeys = {
  all: ['donations'] as const,
}

interface MoneyDto { amount: number; currency: string }
interface DonationItemDto {
  id: string; materialId: string; materialCode: string; materialName: string; unit: string
  pledgedQuantity: number; receivedQuantity: number; unusableQuantity: number; usableQuantity: number
  status: string; note?: string | null
}
interface DonationDto {
  id: string; donorId: string; donorName: string; seasonId: string; workAreaId?: string | null
  type: 'MONEY' | 'MATERIAL'
  status: 'PLEDGED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  pledgedAmount?: MoneyDto | null; receivedAmount?: MoneyDto | null
  donationDate: string; items: DonationItemDto[]
  note?: string | null; cancelReason?: string | null; version: number
}
function mapItem(dto: DonationItemDto): DonationItem {
  return {
    id: dto.id,
    materialId: dto.materialId,
    materialCode: dto.materialCode,
    materialName: dto.materialName,
    unit: dto.unit,
    pledgedQuantity: dto.pledgedQuantity,
    receivedQuantity: dto.receivedQuantity,
    unusableQuantity: dto.unusableQuantity,
    usableQuantity: dto.usableQuantity,
    status: dto.status,
    note: dto.note ?? undefined,
  }
}

function mapDonation(dto: DonationDto): Donation {
  return {
    id: dto.id,
    donorId: dto.donorId,
    donorName: dto.donorName,
    seasonId: dto.seasonId,
    workAreaId: dto.workAreaId ?? undefined,
    type: dto.type,
    status: dto.status,
    pledgedAmount: dto.pledgedAmount?.amount,
    receivedAmount: dto.receivedAmount?.amount,
    donationDate: dto.donationDate,
    items: dto.items.map(mapItem),
    note: dto.note ?? undefined,
    cancelReason: dto.cancelReason ?? undefined,
    version: dto.version,
  }
}

export interface DonationQuery {
  status?: string
  type?: string
  workAreaId?: string
  seasonId?: string
  size?: number
}

export function useDonations(params?: DonationQuery) {
  return useQuery({
    queryKey: [...donationKeys.all, params ?? {}],
    queryFn: async () => {
      const q = new URLSearchParams({ size: String(params?.size ?? 100) })
      if (params?.status) q.set('status', params.status)
      if (params?.type) q.set('type', params.type)
      if (params?.workAreaId) q.set('workAreaId', params.workAreaId)
      if (params?.seasonId) q.set('seasonId', params.seasonId)
      const res = await apiPaged<DonationDto>(`/api/v1/donations?${q.toString()}`)
      return res.data.map(mapDonation)
    },
  })
}

function useDonationMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donationKeys.all })
      // Vật tư nhận được có thể đổi tồn kho → làm mới inventory.
      void qc.invalidateQueries({ queryKey: ['materials'] })
    },
  })
}

export interface MaterialPledgeInput {
  workAreaId: string
  materialId: string
  pledgedQuantity: number
  note?: string
}

/** POST /api/v1/donations/material-pledges — cam kết vật tư cho một khu vực. */
export function useCreateMaterialPledge() {
  return useDonationMutation((input: MaterialPledgeInput) =>
    api<DonationDto>('/api/v1/donations/material-pledges', {
      method: 'POST',
      body: JSON.stringify({
        workAreaId: input.workAreaId,
        items: [{ materialId: input.materialId, pledgedQuantity: input.pledgedQuantity }],
        note: input.note || null,
      }),
    }),
  )
}

export interface MonetaryPledgeInput {
  seasonId: string
  workAreaId?: string
  amount: number
  note?: string
}

/** POST /api/v1/donations/monetary-pledges — cam kết tiền cho một mùa. */
export function useCreateMonetaryPledge() {
  return useDonationMutation((input: MonetaryPledgeInput) =>
    api<DonationDto>('/api/v1/donations/monetary-pledges', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  )
}

export interface ReceiptInput {
  donationId: string
  amount?: number
  items?: { donationItemId: string; receivedQuantity: number; unusableQuantity?: number }[]
  note?: string
}

/** POST /api/v1/donations/{id}/receipts — số lượng là phần nhận THÊM của lần này. */
export function useRecordDonationReceipt() {
  return useDonationMutation((input: ReceiptInput) =>
    api<unknown>(`/api/v1/donations/${input.donationId}/receipts`, {
      method: 'POST',
      body: JSON.stringify({
        receivedAmount: input.amount ?? null,
        items: (input.items ?? []).map((item) => ({
          donationItemId: item.donationItemId,
          receivedQuantity: item.receivedQuantity,
          unusableQuantity: item.unusableQuantity ?? 0,
        })),
        note: input.note || null,
      }),
    }),
  )
}

/** POST /api/v1/donations/{id}/cancel — bắt buộc lý do. */
export function useCancelDonation() {
  return useDonationMutation(({ id, reason }: { id: string; reason: string }) =>
    api<DonationDto>(`/api/v1/donations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  )
}