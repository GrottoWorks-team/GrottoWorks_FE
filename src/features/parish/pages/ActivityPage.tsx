// Trang lịch sử hệ thống (route /parish/activity) — NotificationAudit audit log:
//   GET /api/v1/activity-logs?size=50            (danh sách, mới nhất trước)
//   GET /api/v1/activity-logs/{logId}            (chi tiết: old/new value, lý do)
//   GET /api/v1/resource-history/{type}/{id}     (lịch sử thay đổi của đối tượng)
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useActivityLogDetail, useActivityLogs, useResourceHistory, type ActivityRow } from '../api'
import { useUsers } from '@/features/users/api'
import { Avatar } from '@/components/ui/avatar'
import { viDate, viDateTime } from '@/lib/format'

// ISO datetime → "dd/MM/yyyy HH:mm" (giờ máy người dùng).
function stamp(at: string): string {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return at
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${viDate(at)} ${hh}:${mm}`
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <pre className="max-h-48 overflow-auto rounded-md border border-border/60 bg-muted/20 p-2 text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export default function ActivityPage() {
  const { t } = useTranslation()
  const { data: logs = [], isPending } = useActivityLogs()
  const { data: users = [] } = useUsers()
  const [selected, setSelected] = useState<ActivityRow | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const { data: detail, isPending: detailPending } = useActivityLogDetail(selected?.id)
  const { data: history = [], isPending: historyPending } = useResourceHistory(
    selected?.entityType,
    selected?.entityId,
    historyOpen,
  )

  const actorName = (id: string) => users.find((u) => u.id === id)?.name ?? id

  // Options filter: các action distinct, giữ nguyên thứ tự xuất hiện.
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs])

  const columns = useMemo(
    () => [
      {
        key: 'at',
        header: t('features.parish.logTime'),
        render: (l: ActivityRow) => <span className="tabular whitespace-nowrap">{stamp(l.at)}</span>,
      },
      {
        key: 'actor',
        header: t('features.parish.logActor'),
        render: (l: ActivityRow) => {
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
          onRowClick={(row) => setSelected(row)}
        />
      )}

      {selected && (
        <Dialog
          open
          onClose={() => {
            setSelected(null)
            setHistoryOpen(false)
          }}
          title={t('features.parish.logDetailTitle')}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setHistoryOpen((value) => !value)}
                disabled={!selected.entityId}
              >
                {historyOpen ? t('features.parish.historyHide') : t('features.parish.historyShow')}
              </Button>
              <Button
                onClick={() => {
                  setSelected(null)
                  setHistoryOpen(false)
                }}
              >
                {t('common.close')}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted-foreground">{t('features.parish.logAction')}</dt>
              <dd className="font-semibold">{selected.action}</dd>
              <dt className="text-muted-foreground">{t('features.parish.logTarget')}</dt>
              <dd className="font-mono text-xs">
                {selected.entityType} · {selected.entityId}
              </dd>
              <dt className="text-muted-foreground">{t('features.parish.logTime')}</dt>
              <dd className="tabular">{viDateTime(selected.at)}</dd>
            </dl>

            {detailPending ? (
              <p className="text-muted-foreground">{t('common.loading')}</p>
            ) : detail ? (
              <>
                {detail.reason && (
                  <p className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <span className="font-semibold">{t('features.parish.logReason')}: </span>
                    {detail.reason}
                  </p>
                )}
                <div>
                  <p className="lbl-mono mb-1">{t('features.parish.logOldValue')}</p>
                  <JsonBlock value={detail.oldValue} />
                </div>
                <div>
                  <p className="lbl-mono mb-1">{t('features.parish.logNewValue')}</p>
                  <JsonBlock value={detail.newValue} />
                </div>
              </>
            ) : null}

            {historyOpen && (
              <div>
                <p className="lbl-mono mb-1">{t('features.parish.historyTitle')}</p>
                {historyPending ? (
                  <p className="text-muted-foreground">{t('common.loading')}</p>
                ) : history.length === 0 ? (
                  <p className="text-muted-foreground">{t('features.parish.historyEmpty')}</p>
                ) : (
                  <ul className="space-y-1">
                    {history.map((change) => (
                      <li
                        key={change.logId}
                        className="rounded-md border border-border/60 px-2 py-1 text-xs"
                      >
                        <span className="tabular text-muted-foreground">
                          {viDateTime(change.changedAt)}
                        </span>{' '}
                        <span className="font-semibold">{change.action}</span>
                        {change.reason ? ` — ${change.reason}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}
