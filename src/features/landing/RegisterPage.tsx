import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonLink } from '@/components/ui/button-link'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { Snowfall } from '@/components/shared/Snowfall'
import { WinterBackdrop } from '@/components/shared/WinterBackdrop'
import { cn } from '@/lib/utils'
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

const selectCls =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

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
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-background p-4 sm:py-8">
      {/* Nền mùa đông + tuyết rơi — đồng bộ với trang đăng nhập. */}
      <WinterBackdrop />
      <Snowfall />

      {/* Lối về trang chủ — đặt phía trên Card. */}
      <Link
        to="/"
        className="relative z-10 mb-3 inline-flex w-full max-w-4xl items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('landing.nav.backHome')}
      </Link>

      <Card className="g-item relative z-10 w-full max-w-4xl overflow-hidden shadow-xl ring-1 ring-black/5">
        {/* Logo + tiêu đề: cùng khối header của Card trang Login. */}
        <div className="grid place-items-center gap-3 border-b border-border bg-gradient-to-b from-brand-pineLight to-card px-6 py-5">
          <img
            src="/pic/Logo_GrottoWorks.png"
            alt={t('app.name')}
            draggable={false}
            className="h-auto w-full max-w-[17rem] select-none"
          />
          <h1 className="sr-only">{t('app.name')}</h1>
          <p className="text-center text-sm font-semibold text-foreground">{t('register.title')}</p>
        </div>

        <div className="p-6">
          {done ? (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-pineLight text-brand-pine">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-xl font-bold text-foreground">
                {t('register.successTitle')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t('register.successDesc')}
              </p>
              <div className="mt-6 grid gap-2">
                <ButtonLink to="/">{t('register.backHome')}</ButtonLink>
                <ButtonLink to="/login" variant="secondary">
                  {t('register.login')}
                </ButtonLink>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-center text-xs text-muted-foreground">{t('register.sub')}</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-5" noValidate>
                {/* Lưới 1 → 2 → 3 cột theo bề rộng — ưu tiên gọn chiều cao để không tràn xuống dưới. */}
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3">
                  {/* Cột 1 — liên hệ */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('register.name')}</Label>
                      <Input id="name" autoComplete="name" {...register('name')} />
                      {errors.name && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.name.message ?? '')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">{t('register.phone')}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        {...register('phone')}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.phone.message ?? '')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">{t('register.email')}</Label>
                      <Input id="email" type="email" autoComplete="email" {...register('email')} />
                      {errors.email && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.email.message ?? '')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cột 2 — giáo khu, khu vực, hình thức */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="communityId">{t('register.community')}</Label>
                      <select id="communityId" className={selectCls} {...register('communityId')}>
                        <option value="">{t('register.communityPlaceholder')}</option>
                        {communities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {errors.communityId && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.communityId.message ?? '')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="areaType">{t('register.areaType')}</Label>
                      <select id="areaType" className={selectCls} {...register('areaType')}>
                        <option value="">{t('register.areaTypePlaceholder')}</option>
                        {AREA_TYPES.map((area) => (
                          <option key={area} value={area}>
                            {t(`features.areas.areaType.${area}`)}
                          </option>
                        ))}
                      </select>
                      {errors.areaType && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.areaType.message ?? '')}
                        </p>
                      )}
                    </div>

                    <fieldset>
                      <legend className="mb-1.5 block text-sm font-semibold text-foreground">
                        {t('register.kind')}
                      </legend>
                      <div className="space-y-2">
                        {KINDS.map((kind) => {
                          const active = selectedKind === kind
                          return (
                            <label
                              key={kind}
                              className={cn(
                                'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors',
                                active
                                  ? 'border-primary bg-brand-pineLight text-primary'
                                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                              )}
                            >
                              <input
                                type="radio"
                                value={kind}
                                {...register('kind')}
                                className="h-4 w-4 accent-primary"
                              />
                              {t(`register.kind.${kind}`)}
                            </label>
                          )
                        })}
                      </div>
                    </fieldset>
                  </div>

                  {/* Cột 3 — kỹ năng & lời nhắn (ở sm chiếm cả hàng) */}
                  <div className="space-y-4 sm:col-span-2 md:col-span-1">
                    <div>
                      <Label>{t('register.skills')}</Label>
                      <p className="mb-2 text-xs text-muted-foreground">
                        {t('register.skillsHint')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {skillList.map((skill) => {
                          const active = skills.includes(skill)
                          return (
                            <button
                              key={skill}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleSkill(skill)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                                active
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                              )}
                            >
                              {skill}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="note">{t('register.note')}</Label>
                      <Textarea
                        id="note"
                        rows={3}
                        placeholder={t('register.notePlaceholder')}
                        {...register('note')}
                      />
                      {errors.note && (
                        <p className="mt-1 text-xs font-semibold text-destructive">
                          {t(errors.note.message ?? '')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? t('register.submitting') : t('register.submit')}
                  </Button>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
                    <p className="text-[11px] text-muted-foreground">{t('register.privacy')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('register.staff')}{' '}
                      <Link to="/login" className="font-semibold text-primary hover:underline">
                        {t('register.staffCta')}
                      </Link>
                    </p>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

      </Card>
    </main>
  )
}
