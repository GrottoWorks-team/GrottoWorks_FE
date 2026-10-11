// Skills catalog domain — F-IDN-06: Danh mục kỹ năng (Skills)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { SkillDto, CreateSkillRequest, UpdateSkillRequest } from '@/types/identity'

export const skillKeys = {
  all: ['skills-catalog'] as const,
  byStatus: (status?: string) => ['skills-catalog', status] as const,
}

/** F-IDN-06: Lấy danh sách kỹ năng */
export function useSkillsCatalog(status?: string) {
  return useQuery({
    queryKey: skillKeys.byStatus(status),
    queryFn: () => {
      const q = status ? `?status=${encodeURIComponent(status)}` : ''
      return api<SkillDto[]>(`/api/v1/skills${q}`)
    },
  })
}

/** F-IDN-06: Tạo kỹ năng mới (Role: Admin) */
export function useCreateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSkillRequest) =>
      api<SkillDto>('/api/v1/skills', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: skillKeys.all })
      void qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })
}

/** F-IDN-06: Cập nhật kỹ năng / trạng thái (Role: Admin) */
export function useUpdateSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ skillId, ...data }: UpdateSkillRequest & { skillId: string }) =>
      api<SkillDto>(`/api/v1/skills/${skillId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: skillKeys.all })
      void qc.invalidateQueries({ queryKey: ['skills'] })
    },
  })
}
