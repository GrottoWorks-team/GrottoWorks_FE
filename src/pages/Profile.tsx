// Hồ sơ cá nhân — RHF + zod: sửa tên (PATCH /users/me), kỹ năng
// (PUT /users/me/skills — BE nhận `skillIds` GUID), thời gian rảnh
// (PUT /users/me/availability).
// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen "Hồ Sơ Cá Nhân — Trưởng Ban Hành Giáo".
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  Award,
  Camera,
  ChevronRight,
  Church,
  Clock,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useSkillsCatalog } from '@/features/tasks/api'
import { useTimesheets } from '@/features/timesheets/api'
import {
  useReplaceMyAvailability,
  useReplaceMySkills,
  useUpdateMyProfile,
} from '@/features/profile/api'
import type { User } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'common.required'),
  // GUID kỹ năng (BE: ReplaceSkillsRequest.skillIds = Guid[]).
  skills: z.array(z.string()),
})
type FormData = z.infer<typeof schema>

const DEFAULT_SLOTS = [
  { id: 'weekend_morn', labelKey: 'profile.slotWeekendMorning', timeKey: 'profile.slotWeekendMorningTime', from: '2026-10-24T08:00:00Z', to: '2026-10-24T12:00:00Z' },
  { id: 'weekend_after', labelKey: 'profile.slotWeekendAfternoon', timeKey: 'profile.slotWeekendAfternoonTime', from: '2026-10-24T13:30:00Z', to: '2026-10-24T17:30:00Z' },
  { id: 'weekday_eve', labelKey: 'profile.slotWeekdayEvening', timeKey: 'profile.slotWeekdayEveningTime', from: '2026-10-21T18:30:00Z', to: '2026-10-21T21:30:00Z' },
]

