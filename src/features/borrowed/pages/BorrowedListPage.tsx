// Đồ mượn (/material-officer/borrowed) — BE Resource.
// MO nhận/từ chối chào cho mượn, xác nhận đã nhận đồ, ghi trả và sự cố.
// Volunteer tạo chào cho mượn trên app mobile nên web không có form tạo.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, RotateCcw, ShieldAlert, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useScopedAreas } from '@/features/areas/api'
import { ApiError } from '@/lib/api'
import { viDate } from '@/lib/format'
import {
  useAcceptLoanOffer,
  useAssignBorrowedItem,
  useBorrowedIncident,
  useBorrowedItems,
  useIssueBorrowedItem,
  useLoanOffers,
  useOverdueBorrowedItems,
  useRejectLoanOffer,
  useReturnBorrowedItem,
} from '../api'
import type { BorrowedItem, ReturnCondition } from '@/types'

const SELECT_CLS =
  'mt-1 flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

function AcceptDialog({ offer, onClose }: { offer: BorrowedItem; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: areas = [] } = useScopedAreas()
  const accept = useAcceptLoanOffer()
  const [areaId, setAreaId] = useState(offer.workAreaId ?? '')
  const [returnDate, setReturnDate] = useState(offer.expectedReturnDate)

  const submit = async () => {
    try {
      await accept.mutateAsync({
        offerId: offer.id,
        version: offer.version,
        workAreaId: areaId || undefined,
        expectedReturnDate: returnDate || undefined,
      })
      toast(t('features.borrowed.accepted'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.borrowed.acceptTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={accept.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="accept-area">{t('features.borrowed.area')}</Label>
          <select id="accept-area" className={SELECT_CLS} value={areaId} onChange={(e) => setAreaId(e.target.value)}>
            <option value="">{t('features.tasks.selectPlaceholder')}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="accept-return">{t('features.borrowed.expectedReturn')}</Label>
          <Input id="accept-return" type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}

function ReasonDialog({
  title,
  onClose,
  onSubmit,
}: {
  title: string
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              void onSubmit(reason).then(onClose)
            }}
          >
            {t('common.confirm')}
          </Button>
        </>
      }
    >
      <Label htmlFor="reason">{t('features.borrowed.reason')}</Label>
      <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="mt-1 text-xs text-muted-foreground">{t('features.borrowed.reasonHint')}</p>
    </Dialog>
  )
}

function ReturnDialog({ item, onClose }: { item: BorrowedItem; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const ret = useReturnBorrowedItem()
  const [condition, setCondition] = useState<ReturnCondition>('GOOD')
  const [qty, setQty] = useState(String(item.quantity))
  const [note, setNote] = useState('')

  const submit = async () => {
    try {
      await ret.mutateAsync({
        itemId: item.id,
        condition,
        returnedQuantity: Number(qty),
        note: note || undefined,
      })
      toast(t('features.borrowed.returned', { name: item.itemName }))
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
          <Button onClick={submit} disabled={ret.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="return-condition">{t('features.borrowed.condition')}</Label>
          <select
            id="return-condition"
            className={SELECT_CLS}
            value={condition}
            onChange={(e) => setCondition(e.target.value as ReturnCondition)}
          >
            <option value="GOOD">{t('features.borrowed.condition.GOOD')}</option>
            <option value="DAMAGED">{t('features.borrowed.condition.DAMAGED')}</option>
            <option value="LOST">{t('features.borrowed.condition.LOST')}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="return-qty">{t('features.borrowed.returnedQty')}</Label>
          <Input id="return-qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="return-note">{t('features.purchases.note')}</Label>
          <Input id="return-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}

function IncidentDialog({ item, onClose }: { item: BorrowedItem; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const incident = useBorrowedIncident()
  const [condition, setCondition] = useState<ReturnCondition>('DAMAGED')
  const [qty, setQty] = useState('1')
  const [description, setDescription] = useState('')

  const submit = async () => {
    if (!description.trim()) {
      toast(t('features.borrowed.descriptionRequired'), 'alert')
      return
    }
    try {
      await incident.mutateAsync({
        itemId: item.id,
        condition,
        quantity: Number(qty),
        description: description.trim(),
      })
      toast(t('features.borrowed.incidentRecorded'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.borrowed.incidentTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={incident.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="incident-condition">{t('features.borrowed.condition')}</Label>
          <select
            id="incident-condition"
            className={SELECT_CLS}
            value={condition}
            onChange={(e) => setCondition(e.target.value as ReturnCondition)}
          >
            <option value="DAMAGED">{t('features.borrowed.condition.DAMAGED')}</option>
            <option value="LOST">{t('features.borrowed.condition.LOST')}</option>
          </select>
        </div>
        <div>
          <Label htmlFor="incident-qty">{t('features.borrowed.incidentQty')}</Label>
          <Input id="incident-qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="incident-desc">{t('features.borrowed.description')}</Label>
          <Input id="incident-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
    </Dialog>
  )
}

function AssignDialog({ item, onClose }: { item: BorrowedItem; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const assign = useAssignBorrowedItem()
  const { data: areas = [] } = useScopedAreas()
  const [areaId, setAreaId] = useState(item.workAreaId ?? '')

  const submit = async () => {
    try {
      await assign.mutateAsync({ itemId: item.id, version: item.version, workAreaId: areaId })
      toast(t('features.borrowed.assigned'))
      onClose()
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.borrowed.assignTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!areaId || assign.isPending} onClick={() => void submit()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{item.itemName}</p>
        <Label htmlFor="borrowed-assign-area">{t('features.borrowed.assignArea')}</Label>
        <select
          id="borrowed-assign-area"
          className={SELECT_CLS}
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
        >
          <option value="">{t('common.selectPlaceholder')}</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>
    </Dialog>
  )
}

export default function BorrowedListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: offers = [], isPending: offersPending } = useLoanOffers('OFFERED')
  const { data: items = [], isPending: itemsPending } = useBorrowedItems()
  const { data: overdue = [] } = useOverdueBorrowedItems()
  const issue = useIssueBorrowedItem()
  const reject = useRejectLoanOffer()

  const [accepting, setAccepting] = useState<BorrowedItem | null>(null)
  const [rejecting, setRejecting] = useState<BorrowedItem | null>(null)
  const [returning, setReturning] = useState<BorrowedItem | null>(null)
  const [incident, setIncident] = useState<BorrowedItem | null>(null)
  const [assigning, setAssigning] = useState<BorrowedItem | null>(null)

  const borrowable = useMemo(() => items.filter((item) => item.status !== 'OFFERED'), [items])

  const offerColumns = useMemo(
    () => [
      { key: 'item', header: t('features.borrowed.name'), render: (o: BorrowedItem) => <span className="font-semibold text-foreground">{o.itemName}</span> },
      { key: 'owner', header: t('features.borrowed.owner'), render: (o: BorrowedItem) => o.ownerName },
      { key: 'qty', header: t('features.allocations.qty'), align: 'right' as const, render: (o: BorrowedItem) => <span className="tabular">{o.quantity}</span> },
      { key: 'return', header: t('features.borrowed.expectedReturn'), render: (o: BorrowedItem) => <span className="tabular">{viDate(o.expectedReturnDate)}</span> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (o: BorrowedItem) => (
          <div className="flex justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setAccepting(o)}>
              <CheckCircle2 className="size-4" /> {t('features.borrowed.accept')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRejecting(o)}>
              <X className="size-4" /> {t('features.borrowed.reject')}
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  const itemColumns = useMemo(
    () => [
      { key: 'item', header: t('features.borrowed.name'), render: (i: BorrowedItem) => <span className="font-semibold text-foreground">{i.itemName}</span> },
      { key: 'owner', header: t('features.borrowed.owner'), render: (i: BorrowedItem) => i.ownerName },
      { key: 'qty', header: t('features.allocations.qty'), align: 'right' as const, render: (i: BorrowedItem) => <span className="tabular">{i.quantity}</span> },
      { key: 'status', header: t('common.status'), render: (i: BorrowedItem) => <StatusTag status={i.status} /> },
      {
        key: 'due',
        header: t('features.borrowed.expectedReturn'),
        render: (i: BorrowedItem) => (
          <span className={i.overdue ? 'tabular font-semibold text-status-dangerText' : 'tabular'}>
            {viDate(i.expectedReturnDate)}
            {i.overdue && ` · ${t('features.borrowed.overdue', { n: '' })}`}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (i: BorrowedItem) => (
          <div className="flex justify-end gap-1">
            {i.status === 'ACCEPTED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await issue.mutateAsync({ itemId: i.id })
                    toast(t('features.borrowed.issued'))
                  } catch {
                    toast(t('common.error'), 'alert')
                  }
                }}
              >
                {t('features.borrowed.issue')}
              </Button>
            )}
            {(i.status === 'ISSUED' || i.status === 'IN_USE') && (
              <>
                <Button size="sm" variant="outline" onClick={() => setReturning(i)}>
                  <RotateCcw className="size-4" /> {t('features.borrowed.return')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIncident(i)}>
                  <ShieldAlert className="size-4" /> {t('features.borrowed.incident')}
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const overdueColumns = useMemo(
    () => [
      {
        key: 'item',
        header: t('features.borrowed.name'),
        render: (o: BorrowedItem) => <span className="font-semibold text-foreground">{o.itemName}</span>,
      },
      {
        key: 'owner',
        header: t('features.borrowed.owner'),
        render: (o: BorrowedItem) => o.ownerName,
      },
      {
        key: 'return',
        header: t('features.borrowed.expectedReturn'),
        render: (o: BorrowedItem) => <span className="tabular">{viDate(o.expectedReturnDate)}</span>,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (o: BorrowedItem) => (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setAssigning(o)}>
              {t('features.borrowed.assign')}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  return (
    <div>
      <PageHeader title={t('features.borrowed.title')} sub={t('features.borrowed.sub')} />

      <h2 className="mb-3 font-semibold text-foreground">{t('features.borrowed.offersTitle')}</h2>
      {offersPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={offers} columns={offerColumns} emptyText={t('features.borrowed.noOffers')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.borrowed.itemsTitle')}</h2>
      {itemsPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable rows={borrowable} columns={itemColumns} emptyText={t('features.borrowed.empty')} />
      )}

      <h2 className="mb-3 mt-8 font-semibold text-foreground">{t('features.borrowed.overdueTitle')}</h2>
      {overdue.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('features.borrowed.noOverdue')}</p>
      ) : (
        <DataTable
          rows={overdue}
          columns={overdueColumns}
          emptyText={t('features.borrowed.noOverdue')}
        />
      )}

      {accepting && <AcceptDialog offer={accepting} onClose={() => setAccepting(null)} />}
      {assigning && <AssignDialog item={assigning} onClose={() => setAssigning(null)} />}
      {returning && <ReturnDialog item={returning} onClose={() => setReturning(null)} />}
      {incident && <IncidentDialog item={incident} onClose={() => setIncident(null)} />}
      {rejecting && (
        <ReasonDialog
          title={t('features.borrowed.rejectTitle')}
          onClose={() => setRejecting(null)}
          onSubmit={async (reason) => {
            try {
              await reject.mutateAsync({ offerId: rejecting.id, version: rejecting.version, reason })
              toast(t('features.borrowed.rejected'))
            } catch {
              toast(t('common.error'), 'alert')
            }
          }}
        />
      )}
    </div>
  )
}