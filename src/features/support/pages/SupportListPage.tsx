import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'

export default function SupportListPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('features.support.title')} sub={t('features.support.sub')} />
      <Card>
        <EmptyState
          text={`${t('features.pendingBackend.title')} — ${t('features.pendingBackend.desc')}`}
        />
      </Card>
    </div>
  )
}
