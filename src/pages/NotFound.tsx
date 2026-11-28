import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell, Boxes, Compass, Home, ListChecks, Route } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { roleHomePath, rolePrefix } from '@/lib/roles'

/**
 * Trang 404 — toàn màn hình tối như bản thiết kế Pen "Không Tìm Thấy Trang — 404".
 * Không dùng sidebar: người dùng lạc đường cần lối về ngay, không thêm điều hướng rối.
 */
export default function NotFound() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const home = user ? roleHomePath(user.role) : '/login'
  const prefix = user ? `/${rolePrefix(user.role)}` : ''

  const quickLinks = [
    { key: 'home', icon: Compass, label: t('error.quickOverview', { defaultValue: 'Tổng quan mùa' }), to: home },
    {
      key: 'warehouse',
      icon: Boxes,
      label: t('error.quickWarehouse', { defaultValue: 'Kho vật tư' }),
      to: user?.role === 'COMMUNITY' ? '/community/warehouse' : `${prefix}/inventory`,
    },
    {
      key: 'tasks',
      icon: ListChecks,
      label: t('error.quickTasks', { defaultValue: 'Nhiệm vụ khu' }),
      to: user?.role === 'COMMUNITY' ? '/community/areas' : `${prefix}/tasks`,
    },
    { key: 'notifications', icon: Bell, label: t('error.quickNotifications', { defaultValue: 'Thông báo' }), to: `${prefix}/notifications` },
  ]

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#06281B]">
      <div className="pointer-events-none absolute left-[-200px] top-[-260px] size-[820px] rounded-full bg-[#0E7A4659] blur-[65px]" />
      <div className="pointer-events-none absolute left-[1020px] top-[420px] size-[560px] rounded-full bg-[#E9B9491F] blur-[60px]" />
      <div className="pointer-events-none absolute left-[420px] top-[600px] size-[700px] rounded-full bg-[#127D5129] blur-[60px]" />

      <header className="relative z-10 flex w-full items-center justify-between px-9 py-5">
        <button type="button" onClick={() => navigate(home)} className="flex items-center gap-[11px]">
          <span className="grid size-9 place-items-center rounded-[11px] border border-[#FFFFFF1F] bg-[#FFFFFF14]">
            <Route className="size-[17px] text-[#F2D07A]" aria-hidden />
          </span>
          <span className="flex flex-col items-start gap-px">
            <span className="text-[12.5px] font-extrabold tracking-[0.7px] text-white">GROTTOWORKS</span>
            <span className="font-mono text-[7.5px] font-semibold tracking-[1.7px] text-[#7FA391]">
              {t('error.parishLabel', { defaultValue: 'GIÁO XỨ TÂN ĐỊNH' })}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => navigate(home)}
          className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-[#FFFFFF24] bg-[#FFFFFF14] px-[13px] text-[11px] font-bold text-white transition-colors hover:bg-[#FFFFFF24]"
        >
          <Home className="size-[13px]" aria-hidden />
          {t('error.backHome')}
        </button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <span className="flex items-center gap-[7px] rounded-full border border-[#FFFFFF1F] bg-[#FFFFFF0F] px-[11px] py-[5px]">
          <span className="size-[5px] rounded-full bg-[#E9B949]" />
          <span className="font-mono text-[9px] font-bold tracking-[1.6px] text-[#F2D07A]">
            {t('error.code', { defaultValue: 'LỖI 404 · KHÔNG TÌM THẤY TRANG' })}
          </span>
        </span>

        <div className="relative mt-[14px] h-[154px] w-[520px] max-w-full">
          <div className="pointer-events-none absolute left-[170px] top-[-30px] size-[180px] rounded-full bg-[#12805A40] blur-[30px]" />
          <span className="absolute inset-x-0 top-0 text-center text-[132px] font-extrabold leading-[145px] tracking-[-6px] text-white">
            404
          </span>
        </div>

        <div className="flex flex-col items-center gap-[10px]">
          <h1 className="text-[34px] font-extrabold leading-[37px] tracking-[-1.1px] text-white">
            {t('error.notFoundTitle')}
          </h1>
          <p className="w-[520px] max-w-full text-[12.5px] leading-[22px] text-[#A8C4B4]">{t('error.notFoundSub')}</p>
        </div>

        <div className="mt-[6px] flex items-center gap-[10px] pt-1">
          <button
            type="button"
            onClick={() => navigate(home)}
            className="flex h-11 items-center gap-2 rounded-[12px] bg-[#E9B949] px-5 text-[12.5px] font-extrabold text-[#06281B] shadow-[0px_8px_24px_#E9B9494D] transition-colors hover:bg-[#F2D07A]"
          >
            <Home className="size-[15px]" aria-hidden />
            {t('error.backHome')}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 items-center gap-2 rounded-[12px] border border-[#FFFFFF24] bg-[#FFFFFF0F] px-[18px] text-[12px] font-bold text-[#E8F5EC] transition-colors hover:bg-[#FFFFFF1A]"
          >
            <ArrowLeft className="size-[14px]" aria-hidden />
            {t('error.backPrevious', { defaultValue: 'Quay lại trang trước' })}
          </button>
        </div>

        <div className="mt-3 flex flex-col items-center gap-[9px] pt-[14px]">
          <span className="font-mono text-[8.5px] font-semibold tracking-[1.5px] text-[#5F8271]">
            {t('error.quickOpen', { defaultValue: 'CÓ THỂ BẠN MUỐN MỞ' })}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-[10px]">
            {quickLinks.map(({ key, icon: Icon, label, to }) => (
              <button
                key={key}
                type="button"
                onClick={() => navigate(to)}
                className="flex h-[34px] items-center gap-[7px] rounded-[10px] border border-[#FFFFFF17] bg-[#FFFFFF0A] px-[13px] text-[11px] font-semibold text-[#B9D2C4] transition-colors hover:bg-[#FFFFFF14]"
              >
                <Icon className="size-[13px]" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <span className="mt-1 flex h-[26px] items-center rounded-full border border-[#FFFFFF14] bg-[#FFFFFF08] px-[11px]">
            <span className="font-mono text-[9px] tracking-[0.4px] text-[#6E8C7C]">
              GET {pathname}
            </span>
          </span>
        </div>
      </div>

      <footer className="relative z-10 flex items-center justify-center gap-[10px] py-5">
        <span className="font-mono text-[9px] font-bold tracking-[1.6px] text-[#5F8271]">GROTTOWORKS</span>
        <span className="size-[3px] rounded-full bg-[#3E5C4C]" />
        <span className="text-[9.5px] text-[#5F8271]">
          {t('error.footer', { defaultValue: 'Giáo xứ Tân Định · Mùa Giáng sinh 2026' })}
        </span>
      </footer>
    </main>
  )
}
