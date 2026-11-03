// Checklist sẵn sàng (/leader/checklist, /community/checklist) — BE Readiness.
// Leader tạo phiếu cho khu của mình, ghi kết quả PASSED/FAILED từng hạng mục,
// xác nhận READY. Committee xem read-only.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import {
  useConfirmReadiness,
  useCreateReadinessCheck,
  useReadinessCheck,
  useRecheckReadinessItem,
  useRecordReadinessResult,
  useSeasonReadiness,
} from '../api'
import type { ReadinessItem } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

function CreateCheckDialog({ areaId, onClose }: { areaId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateReadinessCheck()
  const [name, setName] = useState(t('features.checklist.defaultName'))
  const [items, setItems] = useState([{ name: '', mandatory: true }])

  const submit = async () => {
    const cleaned = items.filter((i) => i.name.trim())
    if (!name.trim() || cleaned.length === 0) {
      toast(t('features.checklist.itemRequired'), 'alert')
      return
    }
    try {
      await create.mutateAsync({ workAreaId: areaId, name: name.trim(), items: cleaned })
      toast(t('features.checklist.created'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.checklist.createTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="check-name">{t('features.checklist.name')}</Label>
          <Input id="check-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <Label>{t('features.checklist.items')}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setItems((prev) => [...prev, { name: '', mandatory: true }])}
          >
            <Plus className="size-4" />
            {t('features.checklist.addItem')}
          </Button>
        </div>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              aria-label={`${t('features.checklist.itemName')} ${index + 1}`}
              placeholder={t('features.checklist.itemName')}
              value={item.name}
              onChange={(e) =>
                setItems((prev) => prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)))
              }
            />
            <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={item.mandatory}
                onChange={(e) =>
                  setItems((prev) => prev.map((x, i) => (i === index ? { ...x, mandatory: e.target.checked } : x)))
                }
              />
              {t('features.checklist.mandatory')}
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('common.delete')}
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

export default function ChecklistPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [] } = useScopedAreas()
  const isLeader = user?.role === 'LEADER'
  const myAreas = useMemo(
    () => (isLeader ? areas.filter((a) => a.leaderId === user?.id) : areas),
    [isLeader, areas, user?.id],
  )
  const [areaId, setAreaId] = useState('')
  const selected = myAreas.find((a) => a.id === areaId) ?? myAreas[0]

  const { data: seasonReadiness, isPending: seasonPending } = useSeasonReadiness(selected?.seasonId)
  const row = seasonReadiness?.areas.find((a) => a.workAreaId === selected?.id)
  const { data: check, isPending: checkPending } = useReadinessCheck(row?.readinessCheckId)

  const record = useRecordReadinessResult()
  const recheck = useRecheckReadinessItem()
  const confirm = useConfirmReadiness()
  const [creating, setCreating] = useState(false)

  const setResult = async (item: ReadinessItem, result: 'PASSED' | 'FAILED') => {
    if (!check) return
    try {
      await record.mutateAsync({ checkId: check.id, itemId: item.id, version: check.version, result })
      toast(t('features.checklist.saved'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const runRecheck = async (item: ReadinessItem, result: 'PASSED' | 'FAILED') => {
    if (!check) return
    try {
      await recheck.mutateAsync({ checkId: check.id, itemId: item.id, version: check.version, result })
      toast(t('features.checklist.saved'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const onConfirm = async () => {
    if (!check) return
    try {
      await confirm.mutateAsync({ checkId: check.id, version: check.version })
      toast(t('features.checklist.confirmed'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: t('features.checklist.itemName'), render: (i: ReadinessItem) => <span className="font-semibold text-foreground">{i.name}</span> },
      {
        key: 'mandatory',
        header: t('features.checklist.mandatory'),
        render: (i: ReadinessItem) => (i.mandatory ? t('common.yes') : '—'),
      },
      { key: 'status', header: t('common.status'), render: (i: ReadinessItem) => <StatusTag status={i.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (i: ReadinessItem) => {
          if (!isLeader) return <span className="text-muted-foreground">—</span>
          if (i.status === 'PENDING') {
            return (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setResult(i, 'PASSED')}>
                  <Check className="size-4" /> {t('features.checklist.pass')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setResult(i, 'FAILED')}>
                  <X className="size-4" /> {t('features.checklist.fail')}
                </Button>
              </div>
            )
          }
          if (i.status === 'RECHECK') {
            return (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => runRecheck(i, 'PASSED')}>
                  <Check className="size-4" /> {t('features.checklist.recheck')}
                </Button>
              </div>
            )
          }
          return <span className="text-muted-foreground">—</span>
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, isLeader, check?.version],
  )

  if (!myAreas.length && isLeader) return <EmptyState text={t('features.tasks.noArea')} />

  return (
    <div>
      <PageHeader
        title={t('features.checklist.title')}
        sub={isLeader ? t('features.checklist.subLeader') : t('features.checklist.subCommittee')}
      />

      <Card className="mb-6 p-5">
        <Label htmlFor="check-area">{t('features.checklist.area')}</Label>
        <select
          id="check-area"
          className={SELECT_CLS}
          value={selected?.id ?? ''}
          onChange={(e) => setAreaId(e.target.value)}
        >
          {myAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Card>

      {seasonPending || checkPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : !selected ? null : !row?.readinessCheckId ? (
        <div className="space-y-3">
          <EmptyState text={t('features.checklist.noCheck')} />
          {isLeader && (
            <div className="flex justify-center">
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                {t('features.checklist.create')}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard label={t('features.checklist.items')} value={row.totalItems} unit={t('features.checklist.itemUnit')} />
            <StatCard label={t('features.checklist.passed')} value={row.passedItems} unit={t('features.checklist.itemUnit')} tone="ok" />
            <StatCard label={t('features.checklist.failed')} value={row.failedItems} unit={t('features.checklist.itemUnit')} tone="alert" />
            <StatCard label={t('features.checklist.pending')} value={row.pendingItems} unit={t('features.checklist.itemUnit')} />
          </div>

          <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-foreground">{check?.name ?? t('features.checklist.title')}</span>
              {check && <StatusTag status={check.status} />}
            </div>
            {isLeader && check && check.status !== 'READY' && (
              <Button onClick={onConfirm} disabled={confirm.isPending}>
                {t('features.checklist.confirm')}
              </Button>
            )}
          </Card>

          {check && (
            <DataTable
              rows={check.items}
              columns={columns}
              emptyText={t('features.checklist.itemRequired')}
            />
          )}
        </>
      )}

      {creating && selected && <CreateCheckDialog areaId={selected.id} onClose={() => setCreating(false)} />}
    </div>
  )
}