import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  LogOut, LayoutDashboard, Calendar, MapPin, Users, ShoppingCart, LifeBuoy,
  ListChecks, FileText, ClipboardList, ClipboardCheck, UserPlus, Inbox, Clock,
  Package, Gift, Backpack, Boxes, UserCog, Church, Tags, Star, History, Database,
  MapPinned, Info, Bell, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/api'
import { roleHomePath } from '@/lib/roles'
import { SeasonProvider, SeasonSelect } from '@/features/season/season-context'
import { useUnreadNotificationCount } from '@/features/notifications/api'
import { NAV } from './nav-config'
import { NotificationsDropdown } from './NotificationsDropdown'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Role } from '@/types'

// Icon lucide theo key `icon` trong nav-config.
const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, calendar: Calendar, areas: MapPin, users: Users,
  cart: ShoppingCart, lifebuoy: LifeBuoy, checklist: ListChecks, reports: FileText,
  tasks: ClipboardList, inbox: Inbox, clock: Clock, materials: Package,
  gift: Gift, borrowed: Backpack, boxes: Boxes, accounts: UserCog,
  church: Church, tags: Tags, star: Star, history: History, backup: Database,
  assign: UserPlus, confirm: ClipboardCheck, map: MapPinned, bell: Bell,
}

/** Khoá localStorage cho trạng thái thu gọn sidebar (yêu cầu UI 05/11/2026). */
const SIDEBAR_KEY = 'grotto-sidebar-collapsed'

