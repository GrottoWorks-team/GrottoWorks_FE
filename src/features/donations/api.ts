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
  updatedAt?: string | null
  receipts?: DonationReceiptDto[] | null
}
interface DonationReceiptItemDto {
  id: string; donationItemId: string; materialId: string
  receivedQuantity: number; unusableQuantity: number; usableQuantity: number
}
interface DonationReceiptDto {
  id: string; receivedAt: string; receivedBy: string
  receivedAmount?: MoneyDto | null; note?: string | null; items: DonationReceiptItemDto[]
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

/** GET /api/v1/donations/{donationId} — chi tiết một lần quyên góp. */
export function useDonation(donationId?: string) {
  return useQuery({
    queryKey: [...donationKeys.all, 'detail', donationId ?? ''],
    queryFn: async () => {
      const res = await api<DonationDto | { data?: DonationDto }>(
        `/api/v1/donations/${donationId}`,
      )
      const dto = 'data' in res && res.data ? res.data : (res as DonationDto)
      return mapDonation(dto)
    },
    enabled: Boolean(donationId),
  })
}

export interface ContributionNeedDto {
  kind: string
  workAreaId: string
  workAreaName: string
  materialId: string
  materialCode: string
  materialName: string
  unit: string
  required: number
  shortage: number
  pledgedOutstanding: number
  remainingNeed: number
}

/** GET /api/v1/seasons/{seasonId}/contribution-needs — vật tư còn thiếu cần quyên góp. */
export function useContributionNeeds(seasonId?: string) {
  return useQuery({
    queryKey: [...donationKeys.all, 'needs', seasonId ?? ''],
    queryFn: async () => {
      const res = await apiPaged<ContributionNeedDto>(
        `/api/v1/seasons/${seasonId}/contribution-needs?size=50`,
      )
      return res.data
    },
    enabled: Boolean(seasonId),
  })
}

export interface ReceiptLineRow {
  id: string
  materialId: string
  receivedQuantity: number
  unusableQuantity: number
  usableQuantity: number
}

export interface ReceiptRow {
  id: string
  receivedAt: string
  amount?: number | null
  note?: string | null
  items: ReceiptLineRow[]
}

/** GET /api/v1/donations/{id} — chỉ getDonation trả `receipts`, dùng để điều chỉnh phiếu đã ghi. */
export function useDonationReceipts(donationId?: string) {
  return useQuery({
    queryKey: [...donationKeys.all, 'receipts', donationId ?? ''],
    queryFn: async () => {
      const dto = await api<DonationDto>(`/api/v1/donations/${donationId}`)
      return {
        version: dto.version,
        receipts: (dto.receipts ?? []).map<ReceiptRow>((receipt) => ({
          id: receipt.id,
          receivedAt: receipt.receivedAt,
          amount: receipt.receivedAmount?.amount ?? null,
          note: receipt.note ?? null,
          items: receipt.items.map((item) => ({
            id: item.id,
            materialId: item.materialId,
            receivedQuantity: item.receivedQuantity,
            unusableQuantity: item.unusableQuantity,
            usableQuantity: item.usableQuantity,
          })),
        })),
      }
    },
    enabled: Boolean(donationId),
  })
}

export interface AdjustReceiptInput {
  donationId: string
  receiptId: string
  version?: number
  reason: string
  /** MONEY: số tiền đã nhận sau điều chỉnh. */
  receivedAmount?: number
  /** MATERIAL: số lượng đúng của từng dòng phiếu. */
  items?: { donationReceiptItemId: string; receivedQuantity: number; unusableQuantity?: number }[]
}

/** PATCH /api/v1/donations/{id} — MO điều chỉnh số liệu một phiếu đã ghi nhận (kèm lý do). */
export function useAdjustDonationReceipt() {
  return useDonationMutation((input: AdjustReceiptInput) =>
    api<DonationDto>(`/api/v1/donations/${input.donationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        version: input.version ?? null,
        receiptId: input.receiptId,
        receivedAmount: input.receivedAmount ?? null,
        items: (input.items ?? []).map((item) => ({
          donationReceiptItemId: item.donationReceiptItemId,
          receivedQuantity: item.receivedQuantity,
          unusableQuantity: item.unusableQuantity ?? 0,
        })),
        reason: input.reason,
      }),
    }),
  )
}