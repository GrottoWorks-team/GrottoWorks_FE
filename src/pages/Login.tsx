import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Crown,
  Users,
  Hammer,
  Package,
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
import type { Role } from '@/types'

const schema = z.object({
  email: z.string().min(1, 'login.emailRequired'),
  password: z.string().min(1, 'login.passwordRequired'),
})
type FormData = z.infer<typeof schema>

interface DemoRoleConfig {
  role: Role
  email: string
  icon: typeof Crown
  color: string
}

const DEMO: DemoRoleConfig[] = [
  { role: 'PARISH', email: 'admin@grottoworks.vn', icon: Crown, color: 'text-amber-600' },
  { role: 'COMMUNITY', email: 'committee@grottoworks.vn', icon: Users, color: 'text-emerald-700' },
  { role: 'LEADER', email: 'leader@grottoworks.vn', icon: Hammer, color: 'text-blue-700' },
  { role: 'MATERIAL_OFFICER', email: 'officer@grottoworks.vn', icon: Package, color: 'text-indigo-700' },
]

// Mật khẩu của các tài khoản demo/test trong `ACCOUNTS.md` (BE yêu cầu ≥ 8 ký tự,
// có ít nhất 1 chữ và 1 số nên `grotto` không hợp lệ). Đổi bằng biến môi trường
// VITE_DEMO_PASSWORD nếu seed ở máy bạn dùng mật khẩu khác.
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'grotto123'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const fillDemo = (email: string) => {
    setValue('email', email)
    setValue('password', DEMO_PASSWORD)
    setServerError('')
    setActiveDemo(email)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setActiveDemo(null), 1200)
  }

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const user = await login(data.email, data.password)
      if (user.rawRole === 'VOLUNTEER') {
        navigate('/volunteer')
      } else {
        navigate(roleHomePath(user.role))
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
        {/* Hộp chọn nhanh tài khoản mẫu (1-Chạm) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="lbl-mono flex items-center gap-1.5 font-bold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
              {t('login.demoAccounts', { password: DEMO_PASSWORD })}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Bấm để tự điền</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO.map((d) => {
              const Icon = d.icon
              const isSelected = activeDemo === d.email
              return (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => fillDemo(d.email)}
                  title={d.email}
                  className={`group relative rounded-xl border p-2.5 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-brand-pine bg-brand-pineLight/60 ring-2 ring-brand-pine/30 shadow-sm'
                      : 'border-slate-200 bg-white/80 hover:border-brand-pine hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${d.color}`} />
                    <span className="truncate text-xs font-bold text-slate-800 group-hover:text-brand-pine">
                      {t(`role.${d.role}`)}
                    </span>
                  </div>
                  <span className="block truncate font-mono text-[10px] text-slate-500 mt-0.5">
                    {d.email.split('@')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

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
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
            className="btn-festive w-full py-3.5 rounded-xl bg-brand-pine hover:bg-brand-pineHover text-white font-bold text-sm shadow-lg shadow-brand-pine/25 flex items-center justify-center gap-2"
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
              Chưa có tài khoản quản lý?{' '}
              <Link to="/register-account" className="font-semibold text-brand-pine hover:underline">
                Đăng ký tài khoản
              </Link>
            </div>
            <div>
              Hoặc tham gia thiện nguyện?{' '}
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
