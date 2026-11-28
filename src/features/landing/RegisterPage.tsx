import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Church,
  Clock,
  HandHeart,
  Info,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { useCommunities } from '@/features/communities/api'
import { useSkills } from '@/features/tasks/api'
import type { AreaType, RegistrationKind } from '@/types'
import { useCreateRegistration } from './api'

const AREA_TYPES: AreaType[] = ['GROTTO', 'TREE', 'LIGHTING', 'YARD', 'STAGE']
const KINDS: RegistrationKind[] = ['VOLUNTEER', 'MATERIAL', 'MONETARY']

const schema = z.object({
  name: z.string().trim().min(2, 'register.nameRequired'),
  phone: z.string().trim().regex(/^[0-9+\s().-]{8,}$/, 'register.phoneInvalid'),
  email: z.union([z.literal(''), z.string().trim().email('register.emailInvalid')]),
  communityId: z.string().min(1, 'register.communityRequired'),
  areaType: z.string().min(1, 'register.areaTypeRequired'),
  kind: z.string().min(1, 'register.kindRequired'),
  note: z.string().trim().max(300, 'register.noteMax'),
})
type FormData = z.infer<typeof schema>

// Ô nhập / chọn theo bản thiết kế Pen: cao 38px, nền #FBFCFA, viền #DFE7DC.
const FIELD =
  'flex h-[38px] w-full items-center gap-2 rounded-[10px] border border-[#DFE7DC] bg-[#FBFCFA] px-[11px] transition-colors focus-within:border-[#12805A]'
const INPUT = 'min-w-0 flex-1 bg-transparent text-[11px] text-[#0B2E1F] outline-none placeholder:text-[#9AAE9F]'
const SELECT = `${INPUT} h-full cursor-pointer appearance-none pr-5`
const SECTION = 'text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]'
const LABEL = 'text-[10.5px] font-semibold text-[#41564A]'
const CHEVRON =
  'pointer-events-none absolute right-[10px] top-1/2 size-[11px] -translate-y-1/2 text-[#8AA298]'

