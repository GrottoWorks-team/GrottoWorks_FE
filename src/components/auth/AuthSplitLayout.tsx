import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Church, Users, ShieldCheck, LogIn, UserPlus } from 'lucide-react'
import { Snowfall } from '@/components/shared/Snowfall'
import { WinterBackdrop } from '@/components/shared/WinterBackdrop'
import { BethlehemStar } from '@/components/shared/BethlehemStar'

interface AuthSplitLayoutProps {
  children: ReactNode
  activeTab: 'login' | 'register'
}

export function AuthSplitLayout({ children, activeTab }: AuthSplitLayoutProps) {
  return (
    <main className="relative min-h-screen w-full flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Nền mùa đông & tuyết rơi đa tầng phủ toàn bộ không gian */}
      <WinterBackdrop />
      <Snowfall count={75} />

      {/* CỘT TRÁI: SACRED STORYTELLING & WINTER MISSION (Ẩn trên mobile nhỏ hoặc rút gọn thành header) */}
      <div className="relative z-10 lg:w-7/12 min-h-[360px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 text-white">
        {/* Lớp phủ chuyển sắc tối nhẹ để văn bản đạt độ tương phản chuẩn WCAG AAA */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-pine/25 blur-3xl pointer-events-none" />

        {/* Header Cột Trái */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-pine to-emerald-600 border border-brand-gold/40 flex items-center justify-center shadow-lg shadow-brand-pine/50 transition-transform group-hover:scale-105">
              <Church className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <span className="font-serif tracking-widest text-base font-bold text-white block">
                GROTTO<span className="text-brand-gold">WORKS</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider text-emerald-300 block uppercase">
                Parish Grotto Coordination
              </span>
            </div>
          </Link>

          {/* Huy hiệu Mùa Vọng với Ngôi sao Bê-lem SVG */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm">
            <BethlehemStar size={20} />
            <span className="text-xs font-semibold text-emerald-100">
              Mùa Vọng & Giáng Sinh 2026
            </span>
          </div>
        </div>

        {/* Nội dung kể chuyện (Mission Storytelling) */}
        <div className="relative z-10 my-auto py-8 lg:py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-goldLight text-xs font-semibold mb-4">
            <Church className="w-3.5 h-3.5 text-brand-gold" />
            <span>Tinh Thần Hiệp Hành & Phụng Sự Giáo Xứ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white drop-shadow-md">
            Cùng Nhau Dựng Xây <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-amber-200 to-yellow-100 font-serif">
              Hang Đá Bê-lem
            </span>{' '}
            <br />
            Đón Mừng Chúa Giáng Sinh
          </h1>
          <p className="mt-4 text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
            Hệ thống điều phối thi công, minh bạch vật tư, phân công tình nguyện viên và đồng hành cùng các ban hành giáo trong mùa lễ hội linh thiêng.
          </p>

          {/* 3 Thẻ thống kê trực quan với SVG icon */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 transition-colors hover:border-brand-gold/60">
              <div className="flex items-center gap-1.5 text-brand-gold mb-1">
                <Church className="w-4 h-4" />
                <span className="text-lg sm:text-2xl font-bold font-mono">12+</span>
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-200 font-medium">Giáo xứ liên kết</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 transition-colors hover:border-brand-gold/60">
              <div className="flex items-center gap-1.5 text-emerald-300 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-lg sm:text-2xl font-bold font-mono">250+</span>
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-200 font-medium">Tình nguyện viên</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 transition-colors hover:border-brand-gold/60">
              <div className="flex items-center gap-1.5 text-amber-300 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-lg sm:text-2xl font-bold font-mono">100%</span>
              </div>
              <div className="text-[11px] sm:text-xs text-emerald-200 font-medium">Minh bạch vật tư</div>
            </div>
          </div>
        </div>

        {/* Footer Cột Trái: Trích đoạn Tin Mừng */}
        <div className="relative z-10 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-200/80">
          <span>&ldquo;Vinh danh Thiên Chúa trên trời - Bình an dưới thế cho người thiện tâm&rdquo;</span>
          <span className="font-mono text-[11px] text-brand-gold">Lk 2, 14</span>
        </div>
      </div>

      {/* CỘT PHẢI: INTERACTIVE CRYSTAL AUTH CARD */}
      <div className="relative z-20 lg:w-5/12 min-h-full flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md glass-crystal rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          
          {/* Logo GrottoWorks trên thẻ form */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/pic/Logo_GrottoWorks.png"
              alt="GrottoWorks"
              draggable={false}
              className="h-auto w-full max-w-[15rem] select-none"
            />
          </div>

          {/* Segmented Tab Switcher (Đăng Nhập / Đăng Ký) — 100% SVG Icons */}
          <div className="relative bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 mb-6 flex items-center">
            <Link
              to="/login"
              className={`relative w-1/2 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white text-brand-pine shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </Link>

            <Link
              to="/signup"
              className={`relative w-1/2 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-white text-brand-pine shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Đăng Ký</span>
            </Link>
          </div>

          {/* Lối vào luồng khác: chỉ để lại thông tin, không cần tài khoản. */}
          <p className="mb-6 text-center text-xs text-slate-500">
            Chỉ muốn để lại thông tin đồng hành?{' '}
            <Link to="/join" className="font-semibold text-brand-pine hover:underline">
              Đăng ký đồng hành
            </Link>
          </p>

          {/* Nội dung form được truyền vào */}
          {children}

          {/* Footer Card: Bảo mật hệ thống */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-pine" />
            <span>Bảo mật hệ thống giáo xứ · Phân quyền RBAC chuẩn mực</span>
          </div>
        </div>
      </div>
    </main>
  )
}
