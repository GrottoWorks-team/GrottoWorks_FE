// Hồ sơ cá nhân — RHF + zod: sửa tên + kỹ năng (PATCH /users/:id), email readonly.
// Điểm vinh danh + giờ công (timesheets lọc theo volunteerId) + chip kỹ năng.
// Sau lưu gọi auth.refresh() để context/header nhận user mới (auth user là snapshot).
import type { CSSProperties } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useSkills } from '@/features/tasks/api'
import { useTimesheets } from '@/features/timesheets/api'
import { useUpdateProfile } from '@/features/profile/api'
import type { User } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'common.required'),
  skills: z.array(z.string()),
})
type FormData = z.infer<typeof schema>

// Form mount riêng khi user đã có (auth pending xong) — defaultValues luôn đúng.
function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<unknown> }) {
  const { t } = useTranslation()
  const toast = useToast()
  const update = useUpdateProfile()
  const { data: allSkills = [] } = useSkills()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, skills: user.skills },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await update.mutateAsync({ id: user.id, name: data.name, skills: data.skills })
    } catch {
      toast(t('common.error'), 'alert')
      return
    }
    // PATCH đã thành công — refresh context fail không kéo theo toast lỗi
    // (header sẽ tự cập nhật lần fetch sau), chỉ log.
    await onSaved().catch((e: unknown) => console.error('profile refresh failed', e))
    toast(t('profile.saved'))
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={user.name} hue={user.avatarHue} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold text-foreground">{user.name}</p>
          <p className="text-sm text-muted-foreground">{t(`role.${user.role}`)}</p>
        </div>
      </div>

      <form id="profile-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="profile-name">{t('profile.name')}</Label>
          <Input id="profile-name" {...register('name')} />
          {errors.name?.message && (
            <p className="mt-1 text-xs font-semibold text-destructive">{t(errors.name.message)}</p>
          )}
        </div>
        <div>
          <Label htmlFor="profile-email">{t('profile.email')}</Label>
          <Input id="profile-email" value={user.email} readOnly />
        </div>
        <div>
          <Label>{t('profile.skills')}</Label>
          <p className="mb-2 text-xs text-muted-foreground">{t('profile.skillsHint')}</p>
          <Controller
            name="skills"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('profile.skills')}>
                {allSkills.map((s) => {
                  const on = field.value.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(
                          on ? field.value.filter((x) => x !== s) : [...field.value, s],
                        )
                      }
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                        on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                      )}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" form="profile-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function Profile() {
  const { t } = useTranslation()
  const { user, refresh } = useAuth()
  const { data: timesheets = [] } = useTimesheets(user?.id)

  if (!user) return <p className="lbl-mono">{t('common.loading')}</p>

  const hours = timesheets.reduce((s, x) => s + (x.hours ?? 0), 0)

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('profile.title')} sub={`${user.email} · ${t(`role.${user.role}`)}`} />

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div style={{ '--d': 0 } as CSSProperties}>
          <StatCard label={t('profile.points')} value={user.points} />
        </div>
        <div style={{ '--d': 1 } as CSSProperties}>
          <StatCard label={t('profile.hours')} value={Math.round(hours * 10) / 10} />
        </div>
      </div>

      <ProfileForm user={user} onSaved={refresh} />
    </div>
  )
}
