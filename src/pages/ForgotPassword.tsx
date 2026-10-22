import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthSplitLayout } from '@/components/auth/AuthSplitLayout'
import { useForgotPassword } from '@/features/auth/api'

const schema = z.object({
  email: z.string().min(1, 'login.emailRequired').email('features.parish.emailInvalid'),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const forgotPassword = useForgotPassword()
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setErrorMsg('')
    try {
      await forgotPassword.mutateAsync(data.email)
      setSuccess(true)
    } catch {
      setErrorMsg(t('common.error'))
    }
  }

  return (
    <AuthSplitLayout activeTab="login">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('auth.forgotPasswordTitle')}</h2>
          <p className="text-xs text-slate-500 mt-1">{t('auth.forgotPasswordSub')}</p>
        </div>

        {success ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{t('auth.forgotPasswordSuccess')}</span>
            </div>
            <div className="pt-2">
              <Link
                to="/reset-password"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-pine hover:underline"
              >
                <span>{t('auth.resetPasswordTitle')} &rarr;</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder="name@grottoworks.local"
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
                  <span>{t('auth.sendResetCode')}</span>
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
