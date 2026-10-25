import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'

export default function ChecklistPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.checklist.title')}
        sub={t('features.checklist.subLeader')}
      />
      <Card>
        <EmptyState
          text={`${t('features.pendingBackend.title')} — ${t('features.pendingBackend.desc')}`}
        />
      </Card>
    </div>
  )
}
