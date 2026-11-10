import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RecognitionRuleDto, DeactivateRecognitionRuleRequest } from '@/types'

export type { RecognitionRuleDto }

export const recognitionKeys = {
  all: ['recognition-rules'] as const,
  list: (status?: string) => ['recognition-rules', { status }] as const,
}

export function useRecognitionRules(status?: string) {
  const qs = status ? `?status=${status}` : ''
  return useQuery({
    queryKey: recognitionKeys.list(status),
    queryFn: () => api<RecognitionRuleDto[]>(`/api/v1/recognition-rules${qs}`),
    staleTime: 60_000,
  })
}

/** POST /api/v1/recognition-rules/{id}/deactivate — Vô hiệu hoá quy tắc điểm */
export async function deactivateRecognitionRule(
  id: string,
  payload: DeactivateRecognitionRuleRequest,
): Promise<void> {
  await api(`/api/v1/recognition-rules/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function useDeactivateRecognitionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      deactivateRecognitionRule(id, { reason }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: recognitionKeys.all })
    },
  })
}

