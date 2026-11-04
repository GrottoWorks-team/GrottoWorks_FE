// Nhà tài trợ — BE Resource `/api/v1/donors` (MO, ADMIN):
//   GET   /api/v1/donors?q=&page=&size=   (paged)
//   POST  /api/v1/donors                  { donorName, phone, email, address, note }
//   PATCH /api/v1/donors/{donorId}        { version, donorName, phone, email, address, note }
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiPaged } from '@/lib/api'

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

export interface DonorInput {
  donorName: string
  phone?: string | null
  email?: string | null
  address?: string | null
  note?: string | null
}

export const donorKeys = {
  all: ['donors'] as const,
  list: (q: string) => ['donors', 'list', q] as const,
}

export function useDonors(q?: string) {
  return useQuery({
    queryKey: donorKeys.list(q ?? ''),
    queryFn: async () => {
      const query = new URLSearchParams({ size: '100', sort: 'name' })
      if (q) query.set('q', q)
      const res = await apiPaged<DonorDto>(`/api/v1/donors?${query.toString()}`)
      return res.data
    },
  })
}

export function useCreateDonor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: DonorInput) =>
      api<DonorDto>('/api/v1/donors', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: donorKeys.all }),
  })
}

export function useUpdateDonor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      donorId,
      version,
      ...payload
    }: DonorInput & { donorId: string; version: number }) =>
      api<DonorDto>(`/api/v1/donors/${donorId}`, {
        method: 'PATCH',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify({ version, ...payload }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: donorKeys.all }),
  })
}
