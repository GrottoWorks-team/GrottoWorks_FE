// Trang lịch sử hệ thống (route /parish/activity): audit log table — thời gian,
// người thực hiện, hành động, đối tượng. GET /api/activity (50 dòng mới nhất,
// mới nhất đứng đầu — handlers.ts). Chip filter theo action (suy từ dữ liệu,
// DataTable tự lọc client-side).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, History, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useActivityLogs, useActivityLogDetail, useResourceHistory } from '../api'
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

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null)
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)

  const { data: logDetail, isLoading: isLoadingDetail } = useActivityLogDetail(
    selectedLogId ?? undefined,
  )
  const { data: resourceHistory, isLoading: isLoadingHistory } = useResourceHistory(
    selectedEntityType ?? undefined,
    selectedEntityId ?? undefined,
  )

  const actorName = (id: string) => users.find((u) => u.id === id)?.name ?? id

  // Options filter: các action distinct, giữ nguyên thứ tự xuất hiện.
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs])

  const openDetail = (l: ActivityLog) => {
    setSelectedLogId(l.id)
    // Nếu target có dạng 'TYPE:ID' hoặc l có entityType/entityId
    const parts = (l.target || '').split(':')
    if (parts.length >= 2 && parts[1]) {
      setSelectedEntityType(parts[0])
      setSelectedEntityId(parts[1])
    } else {
      setSelectedEntityType((l as any).entityType ?? null)
      setSelectedEntityId((l as any).entityId ?? null)
    }
  }

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
      {
        key: 'actions',
        header: '',
        render: (l: ActivityLog) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDetail(l)}
            data-testid={`view-log-${l.id}`}
            aria-label="Xem chi tiết nhật ký"
          >
            <Eye className="size-4" />
          </Button>
        ),
      },
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

      <Dialog
        open={Boolean(selectedLogId)}
        onClose={() => {
          setSelectedLogId(null)
          setSelectedEntityType(null)
          setSelectedEntityId(null)
        }}
        title="Chi tiết nhật ký hoạt động"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedLogId(null)
                setSelectedEntityType(null)
                setSelectedEntityId(null)
              }}
            >
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2" data-testid="activity-log-detail-content">
          {isLoadingDetail ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
              <Loader2 className="size-4 animate-spin" />
              <span>Đang tải thông tin chi tiết nhật ký...</span>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mã nhật ký:</span>
                <span className="font-mono">{logDetail?.id ?? selectedLogId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Hành động:</span>
                <Badge className="font-semibold">{logDetail?.action ?? 'RECORD'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Người thực hiện:</span>
                <span>{actorName(logDetail?.actorUserId ?? '')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Thời gian:</span>
                <span className="tabular">{stamp(logDetail?.timestamp ?? '')}</span>
              </div>
            </div>
          )}

          {selectedEntityType && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs text-foreground">
                <History className="size-3.5 text-brand-pine" />
                <span>Lịch sử trạng thái tài nguyên ({selectedEntityType})</span>
              </div>
              {isLoadingHistory ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Đang tải lịch sử thay đổi...</span>
                </div>
              ) : resourceHistory && resourceHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {resourceHistory.map((sc, idx) => (
                    <div key={idx} className="rounded border border-border bg-muted/30 p-2 text-xs">
                      <div className="flex justify-between font-medium">
                        <span>Trường: {sc.fieldName}</span>
                        <span className="text-muted-foreground tabular">{stamp(sc.changedAt)}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        <span>{sc.oldValue ?? '—'}</span> &rarr; <span className="font-semibold text-foreground">{sc.newValue ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Không có lịch sử biến động nào.</p>
              )}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
