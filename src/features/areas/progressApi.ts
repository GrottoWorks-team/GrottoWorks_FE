import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { WorkAreaProgressDto } from '@/types'

// ══════ [fe-api-gap-2] Tiến độ khu vực (Đợt I) ══════

/** GET /api/v1/work-areas/{id}/progress — Lấy tiến độ khu vực (tổng hợp tự động từ Task) */
export async function getWorkAreaProgress(workAreaId: string): Promise<WorkAreaProgressDto> {
  return api<WorkAreaProgressDto>(`/api/v1/work-areas/${workAreaId}/progress`)
}

export function useWorkAreaProgress(workAreaId?: string) {
  return useQuery({
    queryKey: ['areas', workAreaId, 'progress'],
    queryFn: () => getWorkAreaProgress(workAreaId!),
    enabled: Boolean(workAreaId),
  })
}
