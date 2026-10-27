// Trang Quy tắc điểm (route /parish/point-rules).
//
// BE CHƯA CÓ endpoint `/pointRules`. Trước đây trang này giữ 8 quy tắc bịa
// cứng trong component và lưu vào localStorage, khiến người dùng tưởng đã cấu
// hình được điểm thưởng thật. Đã vô hiệu hoá theo đúng cách xử lý 8 màn thiếu
// API khác — không xoá route/menu, chỉ báo chờ máy chủ.
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'

export default function PointRulesPage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.pointRules.title')}
        sub={t('features.pointRules.sub')}
      />
      <Card>
        <EmptyState
          text={`${t('features.pendingBackend.title')} — ${t('features.pendingBackend.desc')}`}
        />
      </Card>
    </div>
  )
}
