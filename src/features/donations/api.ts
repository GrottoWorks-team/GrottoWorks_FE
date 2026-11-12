// Donations domain — DonationDto & DonorDto (Resource Service /api/v1/donations)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  Donation,
  DonationType,
  DonationStatus,
  ContributionNeedDto,
  UpdateDonorRequest,
  RecordDonationReceiptRequest,
} from '@/types'

export interface DonationFilterParams {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  donorId?: string
  type?: DonationType
  status?: DonationStatus
}

export interface DonorDto {
  id: string
  parishId: string
  userId?: string | null
  donorName: string
  phone?: string | null
  email?: string | null
  address?: string | null
  note?: string | null
  createdAt: string
  updatedAt?: string | null
  version: number
}

export interface CreateDonorPayload {
  donorName: string
  phone?: string
  email?: string
  address?: string
  note?: string
}

export interface ReceivedMaterialInput {
  materialId: string
  receivedQuantity: number
  unusableQuantity?: number
  note?: string
}

export interface CreateDonationPayload {
  donorId: string
  type: DonationType
  seasonId?: string
  workAreaId?: string
  amount?: number
  items?: ReceivedMaterialInput[]
  receivedAt?: string
  note?: string
}

export const donationKeys = {
  all: ['donations'] as const,
  list: (filter?: DonationFilterParams) => ['donations', 'list', filter] as const,
  detail: (id: string) => ['donations', 'detail', id] as const,
}

export const donorKeys = {
  all: ['donors'] as const,
  list: (params?: { q?: string; page?: number; size?: number }) => ['donors', 'list', params] as const,
}

export function useDonations(filter?: DonationFilterParams) {
  return useQuery({
    queryKey: donationKeys.list(filter),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filter?.page) sp.set('page', String(filter.page))
      if (filter?.size) sp.set('size', String(filter.size))
      if (filter?.seasonId) sp.set('seasonId', filter.seasonId)
      if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
      if (filter?.donorId) sp.set('donorId', filter.donorId)
      if (filter?.type) sp.set('type', filter.type)
      if (filter?.status) sp.set('status', filter.status)
      const qs = sp.toString()
      const res = await api<{ data?: Donation[] } | Donation[]>(
        `/api/v1/donations${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useDonation(donationId?: string) {
  return useQuery({
    queryKey: donationKeys.detail(donationId ?? ''),
    queryFn: () => api<Donation>(`/api/v1/donations/${donationId}`),
    enabled: !!donationId,
  })
}

export function useDonors(params?: { q?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: donorKeys.list(params),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params?.q) sp.set('q', params.q)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.size) sp.set('size', String(params.size))
      const qs = sp.toString()
      const res = await api<{ data?: DonorDto[] } | DonorDto[]>(
        `/api/v1/donors${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useCreateDirectDonation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateDonationPayload) =>
      api<Donation>('/api/v1/donations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donationKeys.all })
    },
  })
}

export function useCancelDonation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ donationId, reason }: { donationId: string; reason: string }) =>
      api<Donation>(`/api/v1/donations/${donationId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donationKeys.all })
    },
  })
}

export interface ContributionNeedFilterParams {
  page?: number
  size?: number
  workAreaId?: string
  materialId?: string
}

/** GET /api/v1/seasons/{id}/contribution-needs (mọi role) */
export async function getContributionNeeds(
  seasonId: string,
  filter?: ContributionNeedFilterParams,
): Promise<ContributionNeedDto[]> {
  const sp = new URLSearchParams()
  if (filter?.page) sp.set('page', String(filter.page))
  if (filter?.size) sp.set('size', String(filter.size))
  if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
  if (filter?.materialId) sp.set('materialId', filter.materialId)
  const qs = sp.toString()
  const res = await api<any>(`/api/v1/seasons/${seasonId}/contribution-needs${qs ? `?${qs}` : ''}`)
  if (Array.isArray(res)) return res
  return res.data ?? []
}

export function useContributionNeeds(
  seasonId?: string,
  filter?: ContributionNeedFilterParams,
) {
  return useQuery({
    queryKey: ['contribution-needs', seasonId, filter],
    queryFn: () => getContributionNeeds(seasonId!, filter),
    enabled: Boolean(seasonId),
  })
}

// ══════ [fe-api-gap-2] Cập nhật Donor & Ghi nhận Receipt (Đợt I) ══════

/** Cập nhật thông tin nhà hảo tâm (PATCH /api/v1/donors/{id}) */
export async function updateDonor(
  donorId: string,
  payload: UpdateDonorRequest,
  version?: number,
): Promise<DonorDto> {
  const headers: Record<string, string> = {}
  if (version !== undefined) {
    headers['If-Match'] = `"${version}"`
  }
  return api<DonorDto>(`/api/v1/donors/${donorId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })
}

/** Ghi nhận tiếp nhận thực tế cho cam kết quyên góp (POST /api/v1/donations/{id}/receipts) */
export async function recordDonationReceipt(
  donationId: string,
  payload: RecordDonationReceiptRequest,
): Promise<void> {
  await api(`/api/v1/donations/${donationId}/receipts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function useUpdateDonor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      donorId,
      payload,
      version,
    }: {
      donorId: string
      payload: UpdateDonorRequest
      version?: number
    }) => updateDonor(donorId, payload, version),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donorKeys.all })
    },
  })
}

export function useRecordDonationReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      donationId,
      payload,
    }: {
      donationId: string
      payload: RecordDonationReceiptRequest
    }) => recordDonationReceipt(donationId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: donationKeys.all })
    },
  })
}
