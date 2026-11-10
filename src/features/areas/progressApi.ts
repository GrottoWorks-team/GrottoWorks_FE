import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WorkAreaProgressDto } from '@/types'

// ══════ [fe-api-gap-2] Tiến độ khu vực & Kiểm tra sẵn sàng (Đợt I) ══════

/** GET /api/v1/work-areas/{id}/progress — Lấy tiến độ khu vực */
export async function getWorkAreaProgress(workAreaId: string): Promise<WorkAreaProgressDto> {
  return api<WorkAreaProgressDto>(`/api/v1/work-areas/${workAreaId}/progress`)
}

/** PUT /api/v1/work-areas/{id}/progress — Cập nhật tiến độ khu vực */
export async function updateWorkAreaProgress(
  workAreaId: string,
  progressPercentage: number,
): Promise<WorkAreaProgressDto> {
  return api<WorkAreaProgressDto>(`/api/v1/work-areas/${workAreaId}/progress`, {
    method: 'PUT',
    body: JSON.stringify({ progressPercentage }),
  })
}

/** GET /api/v1/work-areas/{id}/readiness-checks — Danh sách kiểm tra sẵn sàng của khu vực */
export async function getWorkAreaReadinessChecks(workAreaId: string): Promise<any[]> {
  const res = await api<any>(`/api/v1/work-areas/${workAreaId}/readiness-checks`)
  if (Array.isArray(res)) return res
  return res.data ?? []
}

export function useWorkAreaProgress(workAreaId?: string) {
  return useQuery({
    queryKey: ['areas', workAreaId, 'progress'],
    queryFn: () => getWorkAreaProgress(workAreaId!),
    enabled: Boolean(workAreaId),
  })
}

export function useUpdateWorkAreaProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      workAreaId,
      progressPercentage,
    }: {
      workAreaId: string
      progressPercentage: number
    }) => updateWorkAreaProgress(workAreaId, progressPercentage),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['areas', vars.workAreaId, 'progress'] })
    },
  })
}

export function useWorkAreaReadinessChecks(workAreaId?: string) {
  return useQuery({
    queryKey: ['areas', workAreaId, 'readiness-checks'],
    queryFn: () => getWorkAreaReadinessChecks(workAreaId!),
    enabled: Boolean(workAreaId),
  })
}