export function AppShell({ role }: { role?: Role }) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const r: Role = role ?? user?.role ?? 'COMMUNITY'
  const groups = NAV[r]
  // Dashboard là mục duy nhất dùng khớp CHÍNH XÁC; các mục còn lại so prefix.
  const homePath = roleHomePath(r)

  // Khung chọn mùa chỉ đặt ở 3 role vận hành theo mùa; PARISH quản lý mùa ở
  // trang "Mùa Giáng sinh" nên không cần.
  const showSeasonPicker = r === 'COMMUNITY' || r === 'LEADER' || r === 'MATERIAL_OFFICER'

  // Badge điều hướng:
  // - purchases: endpoint THẬT (chỉ PARISH/LEADER/MO đọc được → ADMIN không bật,
  //   tránh 403 mọi trang).
  // - support: chưa nối badge (có thể đếm bằng `GET /support-requests?status=OPEN&size=1`
  //   lấy page.totalItems) → hiện giữ 0.
  const canReadPurchases =
    r === 'COMMUNITY' || r === 'LEADER' || r === 'MATERIAL_OFFICER'
  const { data: pendingPurchases = [] } = useQuery({
    queryKey: ['purchaseRequests', 'pendingApproval'],
    enabled: canReadPurchases,
    queryFn: () =>
      api<{ id: string }[]>('/api/v1/purchase-requests?status=PENDING_APPROVAL&size=50'),
  })

  // Badge "Thông báo" = số thông báo chưa đọc theo server (NotificationAudit);
  // bấm "Đọc tất cả" ở chuông là badge về 0 sau khi query invalidate.
  const { data: unreadCount = 0 } = useUnreadNotificationCount()

  const badgeCount = (kind?: 'support' | 'purchases' | 'notifications') =>
    kind === 'purchases'
      ? pendingPurchases.length
      : kind === 'notifications'
        ? unreadCount
        : 0

  // Crumb: mục nav khớp pathname dài nhất (prefix-match), không có → tên app.
  const crumb = useMemo(() => {
    const hit = groups
      .flatMap((g) => g.items)
      .filter((i) => pathname === i.to || pathname.startsWith(i.to + '/'))
      .sort((a, b) => b.to.length - a.to.length)[0]
    return hit ? t(hit.label) : t('app.name')
  }, [groups, pathname, t])

  const flat = groups.flatMap((g) => g.items)
  const delayOf = (to: string) => Math.min(flat.findIndex((i) => i.to === to), 14)

  // Sidebar thu gọn: nhớ lựa chọn giữa các lần mở (yêu cầu UI 05/11/2026).
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // Chế độ riêng tư / quota đầy — chỉ mất phần nhớ trạng thái.
      }
      return next
    })
  }

  return (
    <SeasonProvider scoped={showSeasonPicker}>
      <div className="flex min-h-screen">
      <aside
        className={cn(
          'sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden bg-brand-deeper transition-[width] duration-200',
          collapsed ? 'w-[76px]' : 'w-[248px]',
        )}
      >
        <div
          className={cn(
            'relative flex items-center gap-[11px] pb-[18px] pt-[22px]',
            collapsed ? 'justify-center px-0' : 'px-[18px]',
          )}
        >
          <div className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-brand-gold/35 bg-gradient-to-br from-[#12805A] to-[#0A5C36] text-brand-gold">
            <Church className="size-[18px]" aria-hidden />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-extrabold uppercase leading-tight tracking-[0.6px] text-white">
                {t('app.name')}
              </p>
              <p className="truncate text-[8px] font-semibold uppercase tracking-[1.6px] text-brand-mint/70">
                {t('app.parish')}
              </p>
            </div>
          )}
        </div>
        <div className="h-px w-full shrink-0 bg-white/[0.08]" aria-hidden />
        <nav className={cn('flex flex-1 flex-col gap-[2px] overflow-y-auto py-[14px]', collapsed ? 'px-2' : 'px-3')}>
          {groups.map((g) => (
            <div key={g.section || 'main'} className="flex flex-col gap-[2px]">
              {g.section && !collapsed && (
                <p className="mb-0 px-[11px] font-mono text-[10px] font-semibold uppercase leading-[21px] tracking-[1.6px] text-[#5F8271]">
                  {t(g.section)}
                </p>
              )}
              <div className="space-y-[2px]">
                {g.items.map((item) => {
                  const n = item.badge ? badgeCount(item.badge) : 0
                  const Icon = item.icon ? ICONS[item.icon] : undefined
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === homePath}
                      title={t(item.label)}
                      style={{ '--d': delayOf(item.to) } as CSSProperties}
                      className={({ isActive }) =>
                        cn(
                          'g-item relative flex h-[37px] items-center gap-2.5 rounded-[10px] text-[12.5px] font-bold transition-colors',
                          collapsed ? 'justify-center px-0' : 'px-[11px]',
                          isActive
                            ? 'bg-white/[0.08] text-white'
                            : 'text-brand-mint hover:bg-white/[0.04] hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 h-[17px] w-[3px] -translate-y-1/2 rounded-[2px] bg-[#E9B949]"
                            />
                          )}
                          {Icon && <Icon className="size-[15px] shrink-0" aria-hidden />}
                          {!collapsed && <span className="flex-1 truncate">{t(item.label)}</span>}
                          {n > 0 &&
                            (collapsed ? (
                              <span
                                aria-hidden
                                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-gold"
                              />
                            ) : (
                              <span className="rounded-full bg-[#E9B949] px-1.5 py-0.5 text-[10px] font-bold text-brand-deeper">
                                {n}
                              </span>
                            ))}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Ghi chú cuối sidebar: mục đích của role đang đăng nhập (ẩn khi thu gọn). */}
        {!collapsed && (
          <div className="shrink-0 p-3">
            <div className="rounded-[10px] border border-white/10 bg-white/[0.06] px-[12px] py-[12px]">
              <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[1.2px] text-[#E9B949]">
                <Info className="size-3 shrink-0" aria-hidden />
                <span className="truncate">{t(`role.${r}`)}</span>
              </p>
              <p className="mt-[7px] text-[10.5px] leading-[16px] text-[#9DBBA9]">
                {t(`shell.roleNote.${r}`)}
              </p>
            </div>
          </div>
        )}

        {/* Thu gọn / mở rộng sidebar — nhớ lựa chọn ở localStorage. */}
        <div className="shrink-0 border-t border-white/[0.08] p-2">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            title={collapsed ? t('shell.expandSidebar') : t('shell.collapseSidebar')}
            className={cn(
              'flex w-full items-center gap-2 rounded-md py-2 text-[11px] font-semibold text-brand-mint transition-colors hover:bg-white/[0.06] hover:text-white',
              collapsed ? 'justify-center px-0' : 'px-3',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{t('shell.collapseSidebar')}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-[62px] shrink-0 items-center justify-between border-b border-border bg-white px-[22px]">
          <div className="flex items-center gap-[7px] font-mono text-[10.5px] uppercase tracking-[1.3px]">
            <span className="font-bold text-[#0A5C36]">{t('app.name')}</span>
            <span aria-hidden className="text-[#B9C8BC]">/</span>
            <span className="font-medium text-[#8AA298]">{crumb}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {showSeasonPicker && <SeasonSelect />}
            <NotificationsDropdown />
            <Link
              to="/profile"
              className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2.5 transition-colors hover:bg-background"
            >
              <Avatar name={user?.name ?? ''} hue={user?.avatarHue} />
              <span className="hidden text-left md:block">
                <span className="block max-w-40 truncate text-sm font-semibold leading-tight text-foreground">
                  {user?.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {user ? t(`role.${user.role}`) : ''}
                </span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.logout')}
              title={t('common.logout')}
              onClick={() => {
                void logout()
                navigate('/login', { replace: true })
              }}
            >
              <LogOut className="size-4 text-muted-foreground" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      </div>
    </SeasonProvider>
  )
}
