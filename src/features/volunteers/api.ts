// Đăng ký tình nguyện — BE CHƯA có endpoint VolunteerRegistration
// (`/volunteerRegs` chỉ tồn tại ở lớp mock cũ). Giữ hook trả rỗng để trang duyệt
// hiển thị thông báo thay vì gọi 404; xem BE-gap-requests-activity-flows.md §2.1.
import { useQuery } from '@tanstack/react-query'
import type { VolunteerReg } from '@/types'

export const volunteerRegKeys = { all: ['volunteerRegs'] as const }

export function useVolunteerRegs() {
  return useQuery({
    queryKey: volunteerRegKeys.all,
    queryFn: async (): Promise<VolunteerReg[]> => [],
    staleTime: Infinity,
  })
}