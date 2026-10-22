// Giáo xứ đang thao tác. User thường lấy từ hồ sơ; ADMIN không thuộc giáo xứ
// nào (BR-67) nên rơi về giáo xứ đầu tiên trong danh sách.
import { useAuth } from '@/lib/auth'
import { useParishes } from './api'

export function useCurrentParishId() {
  const { user } = useAuth()
  // LEADER/MO/COMMUNITY đã có parishId trong token → không cần gọi
  // GET /api/v1/parishes (endpoint này chỉ mở cho ADMIN/PARISH → 403).
  const needsParishList = !user?.parishId
  const { data: parishes = [], isPending } = useParishes({ enabled: needsParishList })

  if (user?.parishId) {
    return { parishId: user.parishId, isPending: false }
  }

  return { parishId: parishes[0]?.id, isPending }
}
