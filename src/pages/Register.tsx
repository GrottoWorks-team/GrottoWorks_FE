import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useRegister } from '@/features/auth/api'

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
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      parishId: '11111111-1111-1111-1111-111111111111',
    },
  })

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
      const msg = err.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      setServerError(msg)
      toast(msg, 'alert')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grotto-bg px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-grotto-primary/10 text-2xl text-grotto-primary">
            ✨
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-grotto-text">
            Đăng ký tài khoản GrottoWorks
          </h1>
          <p className="text-sm text-grotto-muted">
            Tham gia điều phối và phục vụ công tác Mùa Vọng & Giáng Sinh
          </p>
        </div>

        <Card className="p-6 shadow-sm border-grotto-border bg-white">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {serverError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Họ và tên *</Label>
              <Input
                id="displayName"
                placeholder="Nguyễn Văn A"
                {...register('displayName')}
              />
              {errors.displayName && (
                <p className="text-xs text-red-500">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Địa chỉ Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại (tùy chọn)</Label>
              <Input
                id="phone"
                placeholder="0912 345 678"
                {...register('phone')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parishId">Giáo xứ tham gia</Label>
              <select
                id="parishId"
                className="w-full rounded-md border border-grotto-border bg-white px-3 py-2 text-sm text-grotto-text focus:outline-none focus:ring-2 focus:ring-grotto-primary"
                {...register('parishId')}
              >
                <option value="11111111-1111-1111-1111-111111111111">
                  Giáo xứ Chính Tòa (Mặc định)
                </option>
                <option value="22222222-2222-2222-2222-222222222222">
                  Giáo xứ Tân Định
                </option>
              </select>
              {errors.parishId && (
                <p className="text-xs text-red-500">{errors.parishId.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-grotto-primary hover:bg-grotto-primary/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang đăng ký...' : 'Tạo tài khoản'}
            </Button>

            <div className="text-center text-sm pt-2 text-grotto-muted">
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-medium text-grotto-primary hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
