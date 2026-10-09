// Readiness checklist domain — query key ['checklists'] (= db key + URL
// path; seed là mảng phẳng mọi khu, lọc theo areaId phía client).
// Tiến độ done/total tính từ data — không cần endpoint riêng.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ChecklistItem } from '@/types'

export const checklistKeys = {
  all: ['checklists'] as const,
}

export function useChecklist(areaId?: string) {
  return useQuery({
    queryKey: checklistKeys.all,
    queryFn: () => api<ChecklistItem[]>('/checklists'),
    select: areaId ? (xs) => xs.filter((x) => x.areaId === areaId) : undefined,
  })
}

export function useToggleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      api<ChecklistItem>(`/checklists/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ done }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: checklistKeys.all }),
  })
}

// Tiến độ 1 khu: {done, total, percent} — computed, cùng query key nên
// cache chia sẻ với useChecklist.
export function useChecklistProgress(areaId: string) {
  const { data: items = [], isPending } = useChecklist(areaId)
  const done = items.filter((x) => x.done).length
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
    isPending,
  }
}
