import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, CheckCircle2, Pencil, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { exportCsv } from '@/lib/csv'
import { useDonations, useUpdateDonor, useRecordDonationReceipt } from '../api'
import type { Donation } from '@/types'

export default function DonationListPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: donations = [], isPending } = useDonations()

  const recordReceiptMutation = useRecordDonationReceipt()
  const updateDonorMutation = useUpdateDonor()

  // State dialogs
  const [receiptDonation, setReceiptDonation] = useState<Donation | null>(null)
  const [receiptAmount, setReceiptAmount] = useState<string>('')
  const [receiptNote, setReceiptNote] = useState<string>('')

  const [editDonorTarget, setEditDonorTarget] = useState<Donation | null>(null)
  const [donorName, setDonorName] = useState<string>('')
  const [donorPhone, setDonorPhone] = useState<string>('')
  const [donorEmail, setDonorEmail] = useState<string>('')

  const openReceiptModal = (d: Donation) => {
    setReceiptDonation(d)
    setReceiptAmount(String(d.pledgedAmount?.amount ?? ''))
    setReceiptNote('')
  }

  const openEditDonorModal = (d: Donation) => {
    setEditDonorTarget(d)
    setDonorName(d.donorName)
    setDonorPhone('')
    setDonorEmail('')
  }

  const handleRecordReceipt = async () => {
    if (!receiptDonation) return
    try {
      const amt = Number(receiptAmount)
      await recordReceiptMutation.mutateAsync({
        donationId: receiptDonation.id,
        payload: {
          monetaryAmount: receiptDonation.type === 'MONEY' && !Number.isNaN(amt) ? amt : undefined,
          note: receiptNote || undefined,
        },
      })
      toast('Đã ghi nhận tiếp nhận quyên góp thành công')
      setReceiptDonation(null)
    } catch {
      toast('Lỗi ghi nhận tiếp nhận', 'alert')
    }
  }

  const handleUpdateDonor = async () => {
    if (!editDonorTarget) return
    try {
      await updateDonorMutation.mutateAsync({
        donorId: editDonorTarget.donorId ?? editDonorTarget.id,
        payload: {
          name: donorName,
          phone: donorPhone || undefined,
          email: donorEmail || undefined,
        },
      })
      toast('Đã cập nhật thông tin nhà hảo tâm')
      setEditDonorTarget(null)
    } catch {
      toast('Lỗi cập nhật nhà hảo tâm', 'alert')
    }
  }

  const totalCount = donations.length
  const receivedCount = donations.filter((d) => d.status === 'RECEIVED').length
  const pendingCount = donations.filter(
    (d) => d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED',
  ).length
  const totalMoney = donations
    .filter((d) => d.type === 'MONEY')
    .reduce((sum, d) => sum + (d.receivedAmount?.amount ?? d.pledgedAmount?.amount ?? 0), 0)

  const columns: Column<Donation>[] = useMemo(
    () => [
      {
        key: 'date',
        header: t('features.donations.date'),
        render: (d) => (
          <span className="font-mono text-xs text-muted-foreground">
            {d.donationDate ? new Date(d.donationDate).toLocaleDateString('vi-VN') : '—'}
          </span>
        ),
      },
      {
        key: 'donor',
        header: t('features.donations.donor'),
        render: (d) => <span className="font-medium text-foreground">{d.donorName}</span>,
      },
      {
        key: 'type',
        header: t('features.donations.kind'),
        render: (d) =>
          d.type === 'MONEY' ? (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {t('features.donations.money')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              {t('features.donations.material')}
            </span>
          ),
      },
      {
        key: 'detail',
        header: t('features.donations.detail'),
        render: (d) => {
          if (d.type === 'MONEY') {
            const received = d.receivedAmount?.amount
            const pledged = d.pledgedAmount?.amount
            if (received != null) {
              return (
                <span className="font-semibold text-foreground">
                  {Number(received).toLocaleString('vi-VN')} ₫
                </span>
              )
            }
            if (pledged != null) {
              return (
                <span className="text-muted-foreground">
                  {Number(pledged).toLocaleString('vi-VN')} ₫ ({t('features.donations.promised')})
                </span>
              )
            }
            return <span className="text-muted-foreground">—</span>
          }
          if (d.items && d.items.length > 0) {
            return (
              <div className="space-y-0.5">
                {d.items.map((item) => (
                  <div key={item.id} className="text-sm">
                    <span className="font-medium text-foreground">{item.materialName}</span>
                    <span className="ml-1 text-muted-foreground">
                      ({Number(item.usableQuantity || item.receivedQuantity || item.pledgedQuantity || 0).toLocaleString('vi-VN')} {item.unit})
                    </span>
                    {item.note && (
                      <span className="ml-1 text-xs italic text-muted-foreground">
                        ({item.note})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          }
          return <span className="text-muted-foreground">—</span>
        },
      },
      {
        key: 'note',
        header: t('features.donations.note'),
        render: (d) => <span className="text-sm text-muted-foreground">{d.note || '—'}</span>,
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (d) => <StatusTag status={d.status} />,
      },
      {
        key: 'actions',
        header: '',
        render: (d) => (
          <div className="flex items-center gap-1 justify-end">
            {(d.status === 'PLEDGED' || d.status === 'PARTIALLY_RECEIVED') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReceiptModal(d)}
                data-testid={`record-receipt-btn-${d.id}`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Tiếp nhận</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDonorModal(d)}
              data-testid={`edit-donor-btn-${d.id}`}
              aria-label="Sửa nhà hảo tâm"
            >
              <Pencil className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t],
  )

  const onExport = () => {
    exportCsv(
      'so-quyen-gop.csv',
      donations.map((d) => ({
        [t('features.donations.date')]: d.donationDate
          ? new Date(d.donationDate).toLocaleDateString('vi-VN')
          : '',
        [t('features.donations.donor')]: d.donorName,
        [t('features.donations.kind')]:
          d.type === 'MONEY' ? t('features.donations.money') : t('features.donations.material'),
        [t('features.donations.detail')]:
          d.type === 'MONEY'
            ? `${d.receivedAmount?.amount ?? d.pledgedAmount?.amount ?? 0} ₫`
            : (d.items || [])
                .map(
                  (i) =>
                    `${i.materialName} (${i.usableQuantity || i.receivedQuantity || i.pledgedQuantity || 0} ${i.unit})`,
                )
                .join('; '),
        [t('common.status')]: t(`status.${d.status}`),
        [t('features.donations.note')]: d.note ?? '',
      })),
    )
    toast(t('features.donations.exported'))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.donations.title')}
        sub={t('features.donations.sub')}
        actions={
          <Button variant="outline" onClick={onExport} disabled={!donations.length}>
            <Download className="size-4" />
            {t('features.donations.export')}
          </Button>
        }
      />

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t('features.donations.statTotal')}
          value={totalCount}
          unit={t('features.donations.unitTimes')}
        />
        <StatCard
          label={t('features.donations.statReceived')}
          value={receivedCount}
          unit={t('features.donations.unitTimes')}
          tone="ok"
        />
        <StatCard
          label={t('features.donations.statPending')}
          value={pendingCount}
          unit={t('features.donations.unitTimes')}
          tone={pendingCount > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label={t('features.donations.statMoney')}
          value={totalMoney}
          unit="₫"
          tone="ok"
        />
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={donations}
          columns={columns}
          searchKeys={['donorName', 'note']}
          filters={[
            {
              key: 'status',
              options: ['PLEDGED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
            },
          ]}
          emptyText={t('features.donations.empty')}
        />
      )}

      {/* Dialog Tiếp nhận quyên góp */}
      <Dialog
        open={Boolean(receiptDonation)}
        onClose={() => setReceiptDonation(null)}
        title="Ghi nhận tiếp nhận thực tế"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptDonation(null)}>
              Đóng
            </Button>
            <Button
              onClick={handleRecordReceipt}
              disabled={recordReceiptMutation.isPending}
              data-testid="confirm-receipt-btn"
            >
              {recordReceiptMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Xác nhận tiếp nhận
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm">
          <p className="text-muted-foreground">
            Xác nhận tiếp nhận từ nhà hảo tâm <strong className="text-foreground">{receiptDonation?.donorName}</strong>.
          </p>
          {receiptDonation?.type === 'MONEY' && (
            <div>
              <Label htmlFor="receipt-amount" className="mb-1 block text-xs">
                Số tiền thực nhận (₫)
              </Label>
              <Input
                id="receipt-amount"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                data-testid="receipt-amount-input"
              />
            </div>
          )}
          <div>
            <Label htmlFor="receipt-note" className="mb-1 block text-xs">
              Ghi chú tiếp nhận
            </Label>
            <Input
              id="receipt-note"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
              placeholder="Ghi chú chi tiết đợt giao nhận..."
              data-testid="receipt-note-input"
            />
          </div>
        </div>
      </Dialog>

      {/* Dialog Sửa nhà hảo tâm */}
      <Dialog
        open={Boolean(editDonorTarget)}
        onClose={() => setEditDonorTarget(null)}
        title="Cập nhật thông tin nhà hảo tâm"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDonorTarget(null)}>
              Đóng
            </Button>
            <Button
              onClick={handleUpdateDonor}
              disabled={updateDonorMutation.isPending}
              data-testid="confirm-update-donor-btn"
            >
              {updateDonorMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-2 text-sm">
          <div>
            <Label htmlFor="donor-name" className="mb-1 block text-xs">
              Tên nhà hảo tâm
            </Label>
            <Input
              id="donor-name"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              data-testid="donor-name-input"
            />
          </div>
          <div>
            <Label htmlFor="donor-phone" className="mb-1 block text-xs">
              Số điện thoại
            </Label>
            <Input
              id="donor-phone"
              value={donorPhone}
              onChange={(e) => setDonorPhone(e.target.value)}
              placeholder="VD: 0912345678"
              data-testid="donor-phone-input"
            />
          </div>
          <div>
            <Label htmlFor="donor-email" className="mb-1 block text-xs">
              Email
            </Label>
            <Input
              id="donor-email"
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="VD: donor@example.com"
              data-testid="donor-email-input"
            />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
