// Trang Bản đồ giáo xứ (route /parish/map, /community/map).
//
// BE CHƯA CÓ endpoint `/parishMaps` và cũng chưa có API cập nhật toạ độ ghim
// khu vực. Trước đây trang này lưu ảnh mặt bằng + toạ độ ghim vào localStorage
// và IndexedDB của chính máy người dùng — nghĩa là máy khác mở sẽ thấy bản đồ
// trống, và dữ liệu mất khi xoá cache trình duyệt.
//
// Đã vô hiệu hoá theo đúng cách xử lý các màn thiếu API khác: giữ route và
// mục menu, chỉ báo chờ máy chủ.
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'

export default function ParishMapPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('features.map.title')} sub={t('features.map.sub')} />
      <Card>
        <EmptyState
          text={`${t('features.pendingBackend.title')} — ${t('features.pendingBackend.desc')}`}
        />
      </Card>
    </div>
  )
}
