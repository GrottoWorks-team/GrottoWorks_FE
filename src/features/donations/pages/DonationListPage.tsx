// Sổ quyên góp (route /material-officer/donations): officer xem cam kết vật tư khu
// mình phụ trách + quà tiền; committee/parish thấy tất cả. "Ghi nhận quyên
// góp" (dialog nhập TỔNG số đã nhận → status tự suy + material.donatedReceived
// đồng bộ theo delta) và "Thêm cam kết" (DonationFormDialog). Filter chips
// theo status, search theo donorName, xuất CSV.
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Ban, ClipboardCheck, Download, Plus, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useMaterials } from '@/features/materials/api'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import i18n from '@/lib/i18n'
import { useDonations, useRecordReception, useUpdateDonation } from '../api'
import { DonationFormDialog } from './DonationFormDialog'
import type { Donation, Material } from '@/types'

// Dialog ghi nhận: nhập tổng số đã nhận (mặc định = số hiện tại); status và
// đồng bộ material do useRecordReception xử lý.
function ReceptionDialog({
  item,
  material,
  onClose,
}: {
  item: Donation
  material?: Material
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const record = useRecordReception(item.id)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ receivedQty: number }>({
    resolver: zodResolver(
      z.object({
        receivedQty: z.preprocess(
          (v) => (v === '' || v == null ? undefined : v),
          z.coerce
            .number({ invalid_type_error: 'features.donations.receivedInvalid' })
            .min(0, 'features.donations.receivedInvalid'),
        ),
      }),
    ),
    defaultValues: { receivedQty: item.receivedQty },
  })

  const onSubmit = async (data: { receivedQty: number }) => {
    try {
      await record.mutateAsync(data.receivedQty)
      toast(t('features.donations.recorded'))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.donations.recordTitle')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="reception-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="reception-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {material && item.promisedQty != null && (
          <p className="text-sm">
            <span className="font-semibold text-foreground">{material.name}</span>{' '}
            — {t('features.donations.pledgedOf', { n: item.promisedQty, unit: material.unit })}
          </p>
        )}
        <div>
          <Label htmlFor="reception-qty">{t('features.donations.receivedQty')}</Label>
          <Input id="reception-qty" type="number" min={0} step={1} {...register('receivedQty')} />
          {errors.receivedQty?.message && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              {t(errors.receivedQty.message)}
            </p>
          )}
        </div>
      </form>
    </Dialog>
  )
}

