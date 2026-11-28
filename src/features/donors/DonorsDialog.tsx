// Dialog quản lý nhà tài trợ — dùng hook thật của Resource `/api/v1/donors`.
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Quyên góp — Nhà tài trợ".
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, X } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useParishDonors } from '@/features/warehouse/api'
import { useCreateDonor, useDonors, useUpdateDonor, type DonorDto } from './api'

const FIELD =
  'h-[34px] w-full rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] text-[10.5px] text-[#0B2E1F] placeholder:text-[#9AAE9F] focus-visible:outline-none focus-visible:border-[#0A5C36]'
const TH = 'font-mono text-[8px] font-semibold uppercase tracking-[0.8px] text-[#8C9F94]'

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
  const { user } = useAuth()
  // Ban hành giáo chỉ đọc được danh bạ giáo xứ (/parish-donors); ghi nhà tài trợ thuộc MO.
  const isParish = user?.role === 'COMMUNITY'
  const { data: parishDonors = [], isPending: parishPending } = useParishDonors(query || undefined, { enabled: isParish })
  const { data: officerDonors = [], isPending: officerPending } = useDonors(query || undefined, { enabled: !isParish })
  const donors = isParish ? parishDonors : officerDonors
  const isPending = isParish ? parishPending : officerPending
  const createDonor = useCreateDonor()
  const updateDonor = useUpdateDonor()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

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

  if (!open) return null


  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      <button type="button" aria-label={t('common.close')} className="absolute inset-0 bg-[#06281B59]" onClick={onClose} />
      <section className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden rounded-l-[22px] border-l border-[#E3EAE0] bg-white shadow-[-20px_0px_40px_#06281B26]">
        <header className="flex w-full items-center justify-between gap-3 px-[18px] py-4">
          <div className="flex flex-col gap-[2px]">
            <span className="text-[16px] font-extrabold tracking-[-0.3px] text-[#0B2E1F]">{t('features.donations.donorsTitle')}</span>
            <span className="text-[10.5px] text-[#8AA298]">
              {t('features.donations.donorsSub', { defaultValue: 'Danh sách dùng chung cho mọi cam kết quyên góp' })}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-[#F6F8F4] text-[#6B8175] transition-colors hover:bg-[#EAF0E6]"
          >
            <X className="size-[13px]" aria-hidden />
          </button>
        </header>
        <div className="h-px w-full bg-[#ECF1E9]" />

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-[14px]">
          {isParish ? (
            <span className="text-[10px] leading-[15px] text-[#8CA298]">
              {t('features.donations.donorsParishHint', { defaultValue: 'Danh bạ dùng chung của giáo xứ. Trưởng nhóm vật tư thêm nhà tài trợ mới.' })}
            </span>
          ) : (
            <>
              <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {editing ? t('features.donations.donorEdit') : t('features.donations.donorNew')}
              </span>
              <div className="flex w-full flex-col gap-2">
            <input
              aria-label={t('features.donations.donorName')}
              placeholder={t('features.donations.donorName')}
              value={name}
              maxLength={150}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
            <input
              aria-label={t('features.donations.donorPhone')}
              placeholder={t('features.donations.donorPhone')}
              value={phone}
              maxLength={30}
              onChange={(e) => setPhone(e.target.value)}
              className={FIELD}
            />
            <input
              aria-label={t('features.donations.donorEmail')}
              type="email"
              placeholder={t('features.donations.donorEmail')}
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
            <input
              aria-label={t('features.donations.donorAddress')}
              placeholder={t('features.donations.donorAddress')}
              value={address}
              maxLength={255}
              onChange={(e) => setAddress(e.target.value)}
              className={FIELD}
            />
          </div>
          <div className="flex w-full items-center gap-2">
            {editing && (
              <button
                type="button"
                onClick={reset}
                className="flex h-[34px] items-center rounded-[9px] border border-[#E1E9DC] bg-white px-[13px] text-[11px] font-semibold text-[#5C7468] transition-colors hover:bg-[#F4F8F1]"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!name.trim() || createDonor.isPending || updateDonor.isPending}
              className="flex h-[34px] flex-1 items-center justify-center gap-[6px] rounded-[9px] bg-[#0A5C36] text-[11.5px] font-bold text-white transition-colors hover:bg-[#0D7344] disabled:opacity-55"
            >
              <Plus className="size-3" aria-hidden />
              {editing ? t('common.save') : t('features.donations.donorAdd')}
            </button>
              </div>
            </>
          )}

          <div className="flex h-[34px] w-full items-center gap-[8px] rounded-[9px] border border-[#E7EEE3] bg-[#F7F9F5] px-[10px]">
            <Search className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              aria-label={t('features.donations.donorSearch')}
              placeholder={t('features.donations.donorSearch')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[10.5px] text-[#0B2E1F] placeholder:text-[#9AAE9F] focus:outline-none"
            />
          </div>

          <div className="flex min-h-[160px] w-full flex-1 flex-col overflow-hidden rounded-[12px] border border-[#E3EAE0] bg-white">
            <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-[12px] py-[9px]">
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.donorName')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.donorPhone')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.donations.donorEmail')}</span>
            </div>
            {isPending ? (
              <p className="py-8 text-center font-mono text-[10.5px] text-[#8AA298]">{t('common.loading')}</p>
            ) : donors.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                <Search className="size-5 text-[#B9C8BE]" aria-hidden />
                <span className="text-[11px] text-[#A3B4A9]">{t('features.donations.donorsEmpty')}</span>
              </div>
            ) : (
              <ul className="flex w-full flex-col">
                {donors.map((donor) => (
                  <li key={donor.id} className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-[12px] py-[9px] last:border-0">
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-[#0B2E1F]">{donor.donorName}</span>
                    {!isParish && (
                      <button
                        type="button"
                        aria-label={t('common.edit')}
                        onClick={() => {
                          setEditing(donor)
                          setName(donor.donorName)
                          setPhone(donor.phone ?? '')
                          setEmail(donor.email ?? '')
                          setAddress(donor.address ?? '')
                        }}
                        className="shrink-0 text-[9px] font-bold text-[#0A5C36] hover:underline"
                      >
                        {t('common.edit')}
                      </button>
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono text-[9.5px] text-[#6B8175]">{donor.phone || '—'}</span>
                    <span className="min-w-0 flex-1 truncate text-[9.5px] text-[#8AA298]">{donor.email || '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <footer className="flex w-full items-center justify-end border-t border-[#ECF1E9] px-[18px] py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 items-center rounded-[9px] bg-[#0A5C36] px-[15px] text-[11.5px] font-bold text-white transition-colors hover:bg-[#0D7344]"
          >
            {t('common.close')}
          </button>
        </footer>
      </section>
    </div>
  )
}
