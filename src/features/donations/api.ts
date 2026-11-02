// Donations domain — DonationDto & DonorDto (Resource Service /api/v1/donations)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Donation, DonationType, DonationStatus } from '@/types'

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