export default function DonationListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { data: areas = [], isPending: areasPending } = useAreas()
  const { data: materials = [] } = useMaterials()
  const { data: donations = [], isPending } = useDonations()
  const update = useUpdateDonation()

  // Officer: cam kết vật tư khu mình phụ trách + quà tiền (không gắn khu).
  const isOfficer = user?.role === 'MATERIAL_OFFICER'
  const myAreaIds = new Set(
    isOfficer ? areas.filter((a) => a.officerId === user.id).map((a) => a.id) : [],
  )
  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials])
  const rows = isOfficer
    ? donations.filter((d) => {
        const areaId = d.materialId ? materialById.get(d.materialId)?.areaId : undefined
        return areaId === undefined || myAreaIds.has(areaId)
      })
    : donations
  const formMaterials = isOfficer ? materials.filter((m) => myAreaIds.has(m.areaId)) : materials

  const [creating, setCreating] = useState(false)
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [canceling, setCanceling] = useState<Donation | null>(null)
  const [unusable, setUnusable] = useState<Donation | null>(null)
  // Quà tiền PLEDGED → xác nhận 1 bước RECEIVED_FULL (không dialog nhận số lượng).
  const [receivingMoney, setReceivingMoney] = useState<Donation | null>(null)
  // Theo id (không giữ object) — data luôn tươi sau mutation.
  const recording = recordingId ? (donations.find((d) => d.id === recordingId) ?? null) : null

  const fmt = (n: number) => n.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN')
  const unitOf = (d: Donation) => (d.materialId ? materialById.get(d.materialId)?.unit : undefined)

  const columns = useMemo(
    () => [
      {
        key: 'donorName',
        header: t('features.donations.donor'),
        render: (d: Donation) => <span className="font-semibold text-foreground">{d.donorName}</span>,
      },
      {
        key: 'material',
        header: t('features.donations.material'),
        render: (d: Donation) =>
          d.materialId ? (
            <span>
              {materialById.get(d.materialId)?.name ?? '—'}
              {unitOf(d) && <span className="text-xs text-muted-foreground"> ({unitOf(d)})</span>}
            </span>
          ) : (
            <span className="tabular font-semibold text-brand-gold">
              {t('features.donations.money')} · {fmt(d.monetary ?? 0)}
            </span>
          ),
      },
      {
        key: 'promisedQty',
        header: t('features.donations.promised'),
        align: 'right' as const,
        render: (d: Donation) =>
          d.promisedQty != null ? (
            <span className="tabular">
              {d.promisedQty} {unitOf(d)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'receivedQty',
        header: t('features.donations.receivedCol'),
        align: 'right' as const,
        render: (d: Donation) =>
          d.receivedQty != null ? (
            <span className="tabular">{d.receivedQty}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { key: 'status', header: t('common.status'), render: (d: Donation) => <StatusTag status={d.status} /> },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (d: Donation) =>
          d.status === 'PLEDGED' || d.status === 'RECEIVED_PARTIAL' ? (
            <div className="flex justify-end gap-1">
              {d.materialId ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('features.donations.record')}
                  onClick={() => setRecordingId(d.id)}
                >
                  <ClipboardCheck className="size-4" />
                </Button>
              ) : (
                d.status === 'PLEDGED' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('features.donations.receiveMoney')}
                    onClick={() => setReceivingMoney(d)}
                  >
                    <ClipboardCheck className="size-4" />
                  </Button>
                )
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.donations.unusable')}
                onClick={() => setUnusable(d)}
              >
                <XCircle className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('features.donations.cancel')}
                onClick={() => setCanceling(d)}
              >
                <Ban className="size-4" />
              </Button>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, materialById],
  )

  const onExport = () => {
    exportCsv(
      'grottoworks-quyen-gop.csv',
      rows.map((d) => ({
        [t('features.donations.donor')]: d.donorName,
        [t('features.donations.material')]: d.materialId
          ? (materialById.get(d.materialId)?.name ?? '—')
          : t('features.donations.money'),
        [t('features.donations.promised')]: d.promisedQty ?? d.monetary ?? '',
        [t('features.donations.receivedCol')]: d.receivedQty ?? '',
        [t('common.status')]: t(`status.${d.status}`),
      })),
    )
    toast(t('features.donations.exported'))
  }

  if (areasPending) return <p className="lbl-mono">{t('common.loading')}</p>
  if (isOfficer && !myAreaIds.size) return <EmptyState text={t('features.donations.noArea')} />

  const totalPledgedCount = rows.length
  const fullReceivedCount = rows.filter((d) => d.status === 'RECEIVED_FULL').length
  const pendingReceiveCount = rows.filter((d) => d.status === 'PLEDGED' || d.status === 'RECEIVED_PARTIAL').length
  const totalMoney = rows.reduce((s, d) => s + (d.monetary ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={t('features.donations.title')}
        sub={t('features.donations.sub')}
        actions={
          <>
            <Button variant="outline" onClick={onExport} disabled={!rows.length}>
              <Download className="size-4" />
              {t('features.donations.export')}
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('features.donations.create')}
            </Button>
          </>
        }
      />

      {/* 4 StatCards */}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Tổng cam kết"
          value={totalPledgedCount}
          unit="lượt"
        />
        <StatCard
          label="Đã nhận đủ"
          value={fullReceivedCount}
          unit="lượt xong"
          tone="ok"
        />
        <StatCard
          label="Đang chờ tiếp nhận"
          value={pendingReceiveCount}
          unit="lượt chờ"
          tone={pendingReceiveCount > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label="Tiền quyên góp"
          value={totalMoney}
          unit="₫"
          tone="ok"
        />
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          searchKeys={['donorName']}
          filters={[
            {
              key: 'status',
              options: ['PLEDGED', 'RECEIVED_FULL', 'RECEIVED_PARTIAL', 'UNUSABLE', 'CANCELED'],
            },
          ]}
          emptyText={t('features.donations.empty')}
        />
      )}

      {creating && <DonationFormDialog materials={formMaterials} onClose={() => setCreating(false)} />}
      {recording && (
        <ReceptionDialog
          item={recording}
          material={recording.materialId ? materialById.get(recording.materialId) : undefined}
          onClose={() => setRecordingId(null)}
        />
      )}
      {canceling && (
        <ConfirmDialog
          open
          title={t('features.donations.cancelTitle')}
          description={t('features.donations.cancelConfirm', { name: canceling.donorName })}
          confirmLabel={t('features.donations.cancel')}
          onConfirm={() => {
            void update
              .mutateAsync({ id: canceling.id, status: 'CANCELED' })
              .then(() => toast(t('features.donations.canceled')))
              .catch(() => toast(t('common.error'), 'alert'))
          }}
          onClose={() => setCanceling(null)}
        />
      )}
      {unusable && (
        <ConfirmDialog
          open
          title={t('features.donations.unusableTitle')}
          description={t('features.donations.unusableConfirm', { name: unusable.donorName })}
          confirmLabel={t('features.donations.unusable')}
          onConfirm={() => {
            void update
              .mutateAsync({ id: unusable.id, status: 'UNUSABLE' })
              .then(() => toast(t('features.donations.markedUnusable')))
              .catch(() => toast(t('common.error'), 'alert'))
          }}
          onClose={() => setUnusable(null)}
        />
      )}
      {receivingMoney && (
        <ConfirmDialog
          open
          title={t('features.donations.receiveMoneyTitle')}
          description={t('features.donations.receiveMoneyConfirm', {
            amount: fmt(receivingMoney.monetary ?? 0),
            name: receivingMoney.donorName,
          })}
          confirmLabel={t('features.donations.receiveMoney')}
          onConfirm={() => {
            void update
              .mutateAsync({ id: receivingMoney.id, status: 'RECEIVED_FULL' })
              .then(() => toast(t('features.donations.moneyReceived')))
              .catch(() => toast(t('common.error'), 'alert'))
          }}
          onClose={() => setReceivingMoney(null)}
        />
      )}
    </div>
  )
}
