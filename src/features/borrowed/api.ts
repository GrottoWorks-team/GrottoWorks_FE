// Đồ mượn domain — query key ['borrowedItems']. Ghi đã trả chỉ PATCH
// returnedCondition (GOOD/DAMAGED/LOST) cho item truyền vào lúc gọi hook.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BorrowedItem } from '@/types'

export const borrowedKeys = { all: ['borrowedItems'] as const }

export function useBorrowedItems() {
  return useQuery({
    queryKey: borrowedKeys.all,
    queryFn: () => api<BorrowedItem[]>('/borrowedItems'),
  })
}

function useBorrowedMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: borrowedKeys.all }),
  })
}

export function useCreateBorrowed() {
  return useBorrowedMutation((data: Omit<BorrowedItem, 'id' | 'returnedCondition'>) =>
    api<BorrowedItem>('/borrowedItems', { method: 'POST', body: JSON.stringify(data) }),
  )
}

// useMarkReturned(id, condition): id cố định lúc gọi hook (dialog mount theo
// item), condition truyền vào lúc mutate.
export function useMarkReturned(itemId: string) {
  return useBorrowedMutation((condition: NonNullable<BorrowedItem['returnedCondition']>) =>
    api<BorrowedItem>(`/borrowedItems/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ returnedCondition: condition }),
    }),
  )
}
