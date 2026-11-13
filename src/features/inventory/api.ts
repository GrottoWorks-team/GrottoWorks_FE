import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { InventoryAdjustmentRequest } from '@/types'

export const inventoryKeys = {
  all: ['inventory-adjustments'] as const,
}

/** POST /api/v1/inventory-adjustments — Điều chỉnh tồn kho (hỏng, mất, thanh lý) */
export async function createInventoryAdjustment(
  payload: InventoryAdjustmentRequest,
): Promise<void> {
  await api('/api/v1/inventory-adjustments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function useCreateInventoryAdjustment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InventoryAdjustmentRequest) => createInventoryAdjustment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.all })
    },
  })
}
