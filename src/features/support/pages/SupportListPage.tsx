// Danh sách yêu cầu hỗ trợ (route /leader/support + /community/support).
// - Leader: thấy yêu cầu khu mình lãnh + nút "Tạo yêu cầu hỗ trợ" (dialog
//   form ở SupportFormDialog, khu khóa về khu mình).
// - Committee: view điều phối — click row mở detail dialog: chọn TNV rồi
//   "Điều phối" (PATCH COORDINATED) hoặc "Đánh dấu đã giải quyết" (RESOLVED).
// Urgent tone: OPEN straw (StatusTag OPEN→warn), COORDINATED ◐, RESOLVED ✓.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { StatCard } from '@/components/shared/StatCard'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import { useAuth } from '@/lib/auth'
import {
  useApproveSupportReg,
  useRejectSupportReg,
  useSupportRegs,
  useSupportRequests,
  useUpdateSupportRequest,
} from '../api'
import { SELECT_CLS, SupportFormDialog } from './SupportFormDialog'
import type { SupportReg, SupportRequest } from '@/types'

// Detail dialog (committee): info yêu cầu + điều phối (chọn TNV) / giải quyết.
// Điều phối PATCH cả status + assigneeId (1 lần) — persist người được gán.
// ADMIN/COMMITTEE không phải TNV — loại khỏi select điều phối.
// OPEN→RESOLVED trực tiếp được phép nhưng xác nhận lại (chưa gán ai hỗ trợ).
function SupportDetailDialog({ item, onClose }: { item: SupportRequest; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: areas = [] } = useAreas()
  const { data: users = [] } = useUsers()
  const update = useUpdateSupportRequest()
  const [volunteerId, setVolunteerId] = useState('')
  const [missing, setMissing] = useState(false)
  const [confirmResolve, setConfirmResolve] = useState(false)

  const area = areas.find((a) => a.id === item.areaId)
  const volunteers = users.filter((u) => u.role !== 'PARISH' && u.role !== 'COMMUNITY')
  const volunteerName = users.find((u) => u.id === volunteerId)?.name
  const assigneeName = item.assigneeId
    ? (users.find((u) => u.id === item.assigneeId)?.name ?? '—')
    : undefined

  const act = async (patch: Partial<SupportRequest>, msg: string) => {
    try {
      await update.mutateAsync({ id: item.id, ...patch })
      toast(msg)
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        title={t('features.support.detailTitle')}
      footer={
        item.status === 'RESOLVED' ? (
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        ) : (
          <>
            {item.status === 'OPEN' && (
              <Button
                onClick={() => {
                  if (!volunteerId) {
                    setMissing(true)
                    return
                  }
                  void act(
                    { status: 'COORDINATED', assigneeId: volunteerId },
                    t('features.support.coordinated', { name: volunteerName ?? '' }),
                  )
                }}
              >
                {t('features.support.coordinate')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                item.status === 'OPEN' && !item.assigneeId
                  ? setConfirmResolve(true)
                  : void act({ status: 'RESOLVED' }, t('features.support.resolved'))
              }
            >
              {t('features.support.resolve')}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusTag status={item.status} />
          <span className="text-sm font-semibold text-foreground">
            {area?.name ?? '—'} · {t(`features.support.kind.${item.kind}`)}
          </span>
        </div>
        <p className="text-sm text-foreground">{item.detail}</p>
        {assigneeName && (
          <p className="text-sm">
            <span className="font-semibold text-foreground">
              {t('features.support.assignee')}:
            </span>{' '}
            {assigneeName}
          </p>
        )}
        {item.status === 'OPEN' && (
          <div>
            <Label htmlFor="support-volunteer">{t('features.support.volunteer')}</Label>
            <select
              id="support-volunteer"
              className={SELECT_CLS}
              value={volunteerId}
              onChange={(e) => {
                setVolunteerId(e.target.value)
                setMissing(false)
              }}
            >
              <option value="">{t('features.tasks.selectPlaceholder')}</option>
              {volunteers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {missing && (
              <p className="mt-1 text-xs font-semibold text-destructive">
                {t('features.support.volunteerRequired')}
              </p>
            )}
          </div>
        )}
      </div>
      </Dialog>
      {confirmResolve && (
        <ConfirmDialog
          open
          title={t('features.support.resolve')}
          description={t('features.support.resolveUncoordinated')}
          confirmLabel={t('features.support.resolve')}
          onConfirm={() => void act({ status: 'RESOLVED' }, t('features.support.resolved'))}
          onClose={() => setConfirmResolve(false)}
        />
      )}
    </>
  )
}

// Đơn đăng ký hỗ trợ nhân lực liên cộng đoàn chờ duyệt (leader).
// TNV cộng đoàn khác gửi SupportReg (PENDING) vào các yêu cầu thuộc khu mình lãnh.
// Duyệt = useApproveSupportReg (reg APPROVED + tính lại fulfill của request);
// Từ chối = useRejectSupportReg. Chỉ hiện khi có đơn — tránh chiếm chỗ khi rảnh.
function SupportRegsSection({
  regs,
  requests,
  areaIds,
}: {
  regs: SupportReg[]
  requests: SupportRequest[]
  areaIds: Set<string>
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: areas = [] } = useAreas()
  const { data: users = [] } = useUsers()
  const approve = useApproveSupportReg()
  const reject = useRejectSupportReg()
  const [confirmReject, setConfirmReject] = useState<SupportReg | null>(null)

  const requestOf = (id: string) => requests.find((r) => r.id === id)
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'
  const volunteerName = (id: string) => users.find((u) => u.id === id)?.name ?? '—'

  // Chỉ đơn PENDING thuộc yêu cầu của khu mình lãnh.
  const rows = regs.filter(
    (g) => g.status === 'PENDING' && areaIds.has(requestOf(g.requestId)?.areaId ?? ''),
  )

  if (rows.length === 0) return null

  const act = async (
    reg: SupportReg,
    fn: { mutateAsync: (r: SupportReg) => Promise<unknown> },
    msg: string,
  ) => {
    try {
      await fn.mutateAsync(reg)
      toast(msg)
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = [
    {
      key: 'volunteer',
      header: t('features.support.regVolunteer'),
      render: (g: SupportReg) => (
        <span className="font-semibold text-foreground">{volunteerName(g.volunteerId)}</span>
      ),
    },
    {
      key: 'request',
      header: t('features.support.regRequest'),
      render: (g: SupportReg) => requestOf(g.requestId)?.detail ?? '—',
    },
    {
      key: 'area',
      header: t('features.support.area'),
      render: (g: SupportReg) => {
        const req = requestOf(g.requestId)
        return req ? areaName(req.areaId) : '—'
      },
    },
    {
      key: 'note',
      header: t('features.support.regNote'),
      render: (g: SupportReg) =>
        g.note ? (
          <span className="text-muted-foreground">{g.note}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      render: (g: SupportReg) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              void act(g, approve, t('features.support.regApproved'))
            }}
          >
            <Check className="size-4" />
            {t('common.approve')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmReject(g)
            }}
          >
            <X className="size-4" />
            {t('common.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Card className="mb-4 p-4">
      <h2 className="text-sm font-bold text-foreground">{t('features.support.regsTitle')}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t('features.support.regsSub')}</p>
      <div className="mt-3">
        <DataTable rows={rows} columns={columns} emptyText={t('features.support.regsEmpty')} />
      </div>
      {confirmReject && (
        <ConfirmDialog
          open
          title={t('features.support.regRejectTitle')}
          description={t('features.support.regRejectDesc')}
          tone="destructive"
          confirmLabel={t('common.reject')}
          onConfirm={() => void act(confirmReject, reject, t('features.support.regRejected'))}
          onClose={() => setConfirmReject(null)}
        />
      )}
    </Card>
  )
}

export default function SupportListPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: areas = [] } = useAreas()
  const { data: users = [] } = useUsers()
  const { data: requests = [], isPending } = useSupportRequests()
  const { data: regs = [] } = useSupportRegs()

  const isLeader = user?.role === 'LEADER'
  const myAreas = areas.filter((a) => a.leaderId === user?.id)
  const myAreaIds = new Set(myAreas.map((a) => a.id))
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? '—'

  // Leader: yêu cầu của khu mình lãnh; committee/parish: tất cả.
  const rows = isLeader ? requests.filter((r) => myAreaIds.has(r.areaId)) : requests

  const [creating, setCreating] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  // Theo id (không giữ object) — data luôn tươi sau mutation.
  const viewing = viewingId ? (requests.find((r) => r.id === viewingId) ?? null) : null

  const columns = useMemo(
    () => [
      {
        key: 'area',
        header: t('features.support.area'),
        render: (r: SupportRequest) => areaName(r.areaId),
      },
      {
        key: 'kind',
        header: t('features.support.kind'),
        render: (r: SupportRequest) => t(`features.support.kind.${r.kind}`),
      },
      {
        key: 'detail',
        header: t('features.support.detail'),
        render: (r: SupportRequest) => <span className="text-muted-foreground">{r.detail}</span>,
      },
      {
        key: 'assignee',
        header: t('features.support.assignee'),
        render: (r: SupportRequest) =>
          r.assigneeId ? (
            (users.find((u) => u.id === r.assigneeId)?.name ?? '—')
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (r: SupportRequest) => <StatusTag status={r.status} />,
      },
    ],
    [t, areas, users],
  )

  const openCount = rows.filter((r) => r.status === 'OPEN').length
  const coordCount = rows.filter((r) => r.status === 'COORDINATED').length
  const resolvedCount = rows.filter((r) => r.status === 'RESOLVED').length

  return (
    <div>
      <PageHeader
        title={t('features.support.title')}
        sub={t('features.support.sub')}
        actions={
          isLeader &&
          myAreas.length > 0 && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('features.support.create')}
            </Button>
          )
        }
      />

      {/* 4 StatCards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t('features.support.title')}
          value={rows.length}
          unit="yêu cầu"
        />
        <StatCard
          label={t('status.OPEN')}
          value={openCount}
          unit="chờ xử lý"
          tone={openCount > 0 ? 'alert' : 'ok'}
        />
        <StatCard
          label={t('status.COORDINATED')}
          value={coordCount}
          unit="đang hỗ trợ"
          tone="warn"
        />
        <StatCard
          label={t('status.RESOLVED')}
          value={resolvedCount}
          unit="đã giải quyết"
          tone="ok"
        />
      </div>

      {/* Leader: đơn đăng ký hỗ trợ liên cộng đoàn chờ duyệt (gộp từ tab cũ). */}
      {isLeader && !isPending && (
        <SupportRegsSection regs={regs} requests={requests} areaIds={myAreaIds} />
      )}

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          emptyText={t('features.support.empty')}
          // Committee click row để điều phối; leader chỉ xem.
          onRowClick={isLeader ? undefined : (r) => setViewingId(r.id)}
        />
      )}

      {creating && <SupportFormDialog myAreas={myAreas} onClose={() => setCreating(false)} />}
      {viewing && <SupportDetailDialog item={viewing} onClose={() => setViewingId(null)} />}
    </div>
  )
}
