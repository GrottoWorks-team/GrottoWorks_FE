import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Church,
  ClipboardList,
  Lightbulb,
  Mic,
  Mountain,
  QrCode,
  Sparkles,
  TrendingUp,
  Trees,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AreaType } from '@/types'
import { Reveal } from './components/Reveal'
import { CountUp } from './components/CountUp'

// delay so le cho các phần tử con của .stagger (giống PageHeader).
const d = (n: number) => ({ '--d': n }) as CSSProperties

/** Ảnh minh hoạ theo khu vực — luôn có nền gradient/gradient-fade phía sau nên
 *  nếu ảnh không tải được (offline) bố cục vẫn đẹp. */
const ZONES: { type: AreaType; Icon: LucideIcon; img: string }[] = [
  {
    type: 'GROTTO',
    Icon: Mountain,
    img: 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=1600&q=70',
  },
  {
    type: 'TREE',
    Icon: Trees,
    img: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1600&q=70',
  },
  {
    type: 'LIGHTING',
    Icon: Lightbulb,
    img: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1600&q=70',
  },
  {
    type: 'YARD',
    Icon: Church,
    img: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1600&q=70',
  },
  {
    type: 'STAGE',
    Icon: Mic,
    img: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1600&q=70',
  },
]

const HERO_AREAS = ['card1', 'card2', 'card3', 'card4'] as const
const HERO_PROGRESS = [82, 64, 47, 71]

const STATS: { key: string; to: number; suffix?: string }[] = [
  { key: 'areas', to: 5 },
  { key: 'roles', to: 4 },
  { key: 'skills', to: 7 },
  { key: 'transparency', to: 100, suffix: '%' },
]

