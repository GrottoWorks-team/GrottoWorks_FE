import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  CreateReadinessCheckRequest,
  ReadinessCheckDto,
  ReadinessItemDefinitionRequest,
  ReadinessItemDto,
  ReadinessItemResultRequest,
  RecordFileDownload,
  SeasonReadinessDto,
} from '@/types'

// ── GET /api/v1/readiness-checks/{id} ─────────────────────────────
export async function getReadinessCheck(checkId: string): Promise<ReadinessCheckDto> {
  return api<ReadinessCheckDto>(`/api/v1/readiness-checks/${checkId}`)
}

export function useReadinessCheck(checkId?: string) {
  return useQuery({
    queryKey: ['readiness-check', checkId],
    queryFn: () => getReadinessCheck(checkId!),
    enabled: Boolean(checkId),
  })
}

// ── GET /api/v1/seasons/{seasonId}/readiness ───────────────────────
export async function getSeasonReadiness(seasonId: string): Promise<SeasonReadinessDto> {
  return api<SeasonReadinessDto>(`/api/v1/seasons/${seasonId}/readiness`)
}

export function useSeasonReadiness(seasonId?: string) {
  return useQuery({
    queryKey: ['season-readiness', seasonId],
    queryFn: () => getSeasonReadiness(seasonId!),
    enabled: Boolean(seasonId),
  })
}

// ── POST /api/v1/work-areas/{workAreaId}/readiness-checks ───────────
export async function createReadinessCheck(
  workAreaId: string,
  data: CreateReadinessCheckRequest,
): Promise<ReadinessCheckDto> {
  const idempotencyKey = crypto.randomUUID()
  return api<ReadinessCheckDto>(`/api/v1/work-areas/${workAreaId}/readiness-checks`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(data),
  })
}

export function useCreateReadinessCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workAreaId, data }: { workAreaId: string; data: CreateReadinessCheckRequest }) =>
      createReadinessCheck(workAreaId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', result.id] })
      queryClient.invalidateQueries({ queryKey: ['season-readiness'] })
    },
  })
}

// ── PUT /api/v1/readiness-checks/{id}/items ────────────────────────
export async function replaceReadinessItems(
  checkId: string,
  version: number,
  items: ReadinessItemDefinitionRequest[],
): Promise<ReadinessCheckDto> {
  return api<ReadinessCheckDto>(`/api/v1/readiness-checks/${checkId}/items`, {
    method: 'PUT',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify(items),
  })
}

export function useReplaceReadinessItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      version,
      items,
    }: {
      checkId: string
      version: number
      items: ReadinessItemDefinitionRequest[]
    }) => replaceReadinessItems(checkId, version, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
    },
  })
}

