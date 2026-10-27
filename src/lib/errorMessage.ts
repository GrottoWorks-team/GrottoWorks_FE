import i18n from '@/lib/i18n'
import { ApiError } from '@/lib/api'

/**
 * Chuyển mọi lỗi thành câu tiếng người để hiển thị cho người dùng.
 *
 * Vì sao cần: `catch { toast(t('common.error')) }` gộp mọi thứ thành một câu
 * chung — người dùng không phân biệt được "mất mạng" với "sai mật khẩu" hay
 * "không đủ quyền", nên đi sửa nhầm chỗ. Hàm này tách đúng loại lỗi.
 *
 * Thứ tự ưu tiên:
 *  1. Không gọi được máy chủ (mạng, BE tắt) → câu riêng, KHÔNG đổ lỗi dữ liệu.
 *  2. Lỗi có mã nghiệp vụ (`code`) → tra bảng dịch riêng nếu có.
 *  3. Lỗi xác thực (401/403) → câu riêng.
 *  4. Thông điệp chi tiết từ BE (ProblemDetails `detail`/`errors`) → giữ nguyên.
 *  5. Còn lại → câu chung.
 */
export function errorMessage(err: unknown): string {
  // fetch() ném TypeError khi không kết nối được (BE tắt, sai cổng, mất mạng).
  if (err instanceof TypeError) {
    return i18n.t('error.network')
  }
  if (err instanceof DOMException && err.name === 'AbortError') {
    return i18n.t('error.timeout')
  }
  if (err instanceof ApiError) {
    // Mã nghiệp vụ cụ thể được dịch riêng ở nơi gọi; ở đây chỉ lo phần chung.
    if (err.status === 401) return i18n.t('error.unauthorized')
    if (err.status === 403) return i18n.t('error.forbidden')
    if (err.status === 404) return i18n.t('error.notFound')
    if (err.status === 412) return i18n.t('error.conflict')
    if (err.status >= 500) return i18n.t('error.server')
    // 400/409: BE đã viết câu cụ thể, giữ nguyên.
    if (err.message && err.message !== `${err.status}`) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return i18n.t('common.error')
}