const ABOUT: { key: string; Icon: LucideIcon }[] = [
  { key: 'card1', Icon: ClipboardList },
  { key: 'card2', Icon: Wallet },
  { key: 'card3', Icon: Users },
]

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div className="landing-root min-h-screen overflow-x-hidden bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center" aria-label={t('app.name')}>
            <img
              src="/pic/Logo_GrottoWorks.png"
              alt={t('app.name')}
              className="h-9 w-auto select-none"
              draggable={false}
            />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#about" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
              {t('landing.nav.about')}
            </a>
            <a href="#areas" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
              {t('landing.nav.areas')}
            </a>
            <a href="#download" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
              {t('landing.nav.download')}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ButtonLink to="/login" variant="ghost" size="sm">
              {t('landing.login')}
            </ButtonLink>
            <ButtonLink to="/register" size="sm" className="hidden sm:inline-flex">
              {t('landing.registerCta')}
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-brand-pine">
          <img
            src="/pic/Login_background@2x.webp"
            alt=""
            className="h-full w-full object-cover object-center opacity-60"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-pine/95 via-brand-pine/85 to-brand-pine/70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(238,185,2,0.30),transparent_55%)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div className="stagger">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-goldLight"
              style={d(0)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('landing.hero.badge')}
            </span>
            <h1
              className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl"
              style={d(1)}
            >
              {t('landing.hero.title')} <span className="text-brand-gold">{t('landing.hero.titleAccent')}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={d(2)}>
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3" style={d(3)}>
              <ButtonLink
                to="/register"
                size="lg"
                className="bg-brand-gold text-primary hover:bg-brand-gold/90"
              >
                {t('landing.hero.ctaPrimary')}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#areas" size="lg" variant="secondary">
                {t('landing.hero.ctaSecondary')}
              </ButtonLink>
            </div>
          </div>

          <Reveal delay={140} className="lg:pl-6">
            <Card className="border-white/25 bg-card/95 p-6 shadow-hover backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="lbl-mono">{t('landing.hero.cardTag')}</p>
                  <h2 className="mt-1 text-lg font-bold text-foreground">{t('landing.hero.cardTitle')}</h2>
                </div>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-pineLight text-brand-pine">
                  <TrendingUp className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t('landing.hero.cardSub')}</p>

              <ul className="mt-5 space-y-4">
                {HERO_AREAS.map((key, i) => (
                  <li key={key}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-foreground">{t(`landing.hero.${key}`)}</span>
                      <span className="tabular font-mono text-xs text-muted-foreground">
                        <CountUp to={HERO_PROGRESS[i]} suffix="%" />
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-pineLight">
                      <div
                        className="g-bar h-full rounded-full bg-brand-pine"
                        style={{ width: `${HERO_PROGRESS[i]}%`, '--d': i } as CSSProperties}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-border pt-3 text-[11px] text-muted-foreground">
                {t('landing.hero.cardNote')}
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.key} delay={i * 90} className="text-center">
              <div className="text-4xl font-extrabold tracking-tight text-brand-pine">
                <CountUp to={s.to} suffix={s.suffix ?? ''} />
              </div>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                {t(`landing.stats.${s.key}`)}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-20 bg-background py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="lbl-mono text-brand-pine">{t('landing.about.tag')}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landing.about.title')}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t('landing.about.sub')}</p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ABOUT.map(({ key, Icon }, i) => (
              <Reveal key={key} delay={i * 110}>
                <Card className="h-full p-6 transition-shadow hover:shadow-hover">
                  <span className="grid h-11 w-11 place-items-center rounded-card bg-brand-pineLight text-brand-pine">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    {t(`landing.about.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`landing.about.${key}.desc`)}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WORK AREAS — Z-PATTERN */}
      <section id="areas" className="scroll-mt-20 border-t border-border bg-card py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="lbl-mono text-brand-pine">{t('landing.areas.tag')}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landing.areas.title')}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{t('landing.areas.sub')}</p>
          </Reveal>
        </div>

        <div className="mt-14">
          {ZONES.map(({ type, Icon, img }, i) => {
            const flip = i % 2 === 1
            const slug = type.toLowerCase()
            return (
              <div
                key={type}
                className={cn(
                  'relative flex min-h-[360px] items-center overflow-hidden',
                  i > 0 && 'border-t border-border/60',
                )}
              >
                <div aria-hidden="true" className="absolute inset-0">
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                  <div
                    className={cn(
                      'absolute inset-0',
                      flip
                        ? 'bg-gradient-to-l from-card from-35% via-card/85 to-card/10'
                        : 'bg-gradient-to-r from-card from-35% via-card/85 to-card/10',
                    )}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/70 via-transparent to-card/30" />
                </div>

                <div className="relative mx-auto flex w-full max-w-6xl px-4 sm:px-6">
                  <Reveal delay={80} className={cn('w-full max-w-lg', flip && 'sm:ml-auto sm:text-right')}>
                    <div className={cn('flex items-center gap-3', flip && 'sm:flex-row-reverse')}>
                      <span className="grid h-11 w-11 place-items-center rounded-card bg-brand-pine text-primary-foreground shadow-card">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="lbl-mono text-brand-pine">
                        {String(i + 1).padStart(2, '0')} · {t(`features.areas.areaType.${type}`)}
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                      {t(`landing.zone.${slug}.title`)}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                      {t(`landing.zone.${slug}.desc`)}
                    </p>
                    <div className={cn('mt-6 flex', flip && 'sm:justify-end')}>
                      <ButtonLink
                        to={`/register?area=${type}`}
                        variant={flip ? 'secondary' : 'default'}
                      >
                        {t('landing.zone.cta')}
                        <ArrowRight className="h-4 w-4" />
                      </ButtonLink>
                    </div>
                  </Reveal>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* DOWNLOAD APP — QR */}
      <section id="download" className="scroll-mt-20 bg-brand-pine py-20 text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="lbl-mono text-brand-goldLight">{t('landing.download.tag')}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {t('landing.download.title')}
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-white/85">{t('landing.download.sub')}</p>
            <ol className="mt-8 space-y-4">
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gold text-sm font-bold text-brand-pine">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-white/90">{t(`landing.download.${step}`)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white/80">
                {t('landing.download.iosSoon')}
              </span>
              <span className="rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white/80">
                {t('landing.download.androidSoon')}
              </span>
            </div>
          </Reveal>

          <Reveal delay={140} className="lg:justify-self-end">
            <div className="mx-auto w-full max-w-xs rounded-card bg-card p-5 text-center shadow-hover">
              <div className="rounded-md bg-white p-3">
                <img
                  src="/pic/qr-download-app.svg"
                  alt={t('landing.download.qrAlt')}
                  className="mx-auto aspect-square w-full max-w-[13rem]"
                  draggable={false}
                />
              </div>
              <p className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-foreground">
                <QrCode className="h-4 w-4 text-brand-pine" />
                {t('landing.download.qrCaption')}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t('landing.download.comingSoon')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-background py-20">
        <Reveal className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {t('landing.cta.title')}
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t('landing.cta.sub')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink to="/register" size="lg">
              {t('landing.cta.button')}
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink to="/login" size="lg" variant="secondary">
              {t('landing.cta.login')}
            </ButtonLink>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border bg-card py-8 text-center text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">
          {t('app.name')} · {t('landing.footer.tagline')}
        </p>
        <p className="mt-1 text-xs">{t('landing.footer.note')}</p>
        <p className="mt-1 text-xs">{t('landing.footer.rights')}</p>
      </footer>
    </div>
  )
}
