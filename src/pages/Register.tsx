import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  HandHeart,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useRegister } from '@/features/auth/api'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import i18n from '@/lib/i18n'

// BE `RegisterRequest`: password 8–128 ký tự, `parishId` là GUID của giáo xứ đã
// tồn tại. Không có endpoint public trả danh sách giáo xứ (`GET /parishes` cần
// ADMIN/PARISH) → người dùng nhập mã GUID do quản trị giáo xứ cung cấp.
const PARISH_GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const schema = z.object({
  displayName: z.string().trim().min(2, i18n.t('register.nameMin')),
  email: z.string().trim().email(i18n.t('register.emailInvalid')),
  password: z.string().min(8, i18n.t('register.passwordMin')),
  phone: z.string().optional(),
  parishId: z
    .string()
    .trim()
    .regex(PARISH_GUID_RE, i18n.t('register.parishGuidInvalid')),
})

type FormData = z.infer<typeof schema>

// Ô nhập theo bản thiết kế Pen (thẻ đăng ký dùng ô 42px, icon 14px).
const FIELD =
  'flex h-[42px] w-full items-center gap-[9px] rounded-[11px] border border-[#DFE7DC] bg-[#FBFCFA] px-[12px] transition-colors focus-within:border-[#12805A]'
const INPUT = 'min-w-0 flex-1 bg-transparent text-[12px] text-[#0B2E1F] outline-none placeholder:text-[#9AAE9F]'
const LABEL = 'text-[11px] font-semibold text-[#41564A]'
const HINT = 'text-[9.5px] text-[#A3B4A9]'

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const registerMutation = useRegister()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [committed, setCommitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { parishId: '' },
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    if (!committed) {
      toast(t('register.commitRequired', { defaultValue: 'Vui lòng xác nhận cam kết phụng sự' }), 'alert')
      return
    }
    try {
      await registerMutation.mutateAsync({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        phone: data.phone || null,
        parishId: data.parishId,
      })
      toast(t('register.success'))
      navigate('/login')
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('register.failed')
      setServerError(msg)
      toast(msg, 'alert')
    }
  }

  return (
    <AuthSplitLayout
      activeTab="register"
      compactTabs
      badge={t('auth.badgeRegister', { defaultValue: 'Tạo tài khoản' })}
      title={t('auth.titleRegister', { defaultValue: 'Đăng ký tài khoản' })}
      subtitle={t('auth.subRegister', {
        defaultValue: 'Đăng ký để quản lý khu vực, nhiệm vụ và vật tư trong mùa.',
      })}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-[11px] pt-[18px]" noValidate>
        {serverError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[11px] border border-[#F4C7C3] bg-[#FDF2F1] p-2.5 text-[11px] font-semibold text-[#B42318]"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}

        {/* Họ và tên */}
        <div className="flex w-full flex-col gap-[5px]">
          <label htmlFor="displayName" className={LABEL}>
            {t('register.fullName', { defaultValue: 'Họ và tên' })} *
          </label>
          <div className={FIELD}>
            <User className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="displayName"
              placeholder={t('register.namePlaceholder')}
              className={INPUT}
              {...register('displayName')}
            />
          </div>
          {errors.displayName && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {errors.displayName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="flex w-full flex-col gap-[5px]">
          <label htmlFor="email" className={LABEL}>
            {t('register.emailLabel', { defaultValue: 'Địa chỉ Email' })} *
          </label>
          <div className={FIELD}>
            <Mail className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="email"
              type="email"
              placeholder={t('register.emailPlaceholder')}
              className={INPUT}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Mật khẩu */}
        <div className="flex w-full flex-col gap-[5px]">
          <label htmlFor="password" className={LABEL}>
            {t('login.password')} *
          </label>
          <div className={FIELD}>
            <Lock className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
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
              {showPassword ? <EyeOff className="size-[14px]" /> : <Eye className="size-[14px]" />}
            </button>
          </div>
          <p className={HINT}>{t('register.min6')}</p>
          {errors.password && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Điện thoại */}
        <div className="flex w-full flex-col gap-[5px]">
          <label htmlFor="phone" className={LABEL}>
            {t('register.phoneOptional', { defaultValue: 'Điện thoại (tùy chọn)' })}
          </label>
          <div className={FIELD}>
            <Phone className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input id="phone" placeholder="0912 345 678" className={INPUT} {...register('phone')} />
          </div>
        </div>

        {/* Mã giáo xứ */}
        <div className="flex w-full flex-col gap-[5px]">
          <label htmlFor="parishId" className={LABEL}>
            {t('register.parishCode', { defaultValue: 'Mã giáo xứ (GUID)' })}
          </label>
          <div className={FIELD}>
            <Church className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
            <input
              id="parishId"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={cnInputMono(INPUT)}
              {...register('parishId')}
            />
          </div>
          <p className={HINT}>{t('register.parishCodeHint', { defaultValue: 'Do quản trị giáo xứ cung cấp.' })}</p>
          {errors.parishId && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-[#B42318]">
              <AlertCircle className="size-3 shrink-0" aria-hidden />
              {errors.parishId.message}
            </p>
          )}
        </div>

        {/* Cam kết */}
        <label className="flex w-full items-start gap-2 py-[2px] text-[9.5px] leading-[14px] text-[#6B8175]">
          <input
            type="checkbox"
            checked={committed}
            onChange={(e) => setCommitted(e.target.checked)}
            className="mt-px size-[15px] shrink-0 rounded-[5px] border-[#C6D6C6] accent-[#0A5C36]"
          />
          {t('register.commitment')}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-[#0E7A46] to-[#0A5C36] shadow-[0px_8px_18px_#0A5C3640] transition-opacity disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin text-white" aria-hidden />
          ) : (
            <>
              <span className="text-[13px] font-bold tracking-[0.2px] text-white">{t('register.submit')}</span>
              <ArrowRight className="size-[15px] text-white" aria-hidden />
            </>
          )}
        </button>

        <p className="flex w-full items-center justify-center gap-1 pt-[14px] text-[11px] text-[#6B8175]">
          {t('register.haveAccount')}
          <Link to="/login" className="font-bold text-[#0A5C36] hover:underline">
            {t('register.loginNow', { defaultValue: 'Đăng nhập ngay' })}
          </Link>
        </p>

        {/* Lối sang luồng đăng ký đồng hành (không cần tài khoản) */}
        <Link
          to="/register"
          className="flex w-full items-center gap-[10px] rounded-[12px] border border-[#E9EFE6] bg-[#F7F9F5] p-[10px_12px] transition-colors hover:border-[#CBE3D2]"
        >
          <span className="grid size-[26px] shrink-0 place-items-center rounded-[8px] bg-[#EDF4EA]">
            <HandHeart className="size-[13px] text-[#0A5C36]" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="truncate text-[10.5px] font-bold text-[#3B5348]">
              {t('auth.joinCardTitle', { defaultValue: 'Chỉ muốn để lại thông tin đồng hành?' })}
            </span>
            <span className="truncate text-[9.5px] text-[#96AAA0]">
              {t('auth.joinCardDesc', { defaultValue: 'Không cần tài khoản — đăng ký đồng hành' })}
            </span>
          </span>
          <ArrowRight className="size-3 shrink-0 text-[#0A5C36]" aria-hidden />
        </Link>
      </form>
    </AuthSplitLayout>
  )
}

// Mã GUID hiển thị bằng font mono (bản thiết kế: khối ký tự đều nhau).
function cnInputMono(base: string) {
  return `${base} font-mono`
}
