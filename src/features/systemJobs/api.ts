// Job hệ thống — NotificationAudit (chỉ ADMIN):
//   POST /api/v1/backups                 → 202 SystemJobDto (sao lưu DB)
//   GET  /api/v1/backups/{jobId}         → trạng thái job
//   POST /api/v1/system-data-exports     → 202 SystemJobDto (xuất dữ liệu)
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type SystemJobStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | string

export interface SystemJobDto {
  jobId: string
  status: SystemJobStatus
  services: string[]
  createdAt: string
  startedAt?: string | null
  finishedAt?: string | null
  attempts: number
  fileId?: string | null
  expiresAt?: string | null
  errorCode?: string | null
  manifest?: unknown
}

export interface SystemJobRequest {
  services?: string[] | null
}

function createJob(path: 'backups' | 'system-data-exports') {
  return (payload: SystemJobRequest = {}) =>
    api<SystemJobDto>(`/api/v1/${path}`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
      body: JSON.stringify({ services: payload.services ?? null }),
    })
}

export function useStartBackup() {
  return useMutation({ mutationFn: createJob('backups') })
}

export function useStartSystemExport() {
  return useMutation({ mutationFn: createJob('system-data-exports') })
}

/** Trạng thái job sao lưu.
 *  BE giới hạn policy `system-jobs` = 3 request/phút → KHÔNG auto-poll; trang gọi
 *  `refetch()` theo nút "Làm mới" (và một lần sau khi tạo job). */
export function useBackupJob(jobId?: string) {
  return useQuery({
    queryKey: ['system-jobs', 'backup', jobId ?? ''] as const,
    queryFn: () => api<SystemJobDto>(`/api/v1/backups/${jobId}`),
    enabled: Boolean(jobId),
    retry: false,
    staleTime: 0,
  })
}

export function isJobFinished(status?: string): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED'
}
