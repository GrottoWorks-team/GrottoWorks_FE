// Trang checklist sẵn sàng (route /leader/checklist + /community/checklist):
// mỗi khu 1 card vòm — tên khu + vòng % hoàn thành (Recharts RadialBar) +
// danh sách items với switch. Leader toggle được (toast sau mutation);
// committee/parish xem read-only. Banner tổng: mọi khu 100% → moss
// "Sẵn sàng đón Lễ", ngược lại straw "Đang chuẩn bị X/Y mục".
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { RadialBar, RadialBarChart } from 'recharts'
import { CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useChecklist, useToggleItem } from '../api'
import type { ChecklistItem, WorkArea } from '@/types'

// Switch tay (không có primitive switch): role="switch" + aria-checked,
// knob trượt bằng transition-transform — reduced-motion đã xử lý global.
function Switch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-brand-pine bg-brand-pine' : 'border-border bg-background',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-3.5 rounded-full bg-card shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

// Card 1 khu: vòng tiến độ + danh sách items.
function AreaChecklistCard({
  area,
  items,
  editable,
}: {
  area: WorkArea
  items: ChecklistItem[]
  editable: boolean
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const toggle = useToggleItem()

  const done = items.filter((x) => x.done).length
  const percent = items.length ? Math.round((done / items.length) * 100) : 0

  const onToggle = async (item: ChecklistItem) => {
    try {
      await toggle.mutateAsync({ id: item.id, done: !item.done })
      toast(t('features.checklist.toggled', { label: item.label }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Card className="g-item p-5">
      <div className="flex items-center gap-4">
        <div
          className="relative size-20 shrink-0"
          role="img"
          aria-label={`${t('features.areas.progress')}: ${percent}%`}
        >
          <RadialBarChart
            width={80}
            height={80}
            innerRadius="68%"
            outerRadius="100%"
            data={[{ value: percent, fill: '#0A5C36' }]}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" background={{ fill: '#E9ECEF' }} cornerRadius={10} />
          </RadialBarChart>
          <p className="tabular absolute inset-0 grid place-items-center text-sm font-extrabold text-foreground">
            {percent}%
          </p>
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-foreground">{area.name}</h3>
          <p className="lbl-mono mt-1">
            {done}/{items.length} {t('features.checklist.itemUnit')}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3 border-t border-border pt-4">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm',
                  item.done ? 'text-muted-foreground line-through' : 'font-semibold text-foreground',
                )}
              >
                {item.label}
              </p>
              {item.note && <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>}
            </div>
            <Switch
              checked={item.done}
              label={item.label}
              onToggle={() => void onToggle(item)}
              disabled={!editable || toggle.isPending}
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function ChecklistPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: areas = [] } = useAreas()
  const { data: items = [], isPending } = useChecklist()

  // Leader: các khu mình lãnh (được toggle); committee/parish: mọi khu read-only.
  // Memo hóa — totals dưới đây deps vào mảng này, không tạo mảng mới mỗi render.
  const isLeader = user?.role === 'LEADER'
  const myAreas = useMemo(
    () => (isLeader ? areas.filter((a) => a.leaderId === user?.id) : areas),
    [isLeader, areas, user?.id],
  )

  const itemsOf = (areaId: string) => items.filter((x) => x.areaId === areaId)

  const totals = useMemo(() => {
    let done = 0
    let total = 0
    for (const a of myAreas) {
      const xs = itemsOf(a.id)
      done += xs.filter((x) => x.done).length
      total += xs.length
    }
    return { done, total }
  }, [myAreas, items])

  const allReady = totals.total > 0 && totals.done === totals.total

  return (
    <div>
      <PageHeader
        title={t('features.checklist.title')}
        sub={isLeader ? t('features.checklist.subLeader') : t('features.checklist.subCommittee')}
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : isLeader && myAreas.length === 0 ? (
        <EmptyState text={t('features.tasks.noArea')} />
      ) : (
        <>
          {/* 3 StatCards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label={t('features.checklist.title')}
              value={totals.total}
              unit="hạng mục"
            />
            <StatCard
              label="Đã hoàn thành"
              value={totals.done}
              unit="mục xong"
              tone="ok"
            />
            <StatCard
              label="Tỷ lệ sẵn sàng"
              value={totals.total ? Math.round((totals.done / totals.total) * 100) : 0}
              unit="%"
              tone={allReady ? 'ok' : 'warn'}
            />
          </div>

          <div
            className={cn(
              'mb-6 flex items-center gap-4 rounded-card border p-5 shadow-xs transition-all',
              allReady
                ? 'border-brand-pine bg-brand-pine/10 text-brand-pine'
                : 'border-brand-gold bg-brand-gold/10 text-amber-900 dark:text-amber-300',
            )}
          >
            {allReady ? (
              <CheckCircle2 className="size-10 shrink-0 text-brand-pine" aria-hidden />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center text-2xl font-bold text-amber-600 dark:text-amber-400" aria-hidden>
                ◐
              </span>
            )}
            <div>
              <p className="text-lg font-extrabold text-foreground">
                {allReady
                  ? t('features.checklist.ready')
                  : t('features.checklist.preparing', { done: totals.done, total: totals.total })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allReady
                  ? 'Tất cả các khu vực đã hoàn tất công tác kiểm tra, sẵn sàng cho Đại Lễ Giáng Sinh.'
                  : 'Vui lòng tiếp tục rà soát các hạng mục còn lại theo từng phân khu phụ trách.'}
              </p>
            </div>
          </div>

          <div className="stagger grid gap-4 md:grid-cols-2">
            {myAreas.map((a, i) => (
              <div key={a.id} style={{ '--d': i } as CSSProperties}>
                <AreaChecklistCard area={a} items={itemsOf(a.id)} editable={isLeader} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
