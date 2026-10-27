import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { KeyRound, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { useResetPassword } from '@/features/auth/api'
import { errorMessage } from '@/lib/errorMessage'

const schema = z
  .object({
    token: z.string().trim().min(1, 'auth.tokenRequired'),
    newPassword: z.string().min(8, 'auth.newPasswordMin'),
    confirmPassword: z.string().min(1, 'auth.confirmNewPassword'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.passwordMismatch',
  })

type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const resetPassword = useResetPassword()
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const tokenFromUrl = searchParams.get('token') ?? ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { token: tokenFromUrl, newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl)
    }
  }, [tokenFromUrl, setValue])

  const onSubmit = async (data: FormData) => {
    setErrorMsg('')
    try {
      await resetPassword.mutateAsync({
        token: data.token,
        newPassword: data.newPassword,
      })
      setSuccess(true)
    } catch (err) {
      setErrorMsg(errorMessage(err))
    }
  }

  return (
    <AuthSplitLayout activeTab="login">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('auth.resetPasswordTitle')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('auth.resetPasswordSub')}</p>
        </div>

        {success ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t('auth.resetPasswordSuccess')}</span>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="btn-festive inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-pine text-white text-xs font-bold shadow hover:bg-brand-pineHover"
              >
                <span>{t('auth.backToLogin')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs font-semibold text-slate-700">
                {t('auth.token')}
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </span>
                <Input
                  id="token"
                  type="text"
                  placeholder="Nhập mã token từ email"
                  className="pl-10 pr-3.5 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm font-mono focus-visible:ring-brand-pine"
                  {...register('token')}
                />
              </div>
              {errors.token && (
                <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(errors.token.message ?? '')}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword" className="text-xs font-semibold text-slate-700">
                {t('auth.newPassword')}
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
                  {...register('newPassword')}
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
              {errors.newPassword && (
                <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(errors.newPassword.message ?? '')}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                {t('auth.confirmNewPassword')}
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-3.5 py-2.5 rounded-xl border-slate-200 bg-white/90 text-sm focus-visible:ring-brand-pine"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="flex items-center gap-1 mt-1 text-xs font-semibold text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{t(errors.confirmPassword.message ?? '')}</span>
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              className="btn-festive w-full py-3.5 rounded-xl bg-brand-pine hover:bg-brand-pineHover text-white font-bold text-sm shadow-lg shadow-brand-pine/25 flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('auth.resetPasswordBtn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="pt-2 text-center text-xs">
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-brand-pine">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('auth.backToLogin')}</span>
          </Link>
        </div>
      </div>
    </AuthSplitLayout>
  )
}