export default function RegisterPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [params] = useSearchParams()
  const createRegistration = useCreateRegistration()
  const { data: communities = [] } = useCommunities()
  const { data: skillList = [] } = useSkills()

  const [skills, setSkills] = useState<string[]>([])
  const [done, setDone] = useState(false)

  // Cho phép deep-link từ landing: /register?area=GROTTO điền sẵn khu vực.
  const prefillArea = useMemo(() => {
    const area = params.get('area')
    return area && (AREA_TYPES as string[]).includes(area) ? area : ''
  }, [params])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      communityId: '',
      areaType: prefillArea,
      kind: 'VOLUNTEER',
      note: '',
    },
  })

  const selectedKind = watch('kind')

  const toggleSkill = (skill: string) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))

  const onSubmit = async (data: FormData) => {
    try {
      await createRegistration.mutateAsync({
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email.trim() || undefined,
        communityId: data.communityId,
        areaType: data.areaType as AreaType,
        kind: data.kind as RegistrationKind,
        skills,
        note: data.note.trim() || undefined,
      })
      setDone(true)
      toast(t('register.successToast'))
    } catch (error) {
      if (error instanceof ApiError && error.code === 'REGISTRATION_API_MISSING') {
        toast(t('register.apiMissing'), 'alert')
      } else {
        toast(t('common.error'), 'alert')
      }
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-[#F4F6F1]">
      {/* CỘT TRÁI — nền rừng tối, lời mời đồng hành (Pen: 432px) */}
      <aside className="relative hidden w-[432px] shrink-0 flex-col justify-between overflow-hidden bg-[#06281B] p-10 text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/pic/Login_background@2x.webp')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,#041C13F2 0%,#041C1373 50%,#041C13D9 100%)' }}
          aria-hidden
        />

        <div className="relative z-[2] flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-[11px]">
            <span className="grid size-[38px] place-items-center rounded-[12px] border border-[#E9B94966] bg-gradient-to-br from-[#12805A] to-[#0A5C36]">
              <Church className="size-[18px] text-[#F2D07A]" aria-hidden />
            </span>
            <span className="flex flex-col gap-[2px]">
              <span className="text-[13px] font-extrabold tracking-[0.6px] text-white">GROTTO WORKS</span>
              <span className="text-[8.5px] font-semibold tracking-[1.5px] text-[#8FAF9D]">
                PARISH GROTTO COORDINATION
              </span>
            </span>
          </Link>
          <span className="flex w-fit items-center gap-[7px] rounded-full border border-[#E9B94959] bg-[#E9B9491A] px-[11px] py-[6px]">
            <HandHeart className="size-3 text-[#F2D07A]" aria-hidden />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1.3px] text-[#F2D07A]">
              {t('register.noAccountBadge', { defaultValue: 'Không cần tài khoản' })}
            </span>
          </span>
          <h1 className="w-full text-[30px] font-extrabold leading-[38px] tracking-[-0.8px] text-white">
            {t('register.title')}
          </h1>
          <p className="w-full text-[12px] leading-[19px] text-[#D6EADFD9]">{t('register.sub')}</p>
        </div>

        <div className="relative z-[3] flex flex-col gap-[13px]">
          {[t('register.privacy'), t('register.contactBack', { defaultValue: 'Ban hành giáo sẽ chủ động liên hệ lại với bạn.' })].map(
            (text) => (
              <p key={text} className="flex items-start gap-[9px]">
                <Info className="mt-px size-[13px] shrink-0 text-[#8FD0AE]" aria-hidden />
                <span className="flex-1 text-[11px] leading-[17px] text-[#A9D7BF]">{text}</span>
              </p>
            ),
          )}
          <div className="h-px w-full bg-[#FFFFFF26]" aria-hidden />
          <div className="flex w-full items-center justify-between gap-[10px]">
            <Link to="/" className="flex items-center gap-[6px] text-[11px] font-semibold text-[#A9D7BF]">
              <ArrowLeft className="size-3" aria-hidden />
              {t('landing.nav.backHome')}
            </Link>
            <Link to="/login" className="text-[11px] font-bold text-[#F2D07A] hover:underline">
              {t('register.staffLogin', { defaultValue: 'Ban điều hành? Đăng nhập' })}
            </Link>
          </div>
        </div>
      </aside>

      {/* CỘT PHẢI — thẻ biểu mẫu 720px */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[720px] rounded-[22px] border border-[#E3EAE0] bg-white p-[28px] shadow-[0px_22px_48px_#06281B1F]">
          {done ? (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[#E9F4EC] text-[#0A5C36]">
                <CheckCircle2 className="size-7" aria-hidden />
              </span>
              <h2 className="mt-4 text-[21px] font-extrabold tracking-[-0.5px] text-[#0B2E1F]">
                {t('register.successTitle')}
              </h2>
              <p className="mt-2 max-w-md text-[11.5px] leading-[17px] text-[#7C9287]">{t('register.successDesc')}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link
                  to="/"
                  className="flex h-[38px] items-center rounded-[11px] border border-[#DBE5D6] bg-white px-4 text-[12px] font-semibold text-[#2C463A]"
                >
                  {t('register.backHome')}
                </Link>
                <Link
                  to="/login"
                  className="flex h-[38px] items-center rounded-[11px] bg-[#0A5C36] px-4 text-[12px] font-bold text-white"
                >
                  {t('register.login')}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[14px]" noValidate>
              {/* Đầu thẻ */}
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <h1 className="text-[21px] font-extrabold tracking-[-0.5px] text-[#0B2E1F]">
                    {t('register.joinTitle', { defaultValue: 'Đăng ký đồng hành' })}
                  </h1>
                  <p className="w-full text-[11.5px] leading-[17px] text-[#7C9287]">
                    {t('register.joinSub', {
                      defaultValue: 'Chỉ cần để lại thông tin — ban hành giáo sẽ liên hệ lại.',
                    })}
                  </p>
                </div>
                <span className="flex w-fit items-center gap-[6px] rounded-full bg-[#F1F6EE] px-[10px] py-[5px]">
                  <Clock className="size-3 text-[#4F7A61]" aria-hidden />
                  <span className="text-[10px] font-bold text-[#4F7A61]">
                    {t('register.oneMinute', { defaultValue: '1 phút' })}
                  </span>
                </span>
              </div>
              <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />

              {/* Thông tin liên hệ */}
              <section className="flex w-full flex-col gap-[9px] pt-1">
                <p className={SECTION}>{t('register.contactSection', { defaultValue: 'Thông tin liên hệ' })}</p>
                <div className="flex w-full gap-[10px]">
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="name" className={LABEL}>
                      {t('register.name')}
                    </label>
                    <div className={FIELD}>
                      <User className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                      <input
                        id="name"
                        autoComplete="name"
                        placeholder={t('register.namePlaceholder')}
                        className={INPUT}
                        {...register('name')}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.name.message ?? '')}</p>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="phone" className={LABEL}>
                      {t('register.phone')}
                    </label>
                    <div className={FIELD}>
                      <Phone className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                      <input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0912 345 678"
                        className={INPUT}
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.phone.message ?? '')}</p>
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-1">
                  <label htmlFor="email" className={LABEL}>
                    {t('register.email')}
                  </label>
                  <div className={FIELD}>
                    <Mail className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('register.emailPlaceholder')}
                      className={INPUT}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.email.message ?? '')}</p>
                  )}
                </div>
              </section>

              {/* Nơi đồng hành */}
              <section className="flex w-full flex-col gap-[9px] pt-1">
                <p className={SECTION}>{t('register.placeSection', { defaultValue: 'Bạn muốn đồng hành ở đâu' })}</p>
                <div className="flex w-full gap-[10px]">
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="communityId" className={LABEL}>
                      {t('register.community')}
                    </label>
                    <div className={cn(FIELD, 'relative')}>
                      <Church className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                      <select id="communityId" className={SELECT} {...register('communityId')}>
                        <option value="">{t('register.communityPlaceholder')}</option>
                        {communities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={CHEVRON} aria-hidden />
                    </div>
                    {errors.communityId && (
                      <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.communityId.message ?? '')}</p>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="areaType" className={LABEL}>
                      {t('register.areaType')}
                    </label>
                    <div className={cn(FIELD, 'relative')}>
                      <HandHeart className="size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                      <select id="areaType" className={SELECT} {...register('areaType')}>
                        <option value="">{t('register.areaTypePlaceholder')}</option>
                        {AREA_TYPES.map((area) => (
                          <option key={area} value={area}>
                            {t(`features.areas.areaType.${area}`)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className={CHEVRON} aria-hidden />
                    </div>
                    {errors.areaType && (
                      <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.areaType.message ?? '')}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Hình thức đóng góp */}
              <section className="flex w-full flex-col gap-[9px] pt-1">
                <p className={SECTION}>{t('register.kind')}</p>
                <div className="flex w-full flex-wrap gap-2">
                  {KINDS.map((kind) => {
                    const active = selectedKind === kind
                    return (
                      <label
                        key={kind}
                        className={cn(
                          'flex h-[34px] cursor-pointer items-center gap-[7px] rounded-[10px] px-3 transition-colors',
                          active
                            ? 'bg-[#0A5C36] text-white'
                            : 'border border-[#DFE7DC] bg-white text-[#5C7468] hover:border-[#CBE3D2]',
                        )}
                      >
                        <input type="radio" value={kind} className="sr-only" {...register('kind')} />
                        <HandHeart
                          className={cn('size-3', active ? 'text-[#F2D07A]' : 'text-[#8AA298]')}
                          aria-hidden
                        />
                        <span className={cn('text-[11px]', active ? 'font-bold' : 'font-medium')}>
                          {t(`register.kind.${kind}`)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>

              {/* Kỹ năng */}
              <section className="flex w-full flex-col gap-2 pt-1">
                <div className="flex w-full items-center justify-between">
                  <p className={SECTION}>{t('register.skills')}</p>
                  <span className="text-[9.5px] text-[#B0BFB4]">{t('register.skillsOptional', { defaultValue: 'Không bắt buộc' })}</span>
                </div>
                <div className="flex w-full flex-wrap gap-[6px]">
                  {skillList.map((skill) => {
                    const active = skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          'flex h-[30px] items-center gap-[5px] rounded-full border px-[10px] text-[10.5px] transition-colors',
                          active
                            ? 'border-[#0A5C36] bg-[#0A5C36] font-semibold text-white'
                            : 'border-[#E7EEE3] bg-[#F7F9F5] text-[#5C7468] hover:border-[#CBE3D2]',
                        )}
                      >
                        <ShieldCheck className="size-[10px]" aria-hidden />
                        {skill}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Lời nhắn */}
              <section className="flex w-full flex-col gap-2 pt-1">
                <p className={SECTION}>{t('register.note')}</p>
                <div className="flex w-full rounded-[10px] border border-[#DFE7DC] bg-[#FBFCFA] p-[9px_11px] transition-colors focus-within:border-[#12805A]">
                  <MessageSquare className="mr-2 mt-0.5 size-[13px] shrink-0 text-[#9AAE9F]" aria-hidden />
                  <textarea
                    id="note"
                    rows={2}
                    placeholder={t('register.notePlaceholder')}
                    className="min-h-[44px] w-full resize-none bg-transparent text-[10.5px] leading-[16px] text-[#0B2E1F] outline-none placeholder:text-[#9AAE9F]"
                    {...register('note')}
                  />
                </div>
                {errors.note && (
                  <p className="text-[10px] font-semibold text-[#B42318]">{t(errors.note.message ?? '')}</p>
                )}
              </section>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-gradient-to-r from-[#0E7A46] to-[#0A5C36] shadow-[0px_8px_18px_#0A5C3640] transition-opacity disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="text-[12.5px] font-bold text-white">{t('register.submitting')}</span>
                ) : (
                  <>
                    <span className="text-[12.5px] font-bold tracking-[0.2px] text-white">{t('register.submit')}</span>
                    <ArrowRight className="size-[14px] text-white" aria-hidden />
                  </>
                )}
              </button>

              <p className="flex w-full items-center justify-center gap-[7px] pt-0.5 text-[9.5px] text-[#A3B4A9]">
                <Lock className="size-[10px]" aria-hidden />
                {t('register.privacy')}
              </p>

              <p className="flex w-full items-center justify-center gap-1 text-[11px] text-[#6B8175]">
                {t('register.staff')}
                <Link to="/login" className="font-bold text-[#0A5C36] hover:underline">
                  {t('register.staffCta')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
