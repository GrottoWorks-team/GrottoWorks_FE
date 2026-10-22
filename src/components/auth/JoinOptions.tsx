// Khối "chọn cách tham gia" — hợp nhất LỐI VÀO cho hai luồng đăng ký KHÁC NHAU
// (không gộp trang, vì khác nghiệp vụ & bảo mật):
//   /join   — chỉ để lại thông tin đồng hành, KHÔNG cần tài khoản
//   /signup — tạo tài khoản (credential) để đăng nhập & quản lý
// `current` đánh dấu trang người dùng đang đứng; bỏ trống khi hiển thị ở landing.
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, HeartHandshake, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function JoinOptions({
  current,
  className,
}: {
  current?: 'join' | 'signup'
  className?: string
}) {
  const { t } = useTranslation()
  const options = [
    { key: 'join' as const, to: '/join', icon: HeartHandshake },
    { key: 'signup' as const, to: '/signup', icon: UserPlus },
  ]

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {options.map(({ key, to, icon: Icon }) => {
        const active = current === key
        return (
          <Link
            key={key}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex flex-col gap-1 rounded-card border p-4 text-left transition-colors',
              active
                ? 'border-primary bg-brand-pineLight'
                : 'border-border bg-card hover:border-primary/50',
            )}
          >
            {active && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                <CheckCircle2 className="size-3.5" />
                {t('join.current')}
              </span>
            )}
            <span className="inline-flex items-center gap-2 font-bold text-foreground">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {t(`join.${key}.title`)}
            </span>
            <span className="text-xs text-muted-foreground">{t(`join.${key}.desc`)}</span>
            <span className="mt-1 text-xs font-semibold text-primary group-hover:underline">
              {t(`join.${key}.cta`)} →
            </span>
          </Link>
        )
      })}
    </div>
  )
}
