import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { roleHomePath } from '@/lib/roles'
import { useToast } from '@/components/ui/toast'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'

const schema = z.object({
  email: z.string().min(1, 'login.emailRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})
type FormData = z.infer<typeof schema>

// Ô nhập theo bản thiết kế Pen: cao 46px, nền #FBFCFA, viền #DFE7DC, icon 15px.
const FIELD =
  'flex h-[46px] w-full items-center gap-[10px] rounded-[12px] border border-[#DFE7DC] bg-[#FBFCFA] px-[14px] transition-colors focus-within:border-[#12805A]'
const INPUT = 'min-w-0 flex-1 bg-transparent text-[13px] text-[#0B2E1F] outline-none placeholder:text-[#9AAE9F]'
const LABEL = 'text-[11.5px] font-semibold tracking-[0.2px] text-[#41564A]'

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
    <AuthSplitLayout
      activeTab="login"
      accent
      badge={t('auth.badgeLogin', { defaultValue: 'Cổng Giáo Xứ' })}
      title={t('auth.titleLogin', { defaultValue: 'Chào mừng trở lại' })}
      subtitle={t('auth.subLogin', {
        defaultValue: 'Đăng nhập để tiếp tục đồng hành cùng công trình mùa Giáng Sinh.',
      })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-[14px] pt-[18px]" noValidate>
        {/* Email */}
        <div className="flex w-full flex-col gap-[7px]">
          <label htmlFor="email" className={LABEL}>
            {t('login.email')}
          </label>
          <div className={FIELD}>
            <Mail className="size-[15px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tenban@grottoworks.vn"
              className={INPUT}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {t(errors.email.message ?? '')}
            </p>
          )}
        </div>

        {/* Mật khẩu */}
        <div className="flex w-full flex-col gap-[7px]">
          <label htmlFor="password" className={LABEL}>
            {t('login.password')}
          </label>
          <div className={FIELD}>
            <Lock className="size-[15px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={INPUT}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              className="shrink-0 text-[#9AAE9F] transition-colors hover:text-[#0B2E1F]"
            >
              {showPassword ? <EyeOff className="size-[15px]" /> : <Eye className="size-[15px]" />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {t(errors.password.message ?? '')}
            </p>
          )}
        </div>

        {/* Ghi nhớ + quên mật khẩu */}
        <div className="flex w-full items-center justify-between pt-px">
          <label className="flex items-center gap-[7px] text-[11.5px] text-[#6B8175]">
            <input
              type="checkbox"
              className="size-[15px] rounded-[5px] border-[#C6D6C6] accent-[#0A5C36]"
            />
            {t('auth.remember', { defaultValue: 'Ghi nhớ đăng nhập' })}
          </label>
          <Link to="/forgot-password" className="text-[11.5px] font-semibold text-[#0A5C36] hover:underline">
            {t('login.forgotPassword', { defaultValue: 'Quên mật khẩu?' })}
          </Link>
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[12px] border border-[#F4C7C3] bg-[#FDF2F1] p-3 text-[11.5px] font-semibold text-[#B42318]"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        {/* Gửi */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-[#0E7A46] to-[#0A5C36] shadow-[0px_8px_18px_#0A5C3640] transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin text-white" aria-hidden />
          ) : (
            <>
              <span className="text-[13.5px] font-bold tracking-[0.2px] text-white">{t('login.submit')}</span>
              <ArrowRight className="size-4 text-white" aria-hidden />
            </>
          )}
        </button>

        {/* Chưa có tài khoản */}
        <p className="flex w-full items-center justify-center gap-1 pt-[16px] text-[11.5px] text-[#6B8175]">
          {t('login.noManagerAccount')}
          <Link to="/register-account" className="font-bold text-[#0A5C36] hover:underline">
            {t('auth.registerAccountLink', { defaultValue: 'Đăng ký tài khoản' })}
          </Link>
        </p>
        <p className="flex w-full items-center justify-center gap-1 text-[11.5px] text-[#6B8175]">
          {t('login.orVolunteer')}
          <Link to="/register" className="font-bold text-[#C9A227] hover:underline">
            {t('auth.joinLink')}
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  )
}
