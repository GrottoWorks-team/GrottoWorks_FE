// Readiness (Checklist) — BE Readiness service.
// Phiếu kiểm tra do Leader tạo cho từng khu: định nghĩa hạng mục (PLANNING),
// ghi kết quả PASSED/FAILED, xác nhận READY. Mọi lệnh đổi trạng thái gửi
// `version` của phiếu (BE trả 412 nếu lệch).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ReadinessCheck, ReadinessItem, SeasonReadiness } from '@/types'

export const readinessKeys = {
  season: (seasonId: string) => ['readiness', 'season', seasonId] as const,
  check: (checkId: string) => ['readiness', 'check', checkId] as const,
}

export function useSeasonReadiness(seasonId?: string) {
  return useQuery({
    queryKey: readinessKeys.season(seasonId ?? ''),
    queryFn: () => api<SeasonReadiness>(`/api/v1/seasons/${seasonId}/readiness`),
    enabled: Boolean(seasonId),
  })
}

export function useReadinessCheck(checkId?: string) {
  return useQuery({
    queryKey: readinessKeys.check(checkId ?? ''),
    queryFn: () => api<ReadinessCheck>(`/api/v1/readiness-checks/${checkId}`),
    enabled: Boolean(checkId),
  })
}

export interface ReadinessItemDraft {
  name: string
  description?: string
  mandatory: boolean
}

export interface CreateReadinessInput {
  workAreaId: string
  name: string
  items: ReadinessItemDraft[]
}

function useReadinessMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['readiness'] })
    },
  })
}

export function useCreateReadinessCheck() {
  return useReadinessMutation((input: CreateReadinessInput) =>
    api<ReadinessCheck>(`/api/v1/work-areas/${input.workAreaId}/readiness-checks`, {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        items: input.items.map((item) => ({
          name: item.name,
          description: item.description || null,
          mandatory: item.mandatory,
        })),
      }),
    }),
  )
}

export function useReplaceReadinessItems() {
  return useReadinessMutation(
    ({ checkId, version, items }: { checkId: string; version: number; items: ReadinessItemDraft[] }) =>
      api<ReadinessCheck>(`/api/v1/readiness-checks/${checkId}/items`, {
        method: 'PUT',
        headers: { 'If-Match': `"${version}"` },
        body: JSON.stringify(
          items.map((item) => ({
            name: item.name,
            description: item.description || null,
            mandatory: item.mandatory,
          })),
        ),
      }),
  )
}

export interface RecordResultInput {
  checkId: string
  itemId: string
  version: number
  result: 'PASSED' | 'FAILED'
  note?: string
}

export function useRecordReadinessResult() {
  return useReadinessMutation((input: RecordResultInput) =>
    api<ReadinessItem>(`/api/v1/readiness-checks/${input.checkId}/items/${input.itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ version: input.version, result: input.result, note: input.note || null }),
    }),
  )
}

export function useRecheckReadinessItem() {
  return useReadinessMutation((input: RecordResultInput) =>
    api<ReadinessItem>(`/api/v1/readiness-checks/${input.checkId}/items/${input.itemId}/recheck`, {
      method: 'POST',
      body: JSON.stringify({ version: input.version, result: input.result, note: input.note || null }),
    }),
  )
}

export function useConfirmReadiness() {
  return useReadinessMutation(({ checkId, version }: { checkId: string; version: number }) =>
    api<ReadinessCheck>(`/api/v1/readiness-checks/${checkId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    }),
  )
}

export function useReopenReadiness() {
  return useReadinessMutation(({ checkId, version, reason }: { checkId: string; version: number; reason: string }) =>
    api<ReadinessCheck>(`/api/v1/readiness-checks/${checkId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ version, reason }),
    }),
  )
}

/** POST /readiness-checks/{id}/items/{itemId}/evidence — gắn file đã upload (NotificationAudit). */
export function useAttachReadinessEvidence() {
  return useReadinessMutation(
    ({ checkId, itemId, fileIds }: { checkId: string; itemId: string; fileIds: string[] }) =>
      api<ReadinessItem>(`/api/v1/readiness-checks/${checkId}/items/${itemId}/evidence`, {
        method: 'POST',
        body: JSON.stringify(fileIds.map((id) => ({ id }))),
      }),
  )
}

/** PUT /readiness-checks/{id}/items/{itemId}/corrective-task — gắn việc khắc phục. */
export function useLinkCorrectiveTask() {
  return useReadinessMutation(
    ({
      checkId,
      itemId,
      version,
      taskId,
    }: {
      checkId: string
      itemId: string
      version: number
      taskId: string | null
    }) =>
      api<ReadinessItem>(
        `/api/v1/readiness-checks/${checkId}/items/${itemId}/corrective-task`,
        {
          method: 'PUT',
          headers: { 'If-Match': `"${version}"` },
          body: JSON.stringify({ version, taskId }),
        },
      ),
  )
}

/** GET .../evidence/{fileId}/download-url — URL tải minh chứng (hết hạn ngắn). */
export async function getReadinessEvidenceUrl(
  checkId: string,
  itemId: string,
  fileId: string,
): Promise<string> {
  const res = await api<{ downloadUrl: string }>(
    `/api/v1/readiness-checks/${checkId}/items/${itemId}/evidence/${fileId}/download-url`,
  )
  return res.downloadUrl
}