// Giáo xứ đang thao tác. User thường lấy từ hồ sơ; ADMIN không thuộc giáo xứ
// nào (BR-67) nên rơi về giáo xứ đầu tiên trong danh sách.
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import type { Parish } from '@/types'
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

export interface ParishScope {
  /** Giáo xứ đang xem (đã tính cả `?parish=` lẫn hồ sơ người dùng). */
  parishId: string
  /** Bản ghi giáo xứ tương ứng — chỉ có khi người dùng được phép chọn. */
  parish?: Parish
  /** Danh sách giáo xứ để chọn (ADMIN). */
  parishes: Parish[]
  /** ADMIN (không gắn giáo xứ) được chuyển giữa nhiều giáo xứ. */
  canPickParish: boolean
  /** Ghi `?parish=` lên URL, giữ nguyên các tham số khác. */
  setParish: (parishId: string) => void
  isPending: boolean
}

/**
 * Phạm vi giáo xứ cho trang lồng nhau (Giáo xứ & cộng đoàn, Bản đồ…).
 *
 * - COMMUNITY/LEADER/MO: luôn là giáo xứ trong hồ sơ.
 * - ADMIN: chọn qua `?parish=<id>`, mặc định giáo xứ đầu tiên — nhờ vậy một
 *   màn hình xem được nhiều giáo xứ mà không cần đổi tài khoản.
 */
export function useParishScope(): ParishScope {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  // ADMIN (role FE `PARISH`) luôn được chuyển giáo xứ — kể cả khi tài khoản demo
  // có sẵn `parishId` trong hồ sơ. Role khác chỉ thấy giáo xứ của mình.
  const canPickParish = user?.role === 'PARISH'
  const { data: parishes = [], isPending } = useParishes({ enabled: canPickParish })

  const parishId = params.get('parish') || user?.parishId || parishes[0]?.id || ''
  const parish = parishes.find((p) => p.id === parishId)

  const setParish = (nextId: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('parish', nextId)
        return next
      },
      { replace: true },
    )
  }

  return { parishId, parish, parishes, canPickParish, setParish, isPending }
}
