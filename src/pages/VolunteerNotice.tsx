import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarCheck,
  Church,
  ClipboardCheck,
  Clock,
  LogOut,
  ShieldCheck,
  Smartphone,
  Timer,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'

/**
 * Màn hình cho tài khoản Tình nguyện viên (web chưa hỗ trợ vai trò này) —
 * bố cục/màu lấy đúng bản thiết kế Pen "Tài Khoản Tình Nguyện Viên".
 */
export default function VolunteerNotice() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = (user?.name ?? 'TN')
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  const today = new Date().toLocaleDateString('vi-VN')

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#F4F6F1]">
      <div
        className="pointer-events-none absolute left-[-160px] top-[-180px] z-0 size-[520px] rounded-full bg-[#0A5C3614] blur-[45px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[1150px] top-[640px] z-[1] size-[480px] rounded-full bg-[#E9B9491F] blur-[50px]"
        aria-hidden
      />

      {/* Thanh trên */}
      <header className="relative z-[2] flex h-[72px] w-full items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-[11px]">
          <span className="grid size-9 place-items-center rounded-[11px] bg-[#0A5C36]">
            <Church className="size-[17px] text-[#F2D07A]" aria-hidden />
          </span>
          <span className="flex flex-col gap-px">
            <span className="text-[12.5px] font-extrabold tracking-[0.6px] text-[#0B2E1F]">GROTTOWORKS</span>
            <span className="text-[7.5px] font-semibold uppercase tracking-[1.6px] text-[#8AA298]">
              {t('app.parish')}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-[10px]">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#0A5C36] pb-px">
            <span className="text-[11px] font-extrabold text-[#F2D07A]">{initials}</span>
          </span>
          <span className="hidden flex-col gap-px sm:flex">
            <span className="text-[11.5px] font-bold text-[#0B2E1F]">{user?.name}</span>
            <span className="font-mono text-[9px] text-[#8AA298]">{user?.email}</span>
          </span>
          <span className="hidden h-6 w-px bg-[#DDE6D8] sm:block" aria-hidden />
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex h-8 items-center gap-[6px] rounded-[9px] border border-[#DBE5D6] bg-white px-[11px] transition-colors hover:bg-[#F4F8F1]"
          >
            <LogOut className="size-[13px] text-[#5C7468]" aria-hidden />
            <span className="text-[11px] font-semibold text-[#2C463A]">{t('common.logout')}</span>
          </button>
        </div>
      </header>

      {/* Thẻ thông báo */}
      <main className="relative z-[3] flex w-full flex-1 items-center justify-center px-4 pb-10 sm:px-8">
        <div className="flex w-full max-w-[1000px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0px_24px_60px_#06281B1F,0px_2px_6px_#06281B0F] lg:min-h-[540px] lg:flex-row">
          {/* Panel trái — nền rừng tối + mock ứng dụng */}
          <div className="relative flex w-full shrink-0 flex-col justify-between gap-8 overflow-hidden bg-[#06281B] p-[26px] lg:w-[360px]">
            <div
              className="pointer-events-none absolute left-[-90px] top-[250px] z-0 size-[340px] rounded-full bg-[#0E7A4640] blur-[40px]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[200px] top-[-90px] z-[1] size-[240px] rounded-full bg-[#E9B9491F] blur-[35px]"
              aria-hidden
            />

            <div className="relative z-[2] flex flex-col gap-[7px]">
              <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#FFFFFF24] bg-[#FFFFFF14] px-[9px] py-1">
                <ShieldCheck className="size-[11px] text-[#F2D07A]" aria-hidden />
                <span className="font-mono text-[8.5px] font-bold tracking-[1.1px] text-[#F2D07A]">
                  {t('features.volunteer.roleBadge', { defaultValue: 'Vai trò tình nguyện viên' })}
                </span>
              </span>
              <h2 className="w-full text-[26px] font-extrabold leading-[31px] tracking-[-0.6px] text-white">
                {t('features.volunteer.appTitle', { defaultValue: 'Ứng dụng' })}
              </h2>
              <p className="w-full text-[11px] leading-[18px] text-[#9DBBA9]">
                {t('features.volunteer.appNote', {
                  defaultValue: 'Điểm danh, nhận việc và ghi giờ công ngay tại công trường.',
                })}
              </p>
            </div>

            {/* Mock điện thoại */}
            <div className="relative mx-auto flex h-[300px] w-[196px] shrink-0 flex-col overflow-hidden rounded-[26px] border-[1.5px] border-[#FFFFFF1F] bg-[#0B3324]">
              <span className="absolute left-[70px] top-[9px] z-0 h-[5px] w-14 rounded-full bg-[#FFFFFF24]" aria-hidden />
              <div className="relative z-[1] flex w-full flex-1 flex-col gap-2 px-[14px] pb-[14px] pt-6">
                <p className="text-[13px] font-extrabold text-white">
                  {t('features.volunteer.greeting', { defaultValue: 'Chào bạn 👋' })}
                </p>
                <p className="font-mono text-[8.5px] tracking-[0.8px] text-[#7FA391]">
                  {t('features.volunteer.todayShift', { defaultValue: 'Hôm nay · Ca sáng' })}
                </p>
                <div className="flex w-full flex-col gap-[6px] rounded-[12px] border border-[#127D5159] bg-[#127D511F] p-[10px]">
                  <span className="font-mono text-[7.5px] font-bold tracking-[0.9px] text-[#7FA391]">
                    {t('features.volunteer.todayTask', { defaultValue: 'Nhiệm vụ hôm nay' })}
                  </span>
                  <span className="w-full text-[10.5px] font-bold leading-[15px] text-white">
                    {t('features.volunteer.sampleTask', { defaultValue: 'Chuẩn bị khung hang đá' })}
                  </span>
                  <span className="flex items-center gap-[5px]">
                    <CalendarCheck className="size-[9px] text-[#8FD0AE]" aria-hidden />
                    <span className="font-mono text-[8px] text-[#9DBBA9]">{today}</span>
                  </span>
                </div>
                {[
                  { Icon: UserCheck, key: 'checkIn' },
                  { Icon: ClipboardCheck, key: 'takeTask' },
                  { Icon: Timer, key: 'logHours' },
                ].map(({ Icon, key }) => (
                  <span key={key} className="flex w-full items-center gap-[7px] rounded-[9px] bg-[#FFFFFF0F] px-[9px] py-[7px]">
                    <Icon className="size-[10px] text-[#8FD0AE]" aria-hidden />
                    <span className="text-[9.5px] font-semibold text-[#CFE0D4]">
                      {t(`features.volunteer.mock.${key}`, {
                        defaultValue: key === 'checkIn' ? 'Điểm danh' : key === 'takeTask' ? 'Nhận việc' : 'Ghi giờ công',
                      })}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <p className="relative z-[4] flex items-center gap-[7px] font-mono text-[8.5px] tracking-[0.6px] text-[#7FA391]">
              <Smartphone className="size-3 text-[#8FD0AE]" aria-hidden />
              {t('features.volunteer.appVersions', { defaultValue: 'iOS · Android · Bản 2.4' })}
            </p>
          </div>

          {/* Nội dung phải */}
          <div className="flex flex-1 flex-col justify-between gap-6 p-8 sm:px-[34px] sm:pb-[30px] sm:pt-[34px]">
            <div className="flex w-full flex-col gap-[9px]">
              <p className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-semibold tracking-[1.3px] text-[#8C9F94]">
                  {t('features.volunteer.accountLabel', { defaultValue: 'Tài khoản' })}
                </span>
                <span className="h-px w-6 bg-[#DBE5D6]" aria-hidden />
                <span className="font-mono text-[9px] font-bold tracking-[1.1px] text-[#0A5C36]">
                  ROLE: {user?.rawRole ?? 'VOLUNTEER'}
                </span>
              </p>
              <h1 className="w-full text-[27px] font-extrabold leading-[32px] tracking-[-0.8px] text-[#0B2E1F]">
                {t('features.volunteer.mobileNoticeTitle')}
              </h1>
              <p className="w-full text-[12px] leading-[20px] text-[#6B8175]">
                {t('features.volunteer.mobileNoticeDesc')}
              </p>
            </div>

            {/* Tài khoản đang đăng nhập */}
            <div className="flex w-full items-center gap-3 rounded-[14px] border border-[#E9EFE4] bg-[#F7F9F5] px-[14px] py-3">
              <span className="grid size-9 place-items-center rounded-[11px] bg-[#0A5C36]">
                <span className="text-[12px] font-extrabold text-[#F2D07A]">{initials}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span className="truncate text-[12px] font-bold text-[#0B2E1F]">{user?.name}</span>
                <span className="truncate font-mono text-[9.5px] text-[#8AA298]">{user?.email}</span>
              </span>
              <span className="flex w-fit shrink-0 items-center gap-[5px] rounded-full border border-[#CBE3D2] bg-[#E9F4EC] px-[9px] py-1">
                <span className="size-1.5 rounded-full bg-[#1B6B45]" aria-hidden />
                <span className="text-[9.5px] font-bold text-[#1B6B45]">
                  {t('features.volunteer.active', { defaultValue: 'Đang hoạt động' })}
                </span>
              </span>
            </div>

            {/* Thông báo */}
            <div className="flex w-full items-start gap-[10px] rounded-[14px] border border-[#EDD9A6] bg-[#FCF3DE] px-[14px] py-[13px]">
              <AlertTriangle className="mt-px size-[15px] shrink-0 text-[#C98A12]" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[11.5px] font-bold text-[#7C5A12]">
                  {t('features.volunteer.webUnsupportedTitle', {
                    defaultValue: 'Giao diện quản trị web chưa hỗ trợ vai trò này',
                  })}
                </span>
                <span className="w-full text-[10.5px] leading-[17px] text-[#9A6A0C]">
                  {t('features.volunteer.webUnsupportedDesc', {
                    defaultValue: 'Vui lòng dùng ứng dụng di động để điểm danh, nhận việc và ghi giờ công.',
                  })}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-[10px]">
              <a
                href="#download"
                className="flex h-[42px] items-center gap-2 rounded-[12px] bg-[#0A5C36] px-[18px] transition-colors hover:bg-[#0D7344]"
              >
                <Smartphone className="size-[15px] text-[#F2D07A]" aria-hidden />
                <span className="text-[12.5px] font-bold text-white">
                  {t('features.volunteer.openApp', { defaultValue: 'Mở ứng dụng di động' })}
                </span>
              </a>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex h-[42px] items-center gap-2 rounded-[12px] border border-[#DBE5D6] bg-white px-4 transition-colors hover:bg-[#F4F8F1]"
              >
                <LogOut className="size-[14px] text-[#5C7468]" aria-hidden />
                <span className="text-[12px] font-semibold text-[#2C463A]">{t('common.logout')}</span>
              </button>
            </div>

            <p className="flex items-center gap-1.5 text-[10px] text-[#A3B4A9]">
              <Clock className="size-[10px]" aria-hidden />
              {t('features.volunteer.needAdmin', {
                defaultValue: 'Cần quyền quản trị? Liên hệ Trưởng ban hành giáo của giáo xứ.',
              })}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
