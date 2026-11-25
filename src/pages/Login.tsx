import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { roleHomePath } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'

const schema = z.object({
  email: z.string().min(1, 'login.emailRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // 401 giữa phiên / vào route cần đăng nhập → quay lại đúng màn sau khi đăng nhập.
  const returnTo = (location.state as { from?: string } | null)?.from
  const toast = useToast()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const user = await login(data.email, data.password)
      // Chỉ nhận đường dẫn nội bộ; không quay lại /login để tránh vòng lặp.
      const back =
        returnTo && returnTo.startsWith('/') && !returnTo.startsWith('/login') ? returnTo : null
      if (user.rawRole === 'VOLUNTEER') {
        navigate(back ?? '/volunteer', { replace: true })
      } else {
        navigate(back ?? roleHomePath(user.role), { replace: true })
      }
    } catch {
      const msg = t('login.invalid')
      setServerError(msg)
      toast(msg, 'alert')
    }
  }

  return (
    <AuthSplitLayout activeTab="login">
      <div className="space-y-5">
        {/* Form đăng nhập chính */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Ô nhập Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
              {t('login.email')}
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tenban@grottoworks.vn"
                className="pl-10 pr-3.5 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t(errors.email.message ?? '')}</span>
              </p>
            )}
          </div>

          {/* Ô nhập Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                {t('login.password')}
              </Label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-brand-pine hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{t('login.forgotPassword', { defaultValue: 'Quên mật khẩu?' })}</span>
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10 pr-10 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t(errors.password.message ?? '')}</span>
              </p>
            )}
          </div>

          {/* Thông báo lỗi từ server */}
          {serverError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-destructive flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Nút bấm Submit với hiệu ứng Shimmer */}
          <Button
            type="submit"
            className="btn-festive w-full py-3.5 rounded-xl bg-brand-pine hover:bg-brand-pineHover text-white font-bold text-sm flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('login.loggingIn')}</span>
              </>
            ) : (
              <>
                <span>{t('login.submit')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>

          {/* Liên kết điều hướng phụ */}
          <div className="pt-2 text-center text-xs text-slate-600 space-y-1">
            <div>
              {t('login.noManagerAccount')}{' '}
              <Link to="/register-account" className="font-semibold text-brand-pine hover:underline">
                Đăng ký tài khoản
              </Link>
            </div>
            <div>
              {t('login.orVolunteer')}{' '}
              <Link to="/register" className="font-semibold text-brand-goldHover hover:underline">
                Đăng ký Đồng Hành
              </Link>
            </div>
          </div>
        </form>
      </div>
    </AuthSplitLayout>
  )
}
