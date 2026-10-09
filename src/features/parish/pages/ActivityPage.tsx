// Trang lịch sử hệ thống (route /parish/activity): audit log table — thời gian,
// người thực hiện, hành động, đối tượng. GET /api/activity (50 dòng mới nhất,
// mới nhất đứng đầu — handlers.ts). Chip filter theo action (suy từ dữ liệu,
// DataTable tự lọc client-side).
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { useActivityLogs } from '../api'
import { useUsers } from '@/features/users/api'
import { Avatar } from '@/components/ui/avatar'
import { viDate } from '@/lib/format'
import type { ActivityLog } from '@/types'

// ISO datetime → "dd/MM/yyyy HH:mm" (local display, mock layer bỏ Z).
function stamp(at: string): string {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return at
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${viDate(at)} ${hh}:${mm}`
}

export default function ActivityPage() {
  const { t } = useTranslation()
  const { data: logs = [], isPending } = useActivityLogs()
  const { data: users = [] } = useUsers()

  const actorName = (id: string) => users.find((u) => u.id === id)?.name ?? id

  // Options filter: các action distinct, giữ nguyên thứ tự xuất hiện.
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs])

  const columns = useMemo(
    () => [
      {
        key: 'at',
        header: t('features.parish.logTime'),
        render: (l: ActivityLog) => <span className="tabular whitespace-nowrap">{stamp(l.at)}</span>,
      },
      {
        key: 'actor',
        header: t('features.parish.logActor'),
        render: (l: ActivityLog) => {
          const u = users.find((x) => x.id === l.actor)
          return (
            <span className="flex items-center gap-2">
              <Avatar name={actorName(l.actor)} hue={u?.avatarHue} size="sm" />
              <span className="font-semibold">{actorName(l.actor)}</span>
            </span>
          )
        },
      },
      { key: 'action', header: t('features.parish.logAction') },
      { key: 'target', header: t('features.parish.logTarget') },
    ],
    [t, users],
  )

  return (
    <div>
      <PageHeader title={t('features.parish.activityTitle')} sub={t('features.parish.activitySub')} />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={logs}
          columns={columns}
          searchKeys={['action', 'target']}
          filters={[{ key: 'action', options: actions }]}
          emptyText={t('features.parish.empty')}
        />
      )}
    </div>
  )
}
