import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Phone,
  Church,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useRegister } from '@/features/auth/api'
import { useParishes } from '@/features/parish/api'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { JoinOptions } from '@/components/auth/JoinOptions'
import { errorMessage } from '@/lib/errorMessage'

const schema = z.object({
  displayName: z.string().trim().min(2, 'Họ và tên tối thiểu 2 ký tự'),
  email: z.string().trim().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  phone: z.string().optional(),
  parishId: z.string().min(1, 'Vui lòng chọn hoặc nhập mã giáo xứ'),
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const toast = useToast()
  const registerMutation = useRegister()
  // Danh sách giáo xứ lấy từ BE — trước đây form ghim cứng 2 UUID.
  const { data: parishes = [], isPending: parishesPending } = useParishes()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Tính toán độ mạnh mật khẩu chuẩn UI/UX Pro Max
  const calculateStrength = (pwd: string) => {
    if (!pwd || pwd.length === 0) return { score: 0, label: 'Chưa nhập', color: 'text-slate-400' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score === 1) return { score: 1, label: 'Yếu', color: 'text-rose-500' }
    if (score === 2) return { score: 2, label: 'Trung bình', color: 'text-amber-500' }
    if (score === 3) return { score: 3, label: 'Khá', color: 'text-brand-gold' }
    return { score: 4, label: 'Rất mạnh', color: 'text-brand-pine' }
  }

  const strength = calculateStrength(passwordValue)

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await registerMutation.mutateAsync({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        parishId: data.parishId,
      })
      toast('Đăng ký tài khoản thành công! Vui lòng đăng nhập.')
      navigate('/login')
    } catch (err: any) {
      const msg = errorMessage(err)
      setServerError(msg)
      toast(msg, 'alert')
    }
  }

  return (
    <AuthSplitLayout activeTab="register">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-destructive flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Họ và tên */}
        <div className="space-y-1">
          <Label htmlFor="displayName" className="text-xs font-semibold text-slate-700">
            Họ và tên *
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <Input
              id="displayName"
              placeholder="Giuse Nguyễn Văn A"
              className="pl-10 pr-3.5 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
              {...register('displayName')}
            />
          </div>
          {errors.displayName && (
            <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.displayName.message}</span>
            </p>
          )}
        </div>

        {/* Địa chỉ Email */}
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
            Địa chỉ Email *
          </Label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              className="pl-10 pr-3.5 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.email.message}</span>
            </p>
          )}
        </div>

        {/* Mật khẩu + Thước đo độ mạnh */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
              Mật khẩu *
            </Label>
            <span className={`text-[10px] font-bold font-mono ${strength.color}`}>
              {strength.label}
            </span>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 6 ký tự"
              className="pl-10 pr-10 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
              {...register('password', {
                onChange: (e) => setPasswordValue(e.target.value),
              })}
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

          {/* 4 vạch đo độ mạnh mật khẩu */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                strength.score >= 1 ? 'bg-rose-500' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                strength.score >= 2 ? 'bg-amber-500' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                strength.score >= 3 ? 'bg-brand-gold' : 'bg-slate-200'
              }`}
            />
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                strength.score >= 4 ? 'bg-brand-pine' : 'bg-slate-200'
              }`}
            />
          </div>

          {errors.password && (
            <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.password.message}</span>
            </p>
          )}
        </div>

        {/* Số điện thoại & Giáo xứ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs font-semibold text-slate-700">
              Điện thoại (tùy chọn)
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Phone className="w-3.5 h-3.5" />
              </span>
              <Input
                id="phone"
                placeholder="0912 345 678"
                className="pl-9 pr-3 py-2 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
                {...register('phone')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parishId" className="text-xs font-semibold text-slate-700">
              Giáo xứ tham gia
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Church className="w-3.5 h-3.5" />
              </span>
              <select
                id="parishId"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white/90 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-pine/30 focus:border-brand-pine transition-all"
                disabled={parishesPending}
                {...register('parishId')}
              >
                <option value="">
                  {parishesPending ? 'Đang tải danh sách giáo xứ…' : '— Chọn giáo xứ —'}
                </option>
                {parishes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {errors.parishId && (
              <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.parishId.message}</span>
              </p>
            )}
          </div>
        </div>

        {/* Cam kết phụ sự */}
        <div className="pt-1 flex items-start gap-2 text-[11px] text-slate-600">
          <ShieldCheck className="w-4 h-4 text-brand-pine shrink-0 mt-0.5" />
          <span>Tôi cam kết phục vụ thi công hang đá theo tinh thần thiện nguyện và kỷ luật của giáo xứ.</span>
        </div>

        {/* Nút Tạo tài khoản */}
        <Button
          type="submit"
          className="btn-festive w-full py-3.5 rounded-xl bg-brand-pine hover:bg-brand-pineHover text-white font-bold text-sm shadow-lg shadow-brand-pine/25 flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo tài khoản...</span>
            </>
          ) : (
            <>
              <span>Tạo tài khoản GrottoWorks</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Link quay lại đăng nhập */}
        <div className="text-center text-xs pt-1 text-slate-600">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-brand-pine hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </form>

      {/* Hợp nhất lối vào: nhắc luồng còn lại là đăng ký đồng hành (không cần tài khoản). */}
      <JoinOptions current="signup" className="mt-4" />
    </AuthSplitLayout>
  )
}
