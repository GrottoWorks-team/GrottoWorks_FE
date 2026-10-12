// Design Review API hooks — pattern chung của dự án: query key theo resource,
// api() wrapper, invalidate các cache liên quan sau mutation.
//
// Luồng: Design (hồ sơ theo khu vực) → DesignVersion (phiên bản file)
// → DesignComment (yêu cầu chỉnh sửa, gắn theo MỘT phiên bản).
// File blob nằm ở IndexedDB (xem lib/blobStore.ts) — metadata đi qua mock API.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Design, DesignComment, DesignVersion } from '@/types'

export const designKeys = {
  all: ['designs'] as const,
  versions: ['designVersions'] as const,
  comments: ['designComments'] as const,
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useDesigns(areaId?: string) {
  return useQuery({
    queryKey: designKeys.all,
    queryFn: () => api<Design[]>('/designs'),
    select: areaId ? (list) => list.filter((d) => d.areaId === areaId) : undefined,
  })
}

export function useDesignVersions(designId?: string) {
  return useQuery({
    queryKey: designKeys.versions,
    queryFn: () => api<DesignVersion[]>('/designVersions'),
    select: designId
      ? (list) =>
          list
            .filter((v) => v.designId === designId)
            .sort((a, b) => b.versionNumber - a.versionNumber)
      : undefined,
  })
}

export function useDesignComments(versionId?: string) {
  return useQuery({
    queryKey: designKeys.comments,
    queryFn: () => api<DesignComment[]>('/designComments'),
    select: versionId ? (list) => list.filter((c) => c.designVersionId === versionId) : undefined,
  })
}

// ── Mutations ──────────────────────────────────────────────────────────────

function useDesignMutation<TVars, TResult>(
  fn: (vars: TVars) => Promise<TResult>,
  keys: readonly (readonly unknown[])[] = [],
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: designKeys.all })
      for (const key of keys) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useCreateDesign() {
  return useDesignMutation((data: Omit<Design, 'id'>) =>
    api<Design>('/designs', { method: 'POST', body: JSON.stringify(data) }),
  )
}

export function useUpdateDesign() {
  return useDesignMutation(
    ({ id, ...data }: Partial<Omit<Design, 'id'>> & { id: string }) =>
      api<Design>(`/designs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  )
}

/** Tạo phiên bản mới. KHÔNG ghi đè phiên bản cũ (lịch sử vẫn xem được). */
export function useCreateDesignVersion() {
  return useDesignMutation(
    (data: Omit<DesignVersion, 'id'>) =>
      api<DesignVersion>('/designVersions', { method: 'POST', body: JSON.stringify(data) }),
    [designKeys.versions],
  )
}

/** Duyệt / yêu cầu chỉnh sửa / đổi trạng thái phiên bản. */
export function useUpdateDesignVersion() {
  return useDesignMutation(
    ({ id, ...data }: Partial<Omit<DesignVersion, 'id'>> & { id: string }) =>
      api<DesignVersion>(`/designVersions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    [designKeys.versions],
  )
}

export function useCreateDesignComment() {
  return useDesignMutation(
    (data: Omit<DesignComment, 'id'>) =>
      api<DesignComment>('/designComments', { method: 'POST', body: JSON.stringify(data) }),
    [designKeys.comments],
  )
}

export function useUpdateDesignComment() {
  return useDesignMutation(
    ({ id, ...data }: Partial<Omit<DesignComment, 'id'>> & { id: string }) =>
      api<DesignComment>(`/designComments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    [designKeys.comments],
  )
}

export function useDeleteDesignComment() {
  return useDesignMutation(
    (id: string) => api<void>(`/designComments/${id}`, { method: 'DELETE' }),
    [designKeys.comments],
  )
}
