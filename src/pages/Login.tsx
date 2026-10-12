import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { Snowfall } from '@/components/shared/Snowfall'
import { WinterBackdrop } from '@/components/shared/WinterBackdrop'
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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-background p-4">
      {/* Nền mùa đông: thị trấn trên các đỉnh núi tuyết + tuyết rơi liên tục. */}
      <WinterBackdrop />
      <Snowfall />
      <Card className="g-item relative z-10 w-full max-w-sm overflow-hidden shadow-xl ring-1 ring-black/5">
        {/* Logo GrottoWorks (DESIGN_SYSTEM.md mục 36 — Christmas element ở Login). */}
        <div className="grid place-items-center gap-3 border-b border-border bg-gradient-to-b from-brand-pineLight to-card px-6 py-6">
          {/* w-full + max-w để logo to nhất có thể mà không tràn thẻ trên màn nhỏ;
              h-auto giữ đúng tỉ lệ (không méo). */}
          <img
            src="/pic/Logo_GrottoWorks.png"
            alt="GrottoWorks"
            draggable={false}
            className="h-auto w-full max-w-[17rem] select-none"
          />
          <h1 className="sr-only">{t('app.name')}</h1>
          <p className="text-center text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>
        <div className="p-6">
          <p className="lbl-mono">{t('login.demoAccounts')}</p>
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

            <div className="text-center text-sm pt-2 text-grotto-muted">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-medium text-grotto-primary hover:underline">
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </main>
  )
}