// ── PUT /api/v1/readiness-checks/{id}/items/{iid} ──────────────────
export async function recordReadinessResult(
  checkId: string,
  itemId: string,
  version: number,
  data: ReadinessItemResultRequest,
): Promise<ReadinessItemDto> {
  return api<ReadinessItemDto>(`/api/v1/readiness-checks/${checkId}/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify({ ...data, version }),
  })
}

export function useRecordReadinessResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      itemId,
      version,
      data,
    }: {
      checkId: string
      itemId: string
      version: number
      data: ReadinessItemResultRequest
    }) => recordReadinessResult(checkId, itemId, version, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
    },
  })
}

// ── POST /api/v1/readiness-checks/{id}/items/{iid}/evidence ─────────
export async function attachReadinessEvidence(
  checkId: string,
  itemId: string,
  fileIds: string[],
): Promise<ReadinessItemDto> {
  return api<ReadinessItemDto>(`/api/v1/readiness-checks/${checkId}/items/${itemId}/evidence`, {
    method: 'POST',
    body: JSON.stringify(fileIds.map((id) => ({ id }))),
  })
}

export function useAttachReadinessEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      itemId,
      fileIds,
    }: {
      checkId: string
      itemId: string
      fileIds: string[]
    }) => attachReadinessEvidence(checkId, itemId, fileIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
    },
  })
}

// ── PUT /api/v1/readiness-checks/{id}/items/{iid}/corrective-task ──
export async function linkCorrectiveTask(
  checkId: string,
  itemId: string,
  version: number,
  taskId?: string | null,
  create?: {
    name: string
    description?: string
    priority?: string
    deadline?: string
  } | null,
): Promise<ReadinessItemDto> {
  return api<ReadinessItemDto>(`/api/v1/readiness-checks/${checkId}/items/${itemId}/corrective-task`, {
    method: 'PUT',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify({ version, taskId, create }),
  })
}

export function useLinkCorrectiveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      itemId,
      version,
      taskId,
      create,
    }: {
      checkId: string
      itemId: string
      version: number
      taskId?: string | null
      create?: {
        name: string
        description?: string
        priority?: string
        deadline?: string
      } | null
    }) => linkCorrectiveTask(checkId, itemId, version, taskId, create),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
    },
  })
}

// ── POST /api/v1/readiness-checks/{id}/items/{iid}/recheck ──────────
export async function recheckReadinessItem(
  checkId: string,
  itemId: string,
  version: number,
  data: ReadinessItemResultRequest,
): Promise<ReadinessItemDto> {
  return api<ReadinessItemDto>(`/api/v1/readiness-checks/${checkId}/items/${itemId}/recheck`, {
    method: 'POST',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify({ ...data, version }),
  })
}

export function useRecheckReadinessItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      itemId,
      version,
      data,
    }: {
      checkId: string
      itemId: string
      version: number
      data: ReadinessItemResultRequest
    }) => recheckReadinessItem(checkId, itemId, version, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
    },
  })
}

// ── POST /api/v1/readiness-checks/{id}/confirm ──────────────────────
export async function confirmAreaReadiness(
  checkId: string,
  version: number,
): Promise<ReadinessCheckDto> {
  return api<ReadinessCheckDto>(`/api/v1/readiness-checks/${checkId}/confirm`, {
    method: 'POST',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify({ version }),
  })
}

export function useConfirmAreaReadiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ checkId, version }: { checkId: string; version: number }) =>
      confirmAreaReadiness(checkId, version),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
      queryClient.invalidateQueries({ queryKey: ['season-readiness'] })
    },
  })
}

// ── POST /api/v1/readiness-checks/{id}/reopen ───────────────────────
export async function reopenReadinessCheck(
  checkId: string,
  version: number,
  reason: string,
): Promise<ReadinessCheckDto> {
  return api<ReadinessCheckDto>(`/api/v1/readiness-checks/${checkId}/reopen`, {
    method: 'POST',
    headers: {
      'If-Match': `"${version}"`,
    },
    body: JSON.stringify({ version, reason }),
  })
}

export function useReopenReadinessCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      version,
      reason,
    }: {
      checkId: string
      version: number
      reason: string
    }) => reopenReadinessCheck(checkId, version, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['readiness-check', variables.checkId] })
      queryClient.invalidateQueries({ queryKey: ['season-readiness'] })
    },
  })
}

// ── GET /api/v1/readiness-checks/{id}/items/{iid}/evidence/{eid}/download-url ──
export async function getReadinessEvidenceDownloadUrl(
  checkId: string,
  itemId: string,
  fileId: string,
): Promise<RecordFileDownload> {
  return api<RecordFileDownload>(
    `/api/v1/readiness-checks/${checkId}/items/${itemId}/evidence/${fileId}/download-url`,
  )
}

export function useReadinessEvidenceDownloadUrl(
  checkId?: string,
  itemId?: string,
  fileId?: string,
) {
  return useQuery({
    queryKey: ['readiness-evidence-download-url', checkId, itemId, fileId],
    queryFn: () => getReadinessEvidenceDownloadUrl(checkId!, itemId!, fileId!),
    enabled: Boolean(checkId && itemId && fileId),
  })
}
