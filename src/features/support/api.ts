// Support requests domain — query key ['supportRequests'] + ['supportRegs'].
// Kết nối GET /api/v1/support-requests, GET/PATCH /api/v1/support-requests/{id}
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SupportRequest, SupportReg, SupportType, SupportRequestStatus } from '@/types'

export interface SupportRequestFilterParams {
  page?: number
  size?: number
  seasonId?: string
  workAreaId?: string
  supportType?: SupportType
  status?: SupportRequestStatus
}

export const supportKeys = {
  all: ['supportRequests'] as const,
  list: (filter?: SupportRequestFilterParams) => ['supportRequests', 'list', filter] as const,
  detail: (id: string) => ['supportRequests', 'detail', id] as const,
  regs: ['supportRegs'] as const,
}

export function useSupportRequests(filter?: SupportRequestFilterParams) {
  return useQuery({
    queryKey: supportKeys.list(filter),
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (filter?.page) sp.set('page', String(filter.page))
      if (filter?.size) sp.set('size', String(filter.size))
      if (filter?.seasonId) sp.set('seasonId', filter.seasonId)
      if (filter?.workAreaId) sp.set('workAreaId', filter.workAreaId)
      if (filter?.supportType) sp.set('supportType', filter.supportType)
      if (filter?.status) sp.set('status', filter.status)
      const qs = sp.toString()
      const res = await api<{ data?: SupportRequest[] } | SupportRequest[]>(
        `/api/v1/support-requests${qs ? `?${qs}` : ''}`,
      )
      if (Array.isArray(res)) return res
      return res.data ?? []
    },
  })
}

export function useSupportRequest(id?: string) {
  return useQuery({
    queryKey: supportKeys.detail(id ?? ''),
    queryFn: async () => {
      const res = await api<{ data?: SupportRequest } | SupportRequest>(`/api/v1/support-requests/${id}`)
      if ('data' in res && res.data) return res.data
      return res as SupportRequest
    },
    enabled: !!id,
  })
}

export function useUpdateSupportRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      api<SupportRequest>(`/api/v1/support-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  })
}

// SupportReg giữ nguyên cho phần đăng ký TNV phía frontend
export function useSupportRegs() {
  return useQuery({
    queryKey: supportKeys.regs,
    queryFn: () => api<SupportReg[]>('/api/v1/support-regs'),
  })
}
