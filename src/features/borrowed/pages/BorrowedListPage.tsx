// Đồ mượn (route /material-officer/borrowed): officer xem đồ khu mình phụ trách.
// Hẹn trả quá hạn (new Date() thật) → chữ brick "Quá hạn X ngày"; tình trạng
// trả là StatusTag (chưa trả ◇ / GOOD ✓ / DAMAGED ✕ / LOST ✕). Nút "Đã trả"
// mở dialog chọn tình trạng (useMarkReturned).
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import { viDate } from '@/lib/format'
import { useBorrowedItems, useMarkReturned } from '../api'
import { SELECT_CLS, BorrowFormDialog } from './BorrowFormDialog'
import type { BorrowedItem } from '@/types'

const CONDITIONS: NonNullable<BorrowedItem['returnedCondition']>[] = ['GOOD', 'DAMAGED', 'LOST']

// Dialog ghi trả: chọn tình trạng rồi PATCH returnedCondition (pattern select
// + missing state như SupportDetailDialog).
function ReturnDialog({ item, onClose }: { item: BorrowedItem; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const mark = useMarkReturned(item.id)
  const [condition, setCondition] = useState('')
  const [missing, setMissing] = useState(false)

  const submit = async () => {
    if (!condition) {
      setMissing(true)
      return
    }
    try {
      await mark.mutateAsync(condition as NonNullable<BorrowedItem['returnedCondition']>)
      toast(t('features.borrowed.returned', { name: item.name }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.borrowed.returnTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void submit()}>{t('features.borrowed.return')}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{item.name}</span> — {item.owner}
        </p>
        <div>
          <Label htmlFor="return-condition">{t('features.borrowed.condition')}</Label>
          <select
            id="return-condition"
            className={SELECT_CLS}
            value={condition}
            onChange={(e) => {
              setCondition(e.target.value)
              setMissing(false)
            }}
          >
            <option value="">{t('features.tasks.selectPlaceholder')}</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {t(`status.${c}`)}
              </option>
            ))}
          </select>
          {missing && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t('features.borrowed.conditionRequired')}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  )
}

// Ngày chậm so với hôm nay (đã trả thì không tính).
const daysLate = (iso: string) =>
  Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000)

export default function BorrowedListPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: items = [], isPending } = useBorrowedItems()

  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreas = isOfficer ? areas.filter((a) => a.officerId === user.id) : areas
  const myAreaIds = new Set(myAreas.map((a) => a.id))
  const rows = isOfficer ? items.filter((b) => myAreaIds.has(b.areaId)) : items

  const [creating, setCreating] = useState(false)
  const [returningId, setReturningId] = useState<string | null>(null)
  // Theo id (không giữ object) — data luôn tươi sau mutation.
  const returning = returningId ? (items.find((b) => b.id === returningId) ?? null) : null

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.borrowed.name'),
        render: (b: BorrowedItem) => <span className="font-semibold text-foreground">{b.name}</span>,
      },
      { key: 'owner', header: t('features.borrowed.owner'), render: (b: BorrowedItem) => b.owner },
      {
        key: 'area',
        header: t('features.borrowed.area'),
        render: (b: BorrowedItem) => areas.find((a) => a.id === b.areaId)?.name ?? '—',
      },
      {
        key: 'expectedReturn',
        header: t('features.borrowed.expectedReturn'),
        render: (b: BorrowedItem) => {
          const late = b.returnedCondition ? 0 : daysLate(b.expectedReturn)
          return (
            <span>
              <span className="tabular">{viDate(b.expectedReturn)}</span>
              {late > 0 && (
                <span className="ml-2 text-[11px] font-bold text-destructive">
                  {t('features.borrowed.overdue', { n: late })}
                </span>
              )}
            </span>
          )
        },
      },
      {
        key: 'returnedCondition',
        header: t('features.borrowed.condition'),
        render: (b: BorrowedItem) => <StatusTag status={b.returnedCondition ?? 'NOT_RETURNED'} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (b: BorrowedItem) =>
          b.returnedCondition ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.borrowed.return')}
                onClick={() => setReturningId(b.id)}
              >
                <Check className="size-4" />
              </Button>
            </div>
          ),
      },
    ],
    [t, areas],
  )

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreas.length) return <EmptyState text={t('features.borrowed.noArea')} />

  const totalBorrowedCount = rows.length
  const activeBorrowingCount = rows.filter((b) => !b.returnedCondition).length
  const returnedCount = rows.filter((b) => b.returnedCondition != null).length
  const overdueCount = rows.filter((b) => !b.returnedCondition && daysLate(b.expectedReturn) > 0).length

  return (
    <div>
      <PageHeader
        title={t('features.borrowed.title')}
        sub={t('features.borrowed.sub')}
        actions={
          myAreas.length > 0 && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('features.borrowed.create')}
            </Button>
          )
        }
      />

      {/* 4 StatCards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Tổng đồ mượn"
          value={totalBorrowedCount}
          unit="thiết bị"
        />
        <StatCard
          label="Đang mượn"
          value={activeBorrowingCount}
          unit="món"
          tone={activeBorrowingCount > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label="Đã hoàn trả"
          value={returnedCount}
          unit="món xong"
          tone="ok"
        />
        <StatCard
          label="Quá hạn trả"
          value={overdueCount}
          unit="món trễ"
          tone={overdueCount > 0 ? 'alert' : 'ok'}
        />
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={rows} columns={columns} emptyText={t('features.borrowed.empty')} />
      )}

      {creating && <BorrowFormDialog myAreas={myAreas} onClose={() => setCreating(false)} />}
      {returning && <ReturnDialog item={returning} onClose={() => setReturningId(null)} />}
    </div>
  )
}
