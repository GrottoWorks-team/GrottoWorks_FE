import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import type { Role } from '@/types'

const schema = z.object({
  email: z.string().min(1, 'login.emailRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})
type FormData = z.infer<typeof schema>

const DEMO: { role: Role; email: string }[] = [
  { role: 'PARISH', email: 'admin@grottoworks.vn' },
  { role: 'COMMUNITY', email: 'committee@grottoworks.vn' },
  { role: 'LEADER', email: 'leader@grottoworks.vn' },
  { role: 'MATERIAL_OFFICER', email: 'officer@grottoworks.vn' },
]

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const fillDemo = (email: string) => {
    setValue('email', email)
    setValue('password', 'grotto')
    setServerError('')
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const user = await login(data.email, data.password)
      navigate(`/${user.role === 'MATERIAL_OFFICER' ? 'material-officer' : user.role.toLowerCase()}`)
    } catch {
      // ponytail: mock chỉ có 2 dạng lỗi — 401 sai tài khoản; còn lại hiển thị
      // chung thông điệp tương tự, log để debug.
      const msg = t('login.invalid')
      setServerError(msg)
      toast(msg, 'alert')
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <Card className="g-item w-full max-w-sm overflow-hidden">
        {/* Christmas accent — dải pine với dấu sao (DESIGN_SYSTEM.md mục 36). */}
        <div className="relative grid h-28 place-items-center bg-primary">
          <div className="grid size-14 place-items-center rounded-card bg-brand-gold text-2xl font-extrabold text-foreground">
            ★
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            {t('app.name')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('login.subtitle')}</p>

          <p className="lbl-mono mt-5">{t('login.demoAccounts')}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => fillDemo(d.email)}
                title={d.email}
                className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <span className="block truncate">{t(`role.${d.role}`)}</span>
                <span className="block truncate font-mono text-[10px]">
                  {d.email.split('@')[0]}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
            <div>
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <p className="mt-1 text-xs font-semibold text-destructive">
                  {t(errors.email.message ?? '')}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs font-semibold text-destructive">
                  {t(errors.password.message ?? '')}
                </p>
              )}
            </div>
            {serverError && (
              <p role="alert" className="text-xs font-semibold text-destructive">
                {serverError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('login.loggingIn') : t('login.submit')}
            </Button>
          </form>
        </div>
      </Card>
    </main>
  )
}

