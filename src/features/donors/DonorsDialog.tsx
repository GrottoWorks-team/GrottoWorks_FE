// Dialog quản lý nhà tài trợ — dùng hook thật của Resource `/api/v1/donors`.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Users } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { useCreateDonor, useDonors, useUpdateDonor, type DonorDto } from './api'

export function DonorsDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [search, setSearch] = useState('')
  // Gõ tới đâu gọi BE tới đó sẽ bắn 1 request mỗi ký tự → debounce 300ms.
  const [query, setQuery] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const { data: donors = [], isPending } = useDonors(query || undefined)
  const createDonor = useCreateDonor()
  const updateDonor = useUpdateDonor()

  const [editing, setEditing] = useState<DonorDto | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')

  const fail = (error: unknown) =>
    toast(error instanceof ApiError ? error.message : t('common.error'), 'alert')

  const reset = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setEmail('')
    setAddress('')
  }

  const submit = async () => {
    if (!name.trim()) return
    const payload = {
      donorName: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
    }
    try {
      if (editing) {
        await updateDonor.mutateAsync({ donorId: editing.id, version: editing.version, ...payload })
        toast(t('features.donations.donorUpdated'))
      } else {
        await createDonor.mutateAsync(payload)
        toast(t('features.donations.donorCreated'))
      }
      reset()
    } catch (error) {
      fail(error)
    }
  }

  const columns = [
    {
      key: 'donorName',
      header: t('features.donations.donorName'),
      render: (donor: DonorDto) => <span className="font-semibold">{donor.donorName}</span>,
    },
    {
      key: 'phone',
      header: t('features.donations.donorPhone'),
      render: (donor: DonorDto) => donor.phone || '—',
    },
    {
      key: 'email',
      header: t('features.donations.donorEmail'),
      render: (donor: DonorDto) => donor.email || '—',
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right' as const,
      render: (donor: DonorDto) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(donor)
            setName(donor.donorName)
            setPhone(donor.phone ?? '')
            setEmail(donor.email ?? '')
            setAddress(donor.address ?? '')
          }}
        >
          {t('common.edit')}
        </Button>
      ),
    },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('features.donations.donorsTitle')}
      footer={
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <p className="lbl-mono flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {editing ? t('features.donations.donorEdit') : t('features.donations.donorNew')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="donor-name">{t('features.donations.donorName')}</Label>
              <Input id="donor-name" value={name} maxLength={150} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="donor-phone">{t('features.donations.donorPhone')}</Label>
              <Input id="donor-phone" value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="donor-email">{t('features.donations.donorEmail')}</Label>
              <Input id="donor-email" type="email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="donor-address">{t('features.donations.donorAddress')}</Label>
              <Input id="donor-address" value={address} maxLength={255} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editing && (
              <Button variant="ghost" size="sm" onClick={reset}>
                {t('common.cancel')}
              </Button>
            )}
            <Button size="sm" onClick={() => void submit()} disabled={!name.trim() || createDonor.isPending || updateDonor.isPending}>
              <Plus className="size-4" />
              {editing ? t('common.save') : t('features.donations.donorAdd')}
            </Button>
          </div>
        </div>

        <Input
          aria-label={t('features.donations.donorSearch')}
          placeholder={t('features.donations.donorSearch')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <DataTable
          rows={donors}
          columns={columns}
          pageSize={8}
          emptyText={isPending ? t('common.loading') : t('features.donations.donorsEmpty')}
        />
      </div>
    </Dialog>
  )
}
