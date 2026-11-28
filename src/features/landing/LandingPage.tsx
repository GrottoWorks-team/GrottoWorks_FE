import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Church,
  HandHeart,
  Map,
  QrCode,
  Sparkles,
  UserPlus,
} from 'lucide-react'
import { CountUp } from './components/CountUp'

// Bố cục/màu/cỡ chữ lấy đúng bản thiết kế Pen (Trang Chủ — GrottoWorks).
const HERO_AREAS = ['card1', 'card2', 'card3', 'card4'] as const
const HERO_PROGRESS = [82, 64, 47, 71]

const STATS: { key: string; to: number; suffix?: string; pad?: boolean }[] = [
  { key: 'areas', to: 5, pad: true },
  { key: 'roles', to: 4, pad: true },
  { key: 'skills', to: 7, pad: true },
  { key: 'transparency', to: 100, suffix: '%' },
]

const ZONES = [
  { slug: 'grotto', area: 'GROTTO' },
  { slug: 'tree', area: 'TREE' },
  { slug: 'lighting', area: 'LIGHTING' },
  { slug: 'yard', area: 'YARD' },
  { slug: 'stage', area: 'STAGE' },
] as const

const WHY = ['card1', 'card2', 'card3', 'card4'] as const

/** Tiêu đề nhỏ mono có vạch kẻ — dùng chung cho các mục. */
function Eyebrow({ text, light = false }: { text: string; light?: boolean }) {
  return (
    <p className="flex items-center gap-2">
      <span
        className={light ? 'h-px w-[26px] bg-[#E9B949CC]' : 'h-px w-[26px] bg-[#0A5C3699]'}
        aria-hidden
      />
      <span
        className={
          light
            ? 'font-mono text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#F2D07A]'
            : 'font-mono text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#0A5C36]'
        }
      >
        {text}
      </span>
    </p>
  )
}

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[12px] border border-[#E9B94966] bg-gradient-to-br from-[#12805A] to-[#0A5C36]"
      style={{ width: size, height: size }}
    >
      <Church className="text-[#F2D07A]" style={{ width: size / 2.1, height: size / 2.1 }} aria-hidden />
    </span>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F6F8F3]">
      {/* NAV — 74px, nền trắng, viền dưới #E6ECE3 */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E6ECE3] bg-white">
        <div className="mx-auto flex h-[74px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-16">
          <Link to="/" className="flex items-center gap-[11px]" aria-label={t('app.name')}>
            <BrandMark />
            <span className="flex flex-col gap-px">
              <span className="text-[13px] font-extrabold tracking-[0.5px] text-[#0B2E1F]">GROTTO WORKS</span>
              <span className="text-[7.5px] font-semibold tracking-[1.3px] text-[#8AA298]">
                PARISH GROTTO COORDINATION
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            <a href="#about" className="text-[12px] font-medium text-[#5C7468] hover:text-[#0A5C36]">
              {t('landing.nav.about')}
            </a>
            <a href="#areas" className="text-[12px] font-medium text-[#5C7468] hover:text-[#0A5C36]">
              {t('landing.nav.areas')}
            </a>
            <a href="#download" className="text-[12px] font-medium text-[#5C7468] hover:text-[#0A5C36]">
              {t('landing.nav.download')}
            </a>
          </nav>

          <div className="flex items-center gap-[10px]">
            <Link
              to="/login"
              className="flex h-9 items-center rounded-[10px] px-[14px] text-[12px] font-semibold text-[#2C463A] transition-colors hover:bg-[#F1F6EE]"
            >
              {t('landing.login')}
            </Link>
            <Link
              to="/register"
              className="flex h-9 items-center gap-[7px] rounded-[10px] bg-[#0A5C36] px-[14px] shadow-[0px_6px_14px_#0A5C3629] transition-colors hover:bg-[#0D7344]"
            >
              <span className="text-[12px] font-bold text-white">{t('landing.registerCta')}</span>
              <ArrowRight className="size-[13px] text-white" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO — 660px, ảnh núi tuyết + lớp phủ tối */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/pic/Login_background@2x.webp')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg,#041C13EE 0%,#041C1399 55%,#041C13E6 100%)' }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[560px] w-full max-w-[1440px] items-center px-4 py-16 sm:px-8 lg:min-h-[660px] lg:px-16">
          <div className="flex w-full flex-col items-start gap-[52px] lg:flex-row lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <Eyebrow text={t('landing.hero.badge')} light />
              <div className="h-5" aria-hidden />
              <h1 className="flex w-full flex-col">
                <span className="max-w-[700px] text-[34px] font-extrabold leading-[1.1] tracking-[-1.8px] text-white sm:text-[42px] lg:text-[50px]">
                  {t('landing.hero.title')}
                </span>
                <span className="max-w-[700px] bg-gradient-to-r from-[#E9B949] to-[#FBEFC0] bg-clip-text font-display text-[32px] font-semibold italic leading-[1.2] tracking-[-0.8px] text-transparent sm:text-[38px] lg:text-[46px]">
                  {t('landing.hero.titleAccent')}
                </span>
              </h1>
              <div className="h-[18px]" aria-hidden />
              <p className="max-w-[500px] text-[14px] leading-[25px] text-[#D6EADFD9]">{t('landing.hero.subtitle')}</p>
              <div className="h-[30px]" aria-hidden />
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="flex h-[46px] items-center gap-2 rounded-[12px] border border-[#E9B9494D] bg-[#0A5C36] px-5 shadow-[0px_10px_24px_#00000040] transition-colors hover:bg-[#0D7344]"
                >
                  <HandHeart className="size-[15px] text-[#F2D07A]" aria-hidden />
                  <span className="text-[12.5px] font-bold text-white">{t('landing.hero.ctaPrimary')}</span>
                </Link>
                <a
                  href="#areas"
                  className="flex h-[46px] items-center gap-2 rounded-[12px] border border-[#FFFFFF38] bg-[#FFFFFF12] px-5 transition-colors hover:bg-[#FFFFFF1F]"
                >
                  <Map className="size-[15px] text-white" aria-hidden />
                  <span className="text-[12.5px] font-semibold text-white">{t('landing.hero.ctaSecondary')}</span>
                </a>
              </div>
            </div>

            {/* Thẻ tiến độ mùa */}
            <div className="w-full shrink-0 rounded-[22px] border border-[#FFFFFF38] bg-[#FFFFFF17] p-5 backdrop-blur-[10px] lg:w-[392px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1.2px] text-[#F2D07A]">
                  {t('landing.hero.cardTag')}
                </span>
                <span className="flex items-center gap-[5px] rounded-full bg-[#FFFFFF26] px-2 py-[3px]">
                  <span className="size-[5px] rounded-full bg-[#8FD0AE]" aria-hidden />
                  <span className="text-[9.5px] font-semibold text-[#DFF3E7]">
                    {t('landing.hero.cardStatus', { defaultValue: 'Đang chuẩn bị' })}
                  </span>
                </span>
              </div>
              <h2 className="mt-[13px] text-[15px] font-extrabold tracking-[-0.2px] text-white">
                {t('landing.hero.cardTitle')}
              </h2>
              <p className="mt-[4px] text-[10.5px] text-[#A9D7BF]">{t('landing.hero.cardSub')}</p>

              <ul className="mt-[13px] flex flex-col gap-[10px] pt-1">
                {HERO_AREAS.map((key, i) => (
                  <li key={key}>
                    <div className="mb-[5px] flex items-center justify-between gap-3">
                      <span className="text-[10.5px] text-[#DFF3E7]">{t(`landing.hero.${key}`)}</span>
                      <span className="font-mono text-[9.5px] font-bold text-white">{HERO_PROGRESS[i]}%</span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-[2px] bg-[#FFFFFF2E]">
                      <div
                        className="h-1 rounded-[2px] bg-gradient-to-r from-[#E9B949] to-[#8FD0AE]"
                        style={{ width: `${HERO_PROGRESS[i]}%`, '--d': i } as CSSProperties}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-[13px] h-px w-full bg-[#FFFFFF29]" aria-hidden />
              <div className="mt-[13px] flex items-center justify-between gap-3">
                <span className="text-[9px] text-[#8FAF9D]">{t('landing.hero.cardNote')}</span>
                <a href="#areas" className="text-[9.5px] font-bold text-[#F2D07A] hover:underline">
                  {t('landing.hero.cardLink', { defaultValue: 'Xem tất cả →' })}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUOTE BAND */}
      <section className="flex min-h-[92px] w-full items-center justify-center bg-[#0A5C36] px-4 sm:px-8 lg:px-16">
        <div className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:gap-4 sm:text-left">
          <Sparkles className="size-[13px] shrink-0 text-[#E9B949]" aria-hidden />
          <p className="font-display text-[15px] italic text-[#F4FBF6] sm:text-[17px]">{t('auth.verse')}</p>
          <span className="font-mono text-[10px] font-semibold tracking-[1.2px] text-[#E9B949]">Lc 2, 14</span>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="w-full border-b border-[#EFF3ED] bg-white px-4 py-9 sm:px-8 lg:px-16">
        <div className="mx-auto flex w-full max-w-[1312px] flex-wrap items-center justify-between gap-y-6">
          {STATS.map((s, i) => (
            <div
              key={s.key}
              className={`flex min-w-[140px] flex-1 flex-col gap-[5px] px-5 ${
                i < STATS.length - 1 ? 'lg:border-r lg:border-[#EFF3ED]' : ''
              }`}
            >
              <span className="font-mono text-[8.5px] font-semibold uppercase tracking-[1.1px] text-[#97AB9E]">
                {t(`landing.stats.${s.key}`)}
              </span>
              <span className="text-[34px] font-extrabold leading-[37px] tracking-[-1.4px] text-[#0A5C36]">
                <CountUp to={s.to} pad={s.pad} suffix={s.suffix ?? ''} />
              </span>
              <span className="w-full text-[10px] leading-[15px] text-[#96AAA0]">
                {t(`landing.stats.${s.key}Caption`, { defaultValue: '' })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section id="about" className="w-full scroll-mt-20 bg-[#F6F8F3] px-4 py-16 sm:px-8 lg:px-16 lg:py-20">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-10 lg:flex-row lg:gap-16">
          <div className="flex w-full shrink-0 flex-col items-start gap-[14px] lg:w-[470px]">
            <Eyebrow text={t('landing.about.tag')} />
            <h2 className="w-full text-[28px] font-extrabold leading-[1.2] tracking-[-1.2px] text-[#0B2E1F] sm:text-[36px] sm:leading-[43px]">
              {t('landing.about.title')}
            </h2>
            <p className="w-full text-[12.5px] leading-[23px] text-[#7C9287]">{t('landing.about.sub')}</p>
            <a href="#areas" className="flex items-center gap-[6px] pt-[6px] text-[11.5px] font-bold text-[#0A5C36]">
              {t('landing.nav.areas')}
              <ArrowRight className="size-3" aria-hidden />
            </a>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {WHY.map((key, i) => (
              <div
                key={key}
                className="flex w-full items-start gap-[18px] border-b border-[#E6ECE3] py-[18px] last:border-0"
              >
                <span className="font-mono text-[10px] font-bold tracking-[1px] text-[#C9A227]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <h3 className="w-full text-[14.5px] font-bold leading-[20px] text-[#0B2E1F]">
                    {t(`landing.about.${key}.title`)}
                  </h3>
                  <p className="w-full text-[11.5px] leading-[20px] text-[#7C9287]">
                    {t(`landing.about.${key}.desc`)}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-[14px] shrink-0 text-[#0A5C36]" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS */}
      <section
        id="areas"
        className="w-full scroll-mt-20 border-y border-[#EFF3ED] bg-white px-4 pb-16 pt-16 sm:px-8 lg:px-16 lg:pb-[84px] lg:pt-[78px]"
      >
        <div className="mx-auto flex w-full max-w-[1312px] flex-col gap-[30px]">
          <div className="flex w-full flex-col items-start justify-between gap-6 lg:flex-row lg:items-end lg:gap-14">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#0A5C36]">
                {t('landing.areas.tag')}
              </span>
              <h2 className="w-full max-w-[620px] text-[26px] font-extrabold leading-[1.2] tracking-[-1px] text-[#0B2E1F] sm:text-[32px] sm:leading-[39px]">
                {t('landing.areas.title')}
              </h2>
            </div>
            <p className="w-full shrink-0 text-[12px] leading-[21px] text-[#7C9287] lg:w-[340px]">
              {t('landing.areas.sub')}
            </p>
          </div>

          <div className="flex w-full flex-col gap-9 lg:flex-row">
            <div className="flex min-w-0 flex-1 flex-col">
              {ZONES.map((z, i) => (
                <div
                  key={z.slug}
                  className="flex w-full items-center gap-4 border-b border-[#EFF3ED] px-1 py-[15px] last:border-0"
                >
                  <span className="w-7 shrink-0 font-mono text-[10px] font-bold tracking-[1px] text-[#C9A227]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <h3 className="w-full text-[14px] font-bold text-[#0B2E1F]">{t(`landing.zone.${z.slug}.title`)}</h3>
                    <p className="w-full text-[11px] leading-[18px] text-[#8AA298]">
                      {t(`landing.zone.${z.slug}.desc`)}
                    </p>
                  </div>
                  <Link
                    to={`/register?area=${z.area}`}
                    className="shrink-0 text-[10.5px] font-bold text-[#0A5C36] hover:underline"
                  >
                    {t('landing.zone.cta')}
                  </Link>
                </div>
              ))}
            </div>

            <div className="relative min-h-[320px] w-full shrink-0 overflow-hidden rounded-[20px] bg-[#0A5C36] lg:h-[470px] lg:w-[520px]">
              <img
                src="/pic/landing-areas.webp"
                alt=""
                className="absolute inset-0 size-full object-cover"
                loading="lazy"
                draggable={false}
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg,#041C13E6 0%,#041C1300 55%)' }}
                aria-hidden
              />
              <div className="absolute bottom-[18px] left-[18px] right-[18px] flex items-center justify-between gap-3 rounded-[12px] bg-[#06281BAD] px-[14px] py-[11px] backdrop-blur-[6px]">
                <div className="flex flex-col gap-px">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[1.1px] text-[#F2D07A]">
                    {t('landing.areas.captionTag', { defaultValue: 'Mùa Giáng Sinh 2026' })}
                  </span>
                  <span className="text-[11px] font-semibold text-white">
                    {t('landing.areas.captionName', { defaultValue: 'Hang đá Giáng Sinh · 82% hoàn thành' })}
                  </span>
                </div>
                <Sparkles className="size-[14px] text-[#F2D07A]" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APP */}
      <section id="download" className="w-full scroll-mt-20 bg-[#F6F8F3] px-4 py-16 sm:px-8 lg:px-16">
        <div className="relative mx-auto flex w-full max-w-[1312px] flex-col gap-10 overflow-hidden rounded-[26px] bg-[#0A5C36] p-8 sm:p-11 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div
            className="pointer-events-none absolute right-[-120px] top-[-160px] size-[480px] rounded-full bg-[#E9B94933] blur-[60px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-[-140px] left-[-140px] size-[380px] rounded-full bg-[#0E7A4659] blur-[50px]"
            aria-hidden
          />

          <div className="relative z-[2] flex min-w-0 flex-1 flex-col gap-[13px]">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1.4px] text-[#F2D07A]">
              {t('landing.download.tag')}
            </span>
            <h2 className="w-full max-w-[540px] text-[24px] font-extrabold leading-[1.25] tracking-[-0.9px] text-white sm:text-[30px] sm:leading-[38px]">
              {t('landing.download.title')}
            </h2>
            <p className="w-full max-w-[480px] text-[12.5px] leading-[21px] text-[#A9D7BF]">
              {t('landing.download.sub')}
            </p>
            <ol className="flex w-full flex-col gap-[9px] pt-[6px]">
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <li key={step} className="flex w-full items-center gap-[10px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full border border-[#FFFFFF2E] bg-[#FFFFFF1F]">
                    <span className="font-mono text-[9px] font-bold text-[#F2D07A]">{i + 1}</span>
                  </span>
                  <span className="flex-1 text-[11px] leading-[17px] text-[#DFF3E7]">
                    {t(`landing.download.${step}`)}
                  </span>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-[10px]">
              <span className="flex h-[30px] items-center rounded-[9px] border border-[#FFFFFF2E] bg-[#FFFFFF14] px-3 text-[10px] font-semibold text-[#DFF3E7]">
                {t('landing.download.iosSoon')}
              </span>
              <span className="flex h-[30px] items-center rounded-[9px] border border-[#FFFFFF2E] bg-[#FFFFFF14] px-3 text-[10px] font-semibold text-[#DFF3E7]">
                {t('landing.download.androidSoon')}
              </span>
            </div>
          </div>

          <div className="relative z-[3] flex flex-col items-center gap-[10px] rounded-[18px] border border-[#FFFFFF2E] bg-[#FFFFFF12] p-4">
            <div className="grid size-[132px] place-items-center rounded-[12px] bg-white">
              <img
                src="/pic/qr-download-app.svg"
                alt={t('landing.download.qrAlt')}
                className="size-[78px]"
                draggable={false}
              />
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white">
              <QrCode className="size-3" aria-hidden />
              {t('landing.download.qrCaption')}
            </span>
            <span className="max-w-[150px] text-center text-[8px] leading-[12px] text-[#8FAF9D]">
              {t('landing.download.comingSoon')}
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full border-t border-[#EFF3ED] bg-white px-4 pb-[70px] pt-16 sm:px-8 lg:px-16 lg:pt-[78px]">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col items-center gap-7">
          <div className="flex w-full max-w-[760px] flex-col items-center gap-3 text-center">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[1.5px] text-[#0A5C36]">
              {t('landing.cta.tag', { defaultValue: 'Đồng hành cùng giáo xứ' })}
            </span>
            <h2 className="w-full text-[28px] font-extrabold leading-[1.2] tracking-[-1.1px] text-[#0B2E1F] sm:text-[34px] sm:leading-[41px]">
              {t('landing.cta.title')}
            </h2>
            <p className="w-full max-w-[520px] text-[12px] leading-[21px] text-[#7C9287]">{t('landing.cta.sub')}</p>
          </div>

          <div className="flex w-full flex-col items-stretch justify-center gap-4 md:flex-row">
            <Link
              to="/register"
              className="flex flex-1 flex-col gap-[11px] rounded-[20px] border border-[#CFE0C8] bg-[#F6FAF4] p-6 transition-colors hover:border-[#0A5C36] md:max-w-[440px]"
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid size-[34px] place-items-center rounded-[11px] bg-[#0A5C36]">
                  <HandHeart className="size-[15px] text-[#F2D07A]" aria-hidden />
                </span>
                <span className="rounded-full bg-[#0A5C36] px-[9px] py-1 font-mono text-[8px] font-bold uppercase tracking-[0.8px] text-white">
                  {t('landing.cta.hereBadge', { defaultValue: 'Bạn đang ở đây' })}
                </span>
              </div>
              <h3 className="w-full text-[15px] font-extrabold text-[#0B2E1F]">
                {t('landing.cta.joinTitle', { defaultValue: 'Chỉ cần để lại thông tin' })}
              </h3>
              <p className="w-full text-[11px] leading-[18px] text-[#7C9287]">
                {t('landing.cta.joinDesc', {
                  defaultValue: 'Không cần tài khoản — ban hành giáo sẽ liên hệ với bạn.',
                })}
              </p>
              <span className="flex items-center gap-[6px] pt-0.5 text-[11px] font-bold text-[#0A5C36]">
                {t('landing.cta.button')}
                <ArrowRight className="size-[11px]" aria-hidden />
              </span>
            </Link>

            <Link
              to="/register-account"
              className="flex flex-1 flex-col gap-[11px] rounded-[20px] border border-[#E6ECE3] bg-white p-6 shadow-[0px_2px_6px_#06281B0F] transition-colors hover:border-[#0A5C36] md:max-w-[440px]"
            >
              <div className="flex w-full items-center justify-between">
                <span className="grid size-[34px] place-items-center rounded-[11px] border border-[#DDE8D6] bg-[#EDF4EA]">
                  <UserPlus className="size-[15px] text-[#0A5C36]" aria-hidden />
                </span>
              </div>
              <h3 className="w-full text-[15px] font-extrabold text-[#0B2E1F]">
                {t('auth.titleRegister', { defaultValue: 'Tạo tài khoản' })}
              </h3>
              <p className="w-full text-[11px] leading-[18px] text-[#7C9287]">
                {t('landing.cta.accountDesc', {
                  defaultValue: 'Đăng nhập để quản lý khu vực, nhiệm vụ và vật tư.',
                })}
              </p>
              <span className="flex items-center gap-[6px] pt-0.5 text-[11px] font-bold text-[#0A5C36]">
                {t('landing.cta.register', { defaultValue: 'Đăng ký' })}
                <ArrowRight className="size-[11px]" aria-hidden />
              </span>
            </Link>
          </div>

          <p className="text-[11px] font-semibold text-[#6B8175]">
            {t('register.haveAccount')}{' '}
            <Link to="/login" className="font-bold text-[#0A5C36] hover:underline">
              {t('register.login')}
            </Link>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full bg-[#06281B] px-4 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto flex w-full max-w-[1312px] flex-col items-start justify-between gap-8 lg:flex-row lg:gap-10">
          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <span className="flex items-center gap-[11px]">
              <span className="grid size-8 place-items-center rounded-[10px] border border-[#E9B94959] bg-[#FFFFFF14]">
                <Church className="size-[15px] text-[#F2D07A]" aria-hidden />
              </span>
              <span className="text-[12px] font-extrabold tracking-[0.5px] text-white">GROTTO WORKS</span>
            </span>
            <p className="w-full max-w-[380px] text-[10.5px] leading-[18px] text-[#8FAF9D]">
              {t('landing.footer.tagline')}
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-10 sm:gap-14">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1.1px] text-[#5F8271]">
                {t('landing.footer.platform', { defaultValue: 'Nền tảng' })}
              </span>
              <a href="#about" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('landing.nav.about')}
              </a>
              <a href="#areas" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('landing.nav.areas')}
              </a>
              <a href="#download" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('landing.nav.download')}
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[8.5px] font-bold uppercase tracking-[1.1px] text-[#5F8271]">
                {t('landing.footer.join', { defaultValue: 'Tham gia' })}
              </span>
              <Link to="/register" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('landing.registerCta')}
              </Link>
              <Link to="/register-account" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('auth.titleRegister', { defaultValue: 'Tạo tài khoản' })}
              </Link>
              <Link to="/login" className="text-[10.5px] text-[#A9D7BF] hover:text-white">
                {t('landing.login')}
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <span className="text-[9.5px] text-[#6E8C7C]">{t('landing.footer.note')}</span>
            <span className="font-mono text-[9.5px] text-[#8FAF9D]">{t('landing.footer.rights')}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