const CARD = 'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_3px_#06281B0A]'
const CARD_HEAD = 'flex w-full items-center justify-between gap-3 px-[18px] py-[14px]'
const CARD_LABEL = 'font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]'
const CARD_DESC = 'text-[10px] text-[#B3C4B8]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const CHIP = 'flex w-fit items-center gap-[6px] rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[9.5px] font-bold text-[#4F7A61]'

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<unknown> }) {
  const { t } = useTranslation()
  const toast = useToast()
  const updateMyProfile = useUpdateMyProfile()
  const replaceSkills = useReplaceMySkills()
  const replaceAvailability = useReplaceMyAvailability()
  const { data: allSkills = [] } = useSkillsCatalog()
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // BE trả `skillIds` (GUID) — chọn sẵn đúng những kỹ năng đã khai.
    defaultValues: { name: user.name, skills: user.skillIds ?? [] },
  })

  const onSubmit = async (data: FormData) => {
    try {
      // PATCH /api/v1/users/me — chỉ nhận displayName/phone/introduction/communityId.
      await updateMyProfile.mutateAsync({ displayName: data.name })

      // PUT /api/v1/users/me/skills — thay TOÀN BỘ danh sách, BE nhận GUID.
      try {
        await replaceSkills.mutateAsync(data.skills)
      } catch {
        // BE chỉ mở cho VOLUNTEER → role khác bỏ qua, không chặn lưu tên.
      }

      // A11: PUT /api/v1/users/me/availability
      try {
        const slotsToSubmit = DEFAULT_SLOTS
          .filter((s) => selectedSlots.includes(s.id))
          .map((s) => ({
            availableFrom: s.from,
            availableTo: s.to,
            note: t(s.labelKey),
          }))
        if (slotsToSubmit.length > 0) {
          await replaceAvailability.mutateAsync(slotsToSubmit)
        }
      } catch {
        // Volunteer only in BE policy
      }
    } catch {
      toast(t('common.error'), 'alert')
      return
    }

    await onSaved().catch((e: unknown) => console.error('profile refresh failed', e))
    toast(t('profile.saved'))
  }

  const toggleSlot = (id: string) => {
    setSelectedSlots((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4" noValidate>
      {/* THÔNG TIN CÁ NHÂN */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="flex flex-col gap-0.5">
            <p className={CARD_LABEL}>{t('profile.personalSection', { defaultValue: 'Thông tin cá nhân' })}</p>
            <p className={CARD_DESC}>
              {t('profile.personalDesc', { defaultValue: 'Tên và email dùng để liên hệ trong mùa vụ' })}
            </p>
          </div>
          <span className="rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[9.5px] font-bold text-[#4F7A61]">
            {t('profile.required', { defaultValue: 'Bắt buộc' })}
          </span>
        </div>
        <div className={RULE} aria-hidden />

        <div className="flex w-full flex-col gap-4 px-[18px] pb-[18px] pt-4">
          {/* Hàng avatar */}
          <div className="flex w-full items-center gap-[14px]">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#12805A] to-[#0A5C36]">
              <span className="text-[17px] font-extrabold text-[#F2D07A]">{initialsOf(user.name)}</span>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="truncate text-[13px] font-bold text-[#0B2E1F]">{user.name}</span>
              <span className="truncate text-[10.5px] text-[#8AA298]">{t(`role.${user.role}`)}</span>
            </div>
            <button
              type="button"
              className="flex h-[30px] items-center gap-[6px] rounded-[9px] border border-[#DBE5D6] bg-white px-[11px] transition-colors hover:bg-[#F4F8F1]"
            >
              <Camera className="size-3 text-[#5C7468]" aria-hidden />
              <span className="text-[10.5px] font-semibold text-[#2C463A]">
                {t('profile.changeAvatar', { defaultValue: 'Đổi ảnh' })}
              </span>
            </button>
          </div>

          {/* Họ tên */}
          <div className="flex w-full flex-col gap-[5px]">
            <label htmlFor="profile-name" className="font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
              {t('profile.name')}
            </label>
            <div className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[#DBE5D6] bg-white px-3 py-[10px] transition-colors focus-within:border-[#12805A]">
              <input
                id="profile-name"
                className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-[#0B2E1F] outline-none"
                {...register('name')}
              />
              <Pencil className="size-[13px] shrink-0 text-[#A3B4A9]" aria-hidden />
            </div>
            {errors.name?.message && (
              <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.name.message)}</p>
            )}
          </div>

          {/* Email (khoá) */}
          <div className="flex w-full flex-col gap-[5px]">
            <label htmlFor="profile-email" className="font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
              {t('profile.email')}
            </label>
            <div className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[#E3EAE0] bg-[#F8FAF6] px-3 py-[10px]">
              <input
                id="profile-email"
                value={user.email}
                readOnly
                className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-[#5C7468] outline-none"
              />
              <span className="flex shrink-0 items-center gap-[5px] text-[9px] text-[#A3B4A9]">
                <Lock className="size-[11px]" aria-hidden />
                {t('profile.locked', { defaultValue: 'Khoá' })}
              </span>
            </div>
          </div>

          {/* Kỹ năng */}
          <div className="flex w-full flex-col gap-[7px]">
            <div className="flex w-full items-center justify-between">
              <label className="font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]">
                {t('profile.skills')}
              </label>
              <span className="text-[9.5px] text-[#B3C4B8]">{t('profile.skillsHint')}</span>
            </div>
            <Controller
              name="skills"
              control={control}
              render={({ field }) => (
                <div className="flex w-full flex-wrap items-center gap-[7px]" role="group" aria-label={t('profile.skills')}>
                  {allSkills.map((sk) => {
                    const on = field.value.includes(sk.id)
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          field.onChange(
                            on ? field.value.filter((x) => x !== sk.id) : [...field.value, sk.id],
                          )
                        }
                        className={cn(
                          'flex items-center gap-[6px] rounded-full px-[11px] py-[6px] text-[10.5px] transition-colors',
                          on
                            ? 'bg-[#0A5C36] font-bold text-white'
                            : 'border border-[#DBE5D6] bg-white font-semibold text-[#5C7468] hover:border-[#CBE3D2]',
                        )}
                      >
                        {on && <Sparkles className="size-[11px] text-[#F2D07A]" aria-hidden />}
                        {sk.name}
                      </button>
                    )
                  })}
                  <span className="grid h-7 w-[30px] place-items-center rounded-full border border-[#DBE5D6] bg-white">
                    <Plus className="size-3 text-[#8AA298]" aria-hidden />
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* THỜI GIAN RẢNH */}
      <section className={CARD}>
        <div className={CARD_HEAD}>
          <div className="flex flex-col gap-0.5">
            <p className={CARD_LABEL}>{t('profile.availability')}</p>
            <p className={CARD_DESC}>
              {t('profile.availabilityHint')}
            </p>
          </div>
          <span className={CHIP}>
            {t('profile.slotCount', { defaultValue: '{{n}} khung giờ', n: DEFAULT_SLOTS.length })}
          </span>
        </div>
        <div className={RULE} aria-hidden />

        <div className="flex w-full flex-col px-[18px] pb-[14px] pt-2">
          {DEFAULT_SLOTS.map((s) => {
            const active = selectedSlots.includes(s.id)
            return (
              <div
                key={s.id}
                className="flex w-full items-center gap-3 border-b border-[#F0F4EC] py-[11px] last:border-0"
              >
                <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-[#EDF4EA]">
                  <Clock className="size-[14px] text-[#4F7A61]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-[11.5px] font-bold text-[#0B2E1F]">{t(s.labelKey)}</span>
                  <span className="truncate font-mono text-[9.5px] text-[#8AA298]">
                    {t(s.timeKey, { defaultValue: '' })}
                  </span>
                </div>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSlot(s.id)}
                  className={cn(
                    'flex h-7 shrink-0 items-center gap-[5px] rounded-[8px] border px-[10px] text-[10px] font-bold transition-colors',
                    active
                      ? 'border-[#0A5C36] bg-[#0A5C36] text-white'
                      : 'border-[#C9DCC9] bg-white text-[#0A5C36] hover:bg-[#F4F8F1]',
                  )}
                >
                  <Plus className="size-[11px]" aria-hidden />
                  {active ? t('common.selected') : t('common.add')}
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Lưu */}
      <div className="flex w-full flex-wrap items-center justify-between gap-[14px]">
        <p className="text-[10px] text-[#A3B4A9]">
          {t('profile.savedNote', { defaultValue: 'Thay đổi được lưu cho hồ sơ của bạn trong mùa hiện tại.' })}
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[38px] items-center gap-[7px] rounded-[10px] bg-[#0A5C36] px-4 transition-colors hover:bg-[#0D7344] disabled:opacity-60"
        >
          <Save className="size-[13px] text-[#F2D07A]" aria-hidden />
          <span className="text-[12px] font-bold text-white">{t('common.save')}</span>
        </button>
      </div>
    </form>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const { user, refresh, logout } = useAuth()
  const { data: timesheets = [] } = useTimesheets(user?.id)

  if (!user) return <p className="p-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>

  const hours = timesheets.reduce((s, x) => s + (x.hours ?? 0), 0)
  const initials = initialsOf(user.name)

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F4F6F1]">
      {/* Thanh trên — thương hiệu, breadcrumb, mùa, người dùng */}
      <header className="flex h-16 w-full items-center justify-between gap-4 border-b border-[#E3EAE0] bg-white px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-[22px]">
          <a href="/" className="flex items-center gap-[10px]">
            <span className="grid size-8 place-items-center rounded-[10px] bg-[#0A5C36]">
              <Church className="size-4 text-[#F2D07A]" aria-hidden />
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-[12px] font-extrabold tracking-[0.6px] text-[#0B2E1F]">GROTTOWORKS</span>
              <span className="text-[7.5px] font-semibold uppercase tracking-[1.5px] text-[#8AA298]">
                {t('app.parish')}
              </span>
            </span>
          </a>
          <span className="hidden h-6 w-px bg-[#E3EAE0] sm:block" aria-hidden />
          <nav className="hidden items-center gap-[7px] sm:flex">
            <a href="/" className="font-mono text-[9.5px] font-medium tracking-[1.2px] text-[#8AA298] hover:text-[#0A5C36]">
              {t('profile.breadcrumbAccount', { defaultValue: 'Tài khoản' })}
            </a>
            <ChevronRight className="size-[11px] text-[#C3D2C7]" aria-hidden />
            <span className="font-mono text-[9.5px] font-bold tracking-[1.2px] text-[#0A5C36]">
              {t('profile.title')}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden w-fit items-center gap-[7px] rounded-full border border-[#E3EAE0] bg-[#F4F8F1] px-[10px] py-[5px] md:flex">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[1px] text-[#8C9F94]">
              {t('profile.seasonLabel', { defaultValue: 'Mùa Giáng sinh' })}
            </span>
            <span className="text-[10px] font-semibold text-[#9A6A0C]">
              {t('profile.seasonStatus', { defaultValue: 'Đang chuẩn bị' })}
            </span>
          </span>
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#0A5C36]">
            <span className="text-[11px] font-extrabold text-[#F2D07A]">{initials}</span>
          </span>
          <span className="hidden flex-col gap-px sm:flex">
            <span className="text-[11.5px] font-bold text-[#0B2E1F]">{user.name}</span>
            <span className="text-[9.5px] text-[#8AA298]">{t(`role.${user.role}`)}</span>
          </span>
          <button
            type="button"
            aria-label={t('common.logout')}
            title={t('common.logout')}
            onClick={() => void logout()}
            className="grid size-8 place-items-center rounded-[9px] border border-[#DBE5D6] transition-colors hover:bg-[#F4F8F1]"
          >
            <LogOut className="size-[14px] text-[#5C7468]" aria-hidden />
          </button>
        </div>
      </header>

      {/* Hero tối */}
      <section className="relative flex w-full items-center justify-center overflow-hidden bg-[#06281B] py-8 lg:h-[176px] lg:py-0">
        <div
          className="pointer-events-none absolute left-[-100px] top-[-140px] z-0 size-[420px] rounded-full bg-[#0E7A4633] blur-[45px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[1080px] top-10 z-[1] size-[380px] rounded-full bg-[#E9B9491F] blur-[45px]"
          aria-hidden
        />
        <div className="relative z-[2] flex w-full max-w-[1092px] flex-col items-start justify-between gap-6 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-center gap-[18px]">
            <span className="grid size-[84px] shrink-0 place-items-center rounded-full border-[1.5px] border-[#E9B94959] bg-[#FFFFFF12]">
              <span className="grid size-[70px] place-items-center rounded-full bg-gradient-to-br from-[#12805A] to-[#0A5C36]">
                <span className="text-[25px] font-extrabold tracking-[-0.5px] text-[#F2D07A]">{initials}</span>
              </span>
            </span>
            <div className="flex min-w-0 flex-col gap-2">
              <h1 className="text-[26px] font-extrabold leading-[30px] tracking-[-1px] text-white sm:text-[32px] sm:leading-[35px]">
                {user.name}
              </h1>
              <p className="font-mono text-[11px] tracking-[0.3px] text-[#9DBBA9]">{user.email}</p>
              <div className="flex flex-wrap items-center gap-[7px]">
                <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E9B94959] bg-[#E9B94922] px-[10px] py-1">
                  <UserRound className="size-[11px] text-[#F2D07A]" aria-hidden />
                  <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1px] text-[#F2D07A]">
                    {t(`role.${user.role}`)}
                  </span>
                </span>
                <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#FFFFFF1F] bg-[#FFFFFF10] px-[10px] py-1">
                  <Church className="size-[11px] text-[#9DBBA9]" aria-hidden />
                  <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1px] text-[#9DBBA9]">
                    {t('app.parish')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-[10px]">
            {[
              { label: t('profile.points'), value: '—', Icon: Award },
              { label: t('profile.hours'), value: String(Math.round(hours * 10) / 10), Icon: Clock },
              { label: t('profile.skillsCount', { defaultValue: 'Kỹ năng' }), value: String(user.skills.length), Icon: Sparkles },
            ].map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex w-[132px] flex-col gap-[5px] rounded-[12px] border border-[#FFFFFF24] bg-[#FFFFFF0F] px-[15px] py-[13px]"
              >
                <span className="flex w-full items-center justify-between">
                  <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.9px] text-[#7FA391]">
                    {label}
                  </span>
                  <Icon className="size-[11px] text-[#8FD0AE]" aria-hidden />
                </span>
                <span className="text-[22px] font-extrabold leading-[22px] tracking-[-0.6px] text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lưới nội dung */}
      <main className="flex w-full justify-center px-4 pb-10 pt-5 sm:px-8">
        <div className="flex w-full max-w-[1092px] flex-col gap-5 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <ProfileForm user={user} onSaved={refresh} />
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[352px]">
            {/* Vai trò & quyền */}
            <section className={CARD}>
              <div className="flex w-full items-center justify-between px-4 py-[13px]">
                <p className={CARD_LABEL}>{t('profile.roleSection', { defaultValue: 'Vai trò & quyền' })}</p>
                <span className="rounded-full bg-[#E9F4EC] px-2 py-[3px] text-[9px] font-bold text-[#1B6B45]">BGH</span>
              </div>
              <div className={RULE} aria-hidden />
              <div className="flex w-full flex-col px-4 pb-3 pt-1.5">
                {[
                  { k: t('profile.roleLabel', { defaultValue: 'Vai trò' }), v: t(`role.${user.role}`) },
                  { k: t('profile.parishLabel', { defaultValue: 'Giáo xứ' }), v: t('app.parish') },
                  {
                    k: t('profile.scopeLabel', { defaultValue: 'Phạm vi' }),
                    v: t('profile.scopeValue', { defaultValue: 'Quản lý vật tư toàn giáo xứ' }),
                  },
                  {
                    k: t('profile.seasonLabel', { defaultValue: 'Mùa hiện tại' }),
                    v: t('profile.seasonValue', { defaultValue: 'Mùa Giáng sinh' }),
                  },
                ].map(({ k, v }) => (
                  <div
                    key={k}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#F0F4EC] py-[9px] last:border-0"
                  >
                    <span className="shrink-0 text-[10.5px] text-[#8AA298]">{k}</span>
                    <span className="w-[200px] text-right text-[10.5px] font-semibold leading-[15px] text-[#233A2E]">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Bảo mật */}
            <section className={CARD}>
              <div className="flex w-full items-center justify-between px-4 py-[13px]">
                <p className={CARD_LABEL}>{t('profile.securitySection', { defaultValue: 'Bảo mật' })}</p>
              </div>
              <div className={RULE} aria-hidden />
              <div className="flex w-full flex-col gap-2 px-4 pb-[14px] pt-2.5">
                {[
                  {
                    Icon: KeyRound,
                    title: t('profile.changePassword', { defaultValue: 'Đổi mật khẩu' }),
                    desc: t('profile.lastChanged', { defaultValue: 'Cập nhật lần cuối 12 ngày trước' }),
                    href: '/forgot-password',
                  },
                  {
                    Icon: ShieldCheck,
                    title: t('profile.twoFactor', { defaultValue: 'Xác thực 2 lớp' }),
                    desc: t('profile.twoFactorDesc', { defaultValue: 'Chưa bật — nên bật để bảo vệ tài khoản' }),
                    href: undefined,
                  },
                ].map(({ Icon, title, desc, href }) => {
                  const Tag = href ? 'a' : 'div'
                  return (
                    <Tag
                      key={title}
                      {...(href ? { href } : {})}
                      className="flex w-full items-center gap-[10px] rounded-[10px] border border-[#EDF2E9] bg-[#FAFCF7] px-[10px] py-[9px]"
                    >
                      <Icon className="size-[14px] shrink-0 text-[#4F7A61]" aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="text-[10.5px] font-bold text-[#0B2E1F]">{title}</span>
                        <span className="w-full text-[9px] leading-[13px] text-[#A3B4A9]">{desc}</span>
                      </span>
                      <ChevronRight className="size-3 shrink-0 text-[#A3B4A9]" aria-hidden />
                    </Tag>
                  )
                })}
              </div>
            </section>

            {/* Thẻ gợi ý */}
            <section className="relative flex w-full flex-col gap-2 overflow-hidden rounded-[16px] bg-[#06281B] p-4">
              <div
                className="pointer-events-none absolute left-[190px] top-[-50px] z-0 size-[160px] rounded-full bg-[#0E7A4633] blur-[22px]"
                aria-hidden
              />
              <p className="relative z-[1] flex items-center gap-[6px]">
                <Sparkles className="size-3 text-[#F2D07A]" aria-hidden />
                <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                  {t('profile.completion', { defaultValue: 'Hoàn thiện hồ sơ' })}
                </span>
              </p>
              <p className="relative z-[2] w-full text-[11px] leading-[18px] text-[#CFE0D4]">
                {t('profile.completionHint', {
                  defaultValue: 'Thêm kỹ năng và khung giờ rảnh để ban điều hành phân công đúng việc.',
                })}
              </p>
              <div className="relative z-[3] h-[5px] w-full rounded-full bg-[#FFFFFF1F]">
                <div className="relative z-[4] h-[5px] w-[120px] rounded-full bg-[#E9B949]" />
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
