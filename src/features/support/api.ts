// Support requests — query key ['supportRequests'] + ['supportRegs'].
// Luồng hỗ trợ nhân lực giữa các cộng đoàn:
//   Leader tạo (POST, status OPEN) → TNV cộng đoàn khác gửi SupportReg (PENDING)
//   → Leader duyệt (APPROVED, tính lại fulfill) / từ chối (REJECTED)
//   → fulfill = OPEN | PARTIAL | FULFILLED.
// Committee điều phối (PATCH status COORDINATED) / giải quyết (RESOLVED).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SupportFulfill, SupportReg, SupportRequest } from '@/types'

export const supportKeys = {
  all: ['supportRequests'] as const,
  regs: ['supportRegs'] as const,
}

export function useSupportRequests() {
  return useQuery({
    queryKey: supportKeys.all,
    queryFn: () => api<SupportRequest[]>('/supportRequests'),
  })
}

export function useSupportRegs() {
  return useQuery({
    queryKey: supportKeys.regs,
    queryFn: () => api<SupportReg[]>('/supportRegs'),
  })
}

function useSupportMutation<TVars>(fn: (vars: TVars) => Promise<unknown>, invalidateRegs = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: supportKeys.all })
      if (invalidateRegs) void qc.invalidateQueries({ queryKey: supportKeys.regs })
    },
  })
}

export function useCreateSupportRequest() {
  return useSupportMutation((data: Omit<SupportRequest, 'id'>) =>
    api<SupportRequest>('/supportRequests', { method: 'POST', body: JSON.stringify(data) }))
}

export function useUpdateSupportRequest() {
  return useSupportMutation(
    ({ id, ...data }: Partial<Omit<SupportRequest, 'id'>> & { id: string }) =>
      api<SupportRequest>(`/supportRequests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  )
}

// Mức đáp ứng theo số nhân lực đã xác nhận: 0 → OPEN; < cần → PARTIAL; ≥ cần →
// FULFILLED. Không cần người (MATERIAL, volunteersNeeded = 0) → FULFILLED.
export function fulfillOf(needed: number, approved: number): SupportFulfill {
  if (needed <= 0) return 'FULFILLED'
  if (approved <= 0) return 'OPEN'
  return approved >= needed ? 'FULFILLED' : 'PARTIAL'
}

const patchReg = (id: string, patch: Partial<SupportReg>) =>
  api<SupportReg>(`/supportRegs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })

// Duyệt 2 bước: PATCH reg APPROVED → tính lại fulfill + (đủ người → COORDINATED).
export function useApproveSupportReg() {
  return useSupportMutation(async (reg: SupportReg) => {
    const approved = await patchReg(reg.id, { status: 'APPROVED' })
    const req = await api<SupportRequest>(`/supportRequests/${reg.requestId}`)
    const regs = await api<SupportReg[]>('/supportRegs')
    const approvedCount = regs.filter(
      (g) => g.requestId === reg.requestId && g.status === 'APPROVED',
    ).length
    const fulfill = fulfillOf(req.volunteersNeeded ?? 0, approvedCount)
    const status: SupportRequest['status'] =
      fulfill === 'FULFILLED' ? 'COORDINATED' : req.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'
    await api<SupportRequest>(`/supportRequests/${reg.requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfill, status }),
    })
    return approved
  }, true)
}

// Từ chối: chỉ đổi status reg, không đụng fulfill.
export function useRejectSupportReg() {
  return useSupportMutation(
    (reg: SupportReg) => patchReg(reg.id, { status: 'REJECTED' }),
    true,
  )
}
