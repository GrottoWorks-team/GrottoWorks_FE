// Duyệt đăng ký TNV — BE CHƯA có endpoint VolunteerRegistration.
// Trang giữ route để nav không 404 nhưng chỉ hiển thị thông báo chờ BE
// (xem BE-gap-requests-activity-flows.md §2.1).
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'

export default function RegsApprovalPage() {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={t('features.volunteers.regsTitle')} sub={t('features.volunteers.regsSub')} />
      <p className="mb-4 rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
        {t('features.volunteers.regsApiMissing')}
      </p>
      <EmptyState text={t('features.volunteers.regsEmpty')} />
    </div>
  )
}