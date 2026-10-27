// Hồ sơ cá nhân — RHF + zod: sửa tên + kỹ năng (PUT /users/me/skills), email readonly,
// Thời gian rảnh (PUT /users/me/availability).
import type { CSSProperties } from 'react'
import { useState } from 'react'
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
import {
  useReplaceMyAvailability,
  useReplaceMySkills,
  useUpdateMyProfile,
  useUpdateProfile,
} from '@/features/profile/api'
import type { User } from '@/types'
import { errorMessage } from '@/lib/errorMessage'

const schema = z.object({
  name: z.string().trim().min(1, 'common.required'),
  skills: z.array(z.string()),
})
type FormData = z.infer<typeof schema>

/** Ba khung giờ rảnh mẫu — chỉ là BỐ CỤC chọn, giờ thật lấy từ BE
 *  (`GET /api/v1/users/me` → availability). Ngày không còn ghim cứng: mỗi lần
 *  lưu, khung giờ được neo vào thứ Bảy/Chủ nhật của TUẦN HIỆN TẠI. */
const SLOT_TEMPLATES = [
  { id: 'weekend_morn', labelKey: 'profile.slotWeekendMorning', day: 6, fromH: 8, toH: 12 },
  { id: 'weekend_after', labelKey: 'profile.slotWeekendAfternoon', day: 6, fromH: 13.5, toH: 17.5 },
  { id: 'weekday_eve', labelKey: 'profile.slotWeekdayEvening', day: 3, fromH: 18.5, toH: 21.5 },
]

/** Neo khung giờ mẫu vào tuần hiện tại (thứ Hai là mốc đầu tuần). */
function slotRange(t: (typeof SLOT_TEMPLATES)[number], base = new Date()) {
  const monday = new Date(base)
  const dow = (monday.getDay() + 6) % 7 // 0 = thứ Hai
  monday.setDate(monday.getDate() - dow)
  monday.setHours(0, 0, 0, 0)
  const start = new Date(monday)
  start.setDate(monday.getDate() + t.day)
  const end = new Date(start)
  start.setHours(Math.floor(t.fromH), (t.fromH % 1) * 60, 0, 0)
  end.setHours(Math.floor(t.toH), (t.toH % 1) * 60, 0, 0)
  return { from: start.toISOString(), to: end.toISOString() }
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => Promise<unknown> }) {
  const { t } = useTranslation()
  const toast = useToast()
  const update = useUpdateProfile()
  const updateMyProfile = useUpdateMyProfile()
  const replaceSkills = useReplaceMySkills()
  const replaceAvailability = useReplaceMyAvailability()
  const { data: allSkills = [] } = useSkills()
  // Khung giờ đang chọn: đọc từ BE (`user.availability`) thay vì luôn rỗng.
  // Khớp theo "thứ + giờ bắt đầu" vì BE trả ngày cụ thể của tuần đã lưu.
  const [selectedSlots, setSelectedSlots] = useState<string[]>(() => {
    const saved = user.availability ?? []
    if (!saved.length) return []
    return SLOT_TEMPLATES.filter((tpl) =>
      saved.some((a) => {
        const d = new Date(a.availableFrom)
        const dow = (d.getDay() + 6) % 7
        return dow === tpl.day && d.getHours() + d.getMinutes() / 60 === tpl.fromH
      }),
    ).map((tpl) => tpl.id)
  })

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
      try {
        await updateMyProfile.mutateAsync({ displayName: data.name })
      } catch {
        // v1 endpoint optional in legacy test env
      }

      // A10: PUT /api/v1/users/me/skills
      try {
        await replaceSkills.mutateAsync(data.skills)
      } catch {
        // Volunteer only in BE policy
      }

      // A11: PUT /api/v1/users/me/availability
      try {
        const slotsToSubmit = SLOT_TEMPLATES
          .filter((s) => selectedSlots.includes(s.id))
          .map((s) => {
            const r = slotRange(s)
            return { availableFrom: r.from, availableTo: r.to, note: t(s.labelKey) }
          })
        if (slotsToSubmit.length > 0) {
          await replaceAvailability.mutateAsync(slotsToSubmit)
        }
      } catch {
        // Volunteer only in BE policy
      }
    } catch (err) {
      toast(errorMessage(err), 'alert')
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

        {/* A11: Khối thời gian rảnh */}
        <div>
          <Label>{t('profile.availability')}</Label>
          <p className="mb-2 text-xs text-muted-foreground">{t('profile.availabilityHint')}</p>
          <div className="space-y-2">
            {SLOT_TEMPLATES.map((s) => {
              const active = selectedSlots.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSlot(s.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-colors text-left',
                    active
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                  )}
                >
                  <span>{t(s.labelKey)}</span>
                  <span className="text-[10px] uppercase tracking-wider">{active ? '✓ Chọn' : '+ Thêm'}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
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
