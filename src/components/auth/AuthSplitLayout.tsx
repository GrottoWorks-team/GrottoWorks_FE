import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Church, LogIn, UserPlus, ShieldCheck, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuthSplitLayoutProps {
  children: ReactNode
  activeTab: 'login' | 'register'
  /** Tiêu đề thẻ; bỏ trống thì đầu thẻ không render (màn quên/đặt lại mật khẩu tự có tiêu đề). */
  title?: string
  subtitle?: string
  badge?: string
  /** Thẻ đăng nhập có vạch vàng dưới đầu thẻ; thẻ đăng ký thì không (theo Pen). */
  accent?: boolean
  /** Hàng tab thấp hơn ở màn đăng ký (Pen: 34px thay vì 38px, không padding trên). */
  compactTabs?: boolean
}

/**
 * Khung chia đôi cho Đăng nhập / Đăng ký — số đo và màu lấy đúng bản thiết kế
 * Pen (KHOA.pen 27/11/2026): cột trái ảnh núi + lớp phủ tối, cột phải nền
 * gradient sáng với thẻ trắng 428px.
 */
export function AuthSplitLayout({
  children,
  activeTab,
  title,
  subtitle,
  badge,
  accent = false,
  compactTabs = false,
}: AuthSplitLayoutProps) {
  const { t } = useTranslation()

  return (
    <main className="flex min-h-screen w-full bg-[#F6F8F4]">
      {/* CỘT TRÁI — ảnh núi tuyết + lớp phủ tối, khối thương hiệu và trích Tin Mừng */}
      <div className="relative hidden w-[748px] shrink-0 flex-col justify-between overflow-hidden p-[56px] text-white lg:flex">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/pic/Login_background@2x.webp')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,#041C13F5 0%,#041C1366 50%,#041C13CC 100%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[-140px] top-[520px] z-[2] size-[520px] rounded-full bg-[#0E7A4633] blur-[55px]"
          aria-hidden
        />

        {/* Thương hiệu + huy hiệu mùa */}
        <div className="relative z-[3] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-[12px]">
            <span className="grid size-[42px] place-items-center rounded-[13px] border border-[#E9B94966] bg-gradient-to-br from-[#12805A] to-[#0A5C36]">
              <Church className="size-[20px] text-[#F2D07A]" aria-hidden />
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="text-[15px] font-extrabold tracking-[0.6px] text-white">GROTTO WORKS</span>
              <span className="text-[8px] font-semibold tracking-[1.6px] text-[#A7F3D0B3]">
                PARISH GROTTO COORDINATION
              </span>
            </span>
          </Link>
          <span className="flex items-center gap-[7px] rounded-full border border-[#FFFFFF2E] bg-[#FFFFFF14] px-[13px] py-[7px]">
            <Star className="size-3 text-[#F2D07A]" aria-hidden />
            <span className="text-[11px] font-semibold tracking-[0.4px] text-[#DFF3E7]">
              {t('auth.seasonPill', { defaultValue: 'Mùa Vọng 2026' })}
            </span>
          </span>
        </div>

        {/* Khối kể chuyện */}
        <div className="relative z-[4] flex flex-col items-start">
          <span className="flex items-center gap-[7px] rounded-full border border-[#E9B94959] bg-[#E9B9491A] px-3 py-[6px]">
            <Church className="size-3 text-[#F2D07A]" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-[1.4px] text-[#F2D07A]">
              {t('auth.tagline')}
            </span>
          </span>
          <div className="h-[22px] w-full" aria-hidden />
          <h1 className="flex w-full flex-col gap-[2px]">
            <span className="text-[42px] font-extrabold leading-[47px] tracking-[-1.2px] text-white">
              {t('auth.headline')}
            </span>
            <span className="bg-gradient-to-r from-[#E9B949] to-[#FBEFC0] bg-clip-text font-display text-[44px] font-semibold italic leading-[50px] tracking-[-0.8px] text-transparent">
              Hang Đá Bê-lem
            </span>
            <span className="text-[42px] font-extrabold leading-[47px] tracking-[-1.2px] text-white">
              Đón Mừng Chúa Giáng Sinh
            </span>
          </h1>
          <div className="h-[20px] w-full" aria-hidden />
          <p className="w-[470px] max-w-full text-[15px] leading-[25px] text-[#D6EADFD9]">
            {t('auth.leftBody', { defaultValue: 'Hệ thống điều phối thi công, minh bạch vật tư, phân công tình nguyện viên và đồng hành cùng các ban hành giáo trong mùa lễ hội linh thiêng.' })}
          </p>
          <div className="h-[34px] w-full" aria-hidden />

          <div className="flex w-full gap-3">
            {[
              { value: '12+', label: t('auth.featureParish'), Icon: Church },
              { value: '250+', label: t('auth.featureVolunteer'), Icon: Star },
              { value: '100%', label: t('auth.featureMaterials'), Icon: ShieldCheck },
            ].map(({ value, label, Icon }) => (
              <div
                key={label}
                className="flex flex-1 flex-col gap-[6px] rounded-[16px] border border-[#FFFFFF24] bg-[#FFFFFF12] px-4 py-[15px] backdrop-blur-[7px]"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-[14px] text-[#F2D07A]" aria-hidden />
                  <span className="text-[22px] font-extrabold leading-[22px] text-white">{value}</span>
                </span>
                <span className="text-[11px] font-medium text-[#A7F3D0C4]">{label}</span>
              </div>
            ))}
          </div>
          <div className="h-10 w-full" aria-hidden />
        </div>

        {/* Trích Tin Mừng */}
        <div className="relative z-[5] flex flex-col gap-4">
          <div className="h-px w-full bg-[#FFFFFF26]" aria-hidden />
          <div className="flex items-center justify-between gap-6">
            <p className="w-[460px] max-w-full text-[11.5px] italic leading-[17px] text-[#A7F3D0C4]">
              {t('auth.verse')}
            </p>
            <span className="font-mono text-[11px] font-semibold tracking-[1px] text-[#F2D07A]">Lc 2, 14</span>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI — thẻ trắng 428px trên nền gradient sáng */}
      <div className="relative flex min-h-screen flex-1 items-center justify-center bg-gradient-to-t from-[#F6F8F4] to-[#EAF0E6] p-4 sm:p-8">
        <div
          className="pointer-events-none absolute left-[430px] top-[-120px] z-0 size-[420px] rounded-full bg-[#E9B9491F] blur-[50px]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[-160px] top-[560px] z-[1] size-[460px] rounded-full bg-[#0A5C3614] blur-[55px]"
          aria-hidden
        />

        <div className="relative z-[2] flex w-full max-w-[428px] flex-col rounded-[26px] border border-[#DFE7DC] bg-white p-[34px] shadow-[0px_26px_54px_#06281B24,0px_2px_6px_#06281B0F]">
          {/* Thương hiệu nhỏ + huy hiệu */}
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-[10px]">
              <span className="grid size-[34px] place-items-center rounded-[11px] bg-[#0A5C36]">
                <Church className="size-[17px] text-[#F2D07A]" aria-hidden />
              </span>
              <span className="flex flex-col gap-px">
                <span className="text-[13px] font-extrabold tracking-[0.5px] text-[#0B2E1F]">GROTTO WORKS</span>
                <span className="text-[7.5px] font-semibold tracking-[1.4px] text-[#8AA298]">
                  PARISH GROTTO COORDINATION
                </span>
              </span>
            </span>
            {badge && (
              <span className="flex items-center gap-[5px] rounded-full bg-[#F0F6EC] px-[9px] py-[5px]">
                <ShieldCheck className="size-[10px] text-[#3F7F5B]" aria-hidden />
                <span className="text-[9.5px] font-bold text-[#3F7F5B]">{badge}</span>
              </span>
            )}
          </div>

          {/* Tiêu đề thẻ */}
          {(title || subtitle || accent) && (
            <div className="flex w-full flex-col gap-[11px] pt-[26px]">
              {accent && <span className="h-[3px] w-[30px] rounded-[2px] bg-[#E9B949]" aria-hidden />}
              {title && (
                <h2 className="w-full text-[25px] font-extrabold leading-[30px] tracking-[-0.6px] text-[#0B2E1F]">
                  {title}
                </h2>
              )}
              {subtitle && <p className="w-full text-[12.5px] leading-[19px] text-[#6B8175]">{subtitle}</p>}
            </div>
          )}

          {/* Tab Đăng nhập / Đăng ký */}
          <div
            className={cn(
              'flex w-full gap-[4px] rounded-[14px] bg-[#F1F5EE] p-[4px]',
              compactTabs ? 'mt-[18px]' : 'mt-[20px]',
            )}
          >
            <Link
              to="/login"
              className={cn(
                'flex flex-1 items-center justify-center gap-[7px] rounded-[11px] transition-colors',
                compactTabs ? 'h-[34px]' : 'h-[38px]',
                activeTab === 'login'
                  ? 'bg-white shadow-[0px_1px_3px_#06281B1A]'
                  : 'hover:bg-white/60',
              )}
            >
              <LogIn
                className={cn('size-[13px]', activeTab === 'login' ? 'text-[#0A5C36]' : 'text-[#6B8175]')}
                aria-hidden
              />
              <span
                className={cn(
                  compactTabs ? 'text-[12px]' : 'text-[12.5px]',
                  activeTab === 'login' ? 'font-bold text-[#0A5C36]' : 'font-semibold text-[#6B8175]',
                )}
              >
                {t('auth.loginTab')}
              </span>
            </Link>
            <Link
              to="/register-account"
              className={cn(
                'flex flex-1 items-center justify-center gap-[7px] rounded-[11px] transition-colors',
                compactTabs ? 'h-[34px]' : 'h-[38px]',
                activeTab === 'register'
                  ? 'bg-white shadow-[0px_1px_3px_#06281B1A]'
                  : 'hover:bg-white/60',
              )}
            >
              <UserPlus
                className={cn('size-[13px]', activeTab === 'register' ? 'text-[#0A5C36]' : 'text-[#6B8175]')}
                aria-hidden
              />
              <span
                className={cn(
                  compactTabs ? 'text-[12px]' : 'text-[12.5px]',
                  activeTab === 'register' ? 'font-bold text-[#0A5C36]' : 'font-semibold text-[#6B8175]',
                )}
              >
                {t('auth.registerTab')}
              </span>
            </Link>
          </div>

          {/* Nội dung form */}
          {children}

          {/* Chân thẻ: bảo mật */}
          <div className="mt-0 flex w-full flex-col gap-4 pt-6">
            <div className="h-px w-full bg-[#E7EDE4]" aria-hidden />
            <p className="flex items-center justify-center gap-[7px] text-[10.5px] text-[#8AA298]">
              <ShieldCheck className="size-[11px] text-[#0A5C36]" aria-hidden />
              {t('auth.securityShort', { defaultValue: 'Bảo mật hệ thống giáo xứ · Phân quyền RBAC' })}
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
