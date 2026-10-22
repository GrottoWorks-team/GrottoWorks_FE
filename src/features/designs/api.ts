// Design Review API hooks — pattern chung của dự án: query key theo resource,
// api() wrapper, invalidate các cache liên quan sau mutation.
//
// Luồng: Design (hồ sơ theo khu vực) → DesignVersion (phiên bản file)
// → DesignComment (yêu cầu chỉnh sửa, gắn theo MỘT phiên bản).
// File blob nằm ở IndexedDB (xem lib/blobStore.ts) — metadata đi qua mock API.
//
// ⚠️ TẠM THỜI (FE-only): BE chưa có endpoint `/designs`, `/designVersions`,
// `/designComments` → metadata lưu ở localStorage qua `localStore`. Khi BE bổ
// sung endpoint: thay `designStore.*` bằng `api(...)` (giữ nguyên hook surface).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Design, DesignComment, DesignVersion } from '@/types'
import { designStore } from './localStore'

export const designKeys = {
  all: ['designs'] as const,
  versions: ['designVersions'] as const,
  comments: ['designComments'] as const,
}

// ── Queries ────────────────────────────────────────────────────────────────

export function useDesigns(areaId?: string) {
  return useQuery({
    queryKey: designKeys.all,
    queryFn: async () => designStore.listDesigns(),
    select: areaId ? (list) => list.filter((d) => d.areaId === areaId) : undefined,
  })
}

export function useDesignVersions(designId?: string) {
  return useQuery({
    queryKey: designKeys.versions,
    queryFn: async () => designStore.listVersions(),
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
    queryFn: async () => designStore.listComments(),
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
  return useDesignMutation(async (data: Omit<Design, 'id'>) => designStore.createDesign(data))
}

export function useUpdateDesign() {
  return useDesignMutation(
    async ({ id, ...data }: Partial<Omit<Design, 'id'>> & { id: string }) =>
      designStore.updateDesign(id, data),
  )
}

/** Tạo phiên bản mới. KHÔNG ghi đè phiên bản cũ (lịch sử vẫn xem được). */
export function useCreateDesignVersion() {
  return useDesignMutation(
    async (data: Omit<DesignVersion, 'id'>) => designStore.createVersion(data),
    [designKeys.versions],
  )
}

/** Duyệt / yêu cầu chỉnh sửa / đổi trạng thái phiên bản. */
export function useUpdateDesignVersion() {
  return useDesignMutation(
    async ({ id, ...data }: Partial<Omit<DesignVersion, 'id'>> & { id: string }) =>
      designStore.updateVersion(id, data),
    [designKeys.versions],
  )
}

export function useCreateDesignComment() {
  return useDesignMutation(
    async (data: Omit<DesignComment, 'id'>) => designStore.createComment(data),
    [designKeys.comments],
  )
}

export function useUpdateDesignComment() {
  return useDesignMutation(
    async ({ id, ...data }: Partial<Omit<DesignComment, 'id'>> & { id: string }) =>
      designStore.updateComment(id, data),
    [designKeys.comments],
  )
}

export function useDeleteDesignComment() {
  return useDesignMutation(
    async (id: string) => designStore.deleteComment(id),
    [designKeys.comments],
  )
}
