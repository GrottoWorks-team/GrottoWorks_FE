import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RecognitionRuleDto } from '@/types'

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
