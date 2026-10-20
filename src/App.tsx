import { Suspense, lazy, useEffect } from 'react'
import type { ComponentType } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AppShell } from '@/components/shared/AppShell'
import { NAV } from '@/components/shared/nav-config'
import { RequireRole } from '@/routes/RequireRole'
import { AuthProvider, useAuth } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/toast'
import { Card } from '@/components/ui/card'
import type { Role } from '@/types'

function rolePrefix(role: Role): string {
  return role === 'MATERIAL_OFFICER' ? 'material-officer' : role.toLowerCase()
}

const Login = lazy(() => import('@/pages/Login'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Profile = lazy(() => import('@/pages/Profile'))
const Landing = lazy(() => import('@/features/landing/LandingPage'))
const Register = lazy(() => import('@/features/landing/RegisterPage'))
const UserRegister = lazy(() => import('@/pages/Register'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const SeasonListPage = lazy(() => import('@/features/season/pages/SeasonListPage'))
const AreaListPage = lazy(() => import('@/features/areas/pages/AreaListPage'))
const TaskListPage = lazy(() => import('@/features/tasks/pages/TaskListPage'))
const TaskDetailPage = lazy(() => import('@/features/tasks/pages/TaskDetailPage'))
const VolunteerListPage = lazy(() => import('@/features/volunteers/pages/VolunteerListPage'))
const VolunteerDetailPage = lazy(() => import('@/features/volunteers/pages/VolunteerDetailPage'))
const RegsApprovalPage = lazy(() => import('@/features/volunteerRegs/pages/RegsApprovalPage'))
const SupportListPage = lazy(() => import('@/features/support/pages/SupportListPage'))
const MaterialListPage = lazy(() => import('@/features/materials/pages/MaterialListPage'))
const PurchaseListPage = lazy(() => import('@/features/purchases/pages/PurchaseListPage'))
const PurchaseConfirmPage = lazy(() => import('@/features/purchases/pages/PurchaseConfirmPage'))
const CommitteeApprovalPage = lazy(() => import('@/features/purchases/pages/CommitteeApprovalPage'))
const DonationListPage = lazy(() => import('@/features/donations/pages/DonationListPage'))
const BorrowedListPage = lazy(() => import('@/features/borrowed/pages/BorrowedListPage'))
const AllocationPage = lazy(() => import('@/features/allocations/pages/AllocationPage'))
const TimesheetPage = lazy(() => import('@/features/timesheets/pages/TimesheetPage'))
const ChecklistPage = lazy(() => import('@/features/checklist/pages/ChecklistPage'))
const ReportPage = lazy(() => import('@/features/reports/pages/ReportPage'))
const CommitteeDashboard = lazy(() => import('@/features/dashboards/CommitteeDashboard'))
const LeaderDashboard = lazy(() => import('@/features/dashboards/LeaderDashboard'))
const OfficerDashboard = lazy(() => import('@/features/dashboards/OfficerDashboard'))
const AccountsPage = lazy(() => import('@/features/parish/pages/AccountsPage'))
const CommunitiesPage = lazy(() => import('@/features/parish/pages/CommunitiesPage'))
const CategoriesPage = lazy(() => import('@/features/parish/pages/CategoriesPage'))
const PointRulesPage = lazy(() => import('@/features/parish/pages/PointRulesPage'))
const NotificationsPage = lazy(() => import('@/features/parish/pages/NotificationsPage'))
const ActivityPage = lazy(() => import('@/features/parish/pages/ActivityPage'))
const BackupPage = lazy(() => import('@/features/parish/pages/BackupPage'))
const DesignReviewPage = lazy(() => import('@/features/designs/pages/DesignReviewPage'))
const ParishMapPage = lazy(() => import('@/features/map/pages/ParishMapPage'))
const GrottoDesignerPage = lazy(() => import('@/features/designer/pages/GrottoDesignerPage'))

// Trang tháº­t theo route `to` cá»§a nav-config; má»¥c chÆ°a cÃ³ â†’ Placeholder.
// Task 5+ thÃªm dáº§n vÃ o map nÃ y (pattern lazy page).
const PAGES: Record<string, ComponentType> = {
  '/parish/seasons': SeasonListPage,
  '/parish/areas': AreaListPage,
  '/parish/map': ParishMapPage,
  '/community/seasons': SeasonListPage,
  '/community/areas': AreaListPage,
  '/community/map': ParishMapPage,
    '/leader/tasks': TaskListPage,
  '/leader/volunteers': VolunteerListPage,
  '/community/volunteers': VolunteerListPage,
  '/leader/regs': RegsApprovalPage,
  '/leader/support': SupportListPage,
  '/community/support': SupportListPage,
  '/material-officer/materials': MaterialListPage,
  '/material-officer/purchases': PurchaseListPage,
  '/material-officer/purchases-confirm': PurchaseConfirmPage,
  '/material-officer/donations': DonationListPage,
  '/material-officer/borrowed': BorrowedListPage,
  '/material-officer/allocations': AllocationPage,
  '/parish/purchases': CommitteeApprovalPage,
  '/leader/timesheets': TimesheetPage,
  '/leader/checklist': ChecklistPage,
  '/community/checklist': ChecklistPage,
  '/community/reports': ReportPage,
  '/parish/accounts': AccountsPage,
  '/parish/communities': CommunitiesPage,
  '/parish/categories': CategoriesPage,
  '/parish/point-rules': PointRulesPage,
  '/parish/notifications': NotificationsPage,
  '/parish/activity': ActivityPage,
  '/parish/backup': BackupPage,
}

// Route cÃ³ param â€” nav-config khÃ´ng mÃ´ táº£ Ä‘Æ°á»£c, khai bÃ¡o tÆ°á»ng minh theo role
// (page tá»± Ä‘á»c useParams/useLocation Ä‘á»ƒ biáº¿t ngá»¯ cáº£nh mount).
const DYNAMIC: Partial<Record<Role, { path: string; Page: ComponentType }[]>> = {
  LEADER: [
    { path: 'tasks/:id', Page: TaskDetailPage },
    { path: 'volunteers/:id', Page: VolunteerDetailPage },
    { path: 'areas/:id/design', Page: DesignReviewPage },
    { path: 'areas/:areaId/designer', Page: GrottoDesignerPage },
  ],
  COMMUNITY: [
    { path: 'areas/:id/tasks', Page: TaskListPage },
    { path: 'volunteers/:id', Page: VolunteerDetailPage },
    { path: 'areas/:areaId/designer', Page: GrottoDesignerPage },
  ],
  PARISH: [
    { path: 'areas/:id/tasks', Page: TaskListPage },
    { path: 'areas/:id/design', Page: DesignReviewPage },
    { path: 'areas/:areaId/designer', Page: GrottoDesignerPage },
  ],
}

const queryClient = new QueryClient()
const ROLES: Role[] = ['COMMUNITY', 'LEADER', 'MATERIAL_OFFICER', 'PARISH']

// Placeholder lazy cho má»i route con â€” Task 4+ thay báº±ng page tháº­t.
function Placeholder({ label }: { label: string }) {
  const { t } = useTranslation()
  return (
    <Card className="grid h-64 place-items-center border-dashed bg-card/60">
      <p className="lbl-mono px-6 text-center">
        {t('common.building')} â€” {t(label)}
      </p>
    </Card>
  )
}

// / â†’ landing cÃ´ng khai cho khÃ¡ch chÆ°a Ä‘Äƒng nháº­p, hoáº·c dashboard theo role.
function RootRedirect() {
  const { user, isPending } = useAuth()
  if (isPending) return null
  return user ? <Navigate to={`/${rolePrefix(user.role)}`} replace /> : <Landing />
}

// /login khi Ä‘Ã£ cÃ³ phiÃªn â†’ tháº³ng dashboard role, khÃ´ng hiá»‡n form láº§n ná»¯a.
function LoginGate() {
  const { user, isPending } = useAuth()
  if (isPending) return null
  if (user) return <Navigate to={`/${rolePrefix(user.role)}`} replace />
  return <Login />
}

// 401 giá»¯a phiÃªn (api.ts dispatch 'grotto:unauthorized') â†’ logout + vá» /login.
function SessionWatch() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    const onExpired = () => {
      void logout()
      navigate('/login', { replace: true })
    }
    window.addEventListener('grotto:unauthorized', onExpired)
    return () => window.removeEventListener('grotto:unauthorized', onExpired)
  }, [logout, navigate])
  return null
}

// Má»—i role prefix má»™t layout route: RequireRole + AppShell, route con sinh
// tá»« nav-config (index = má»¥c dashboard cá»§a role Ä‘Ã³).
function roleRoutes(role: Role) {
  const prefix = `/${rolePrefix(role)}`
  const items = NAV[role].flatMap((g) => g.items)
  return (
    <Route
      key={role}
      path={prefix}
      element={
        <RequireRole roles={[role]}>
          <AppShell role={role} />
        </RequireRole>
      }
    >
      {/* Index = dashboard tháº­t cá»§a role (Task 10). Suspense cá»¥c bá»™ Ä‘á»ƒ
          lazy chunk chá»‰ che outlet, AppShell (nav) giá»¯ nguyÃªn â€” khÃ¡c vá»›i
          Suspense ngoÃ i Routes che luÃ´n cáº£ shell. */}
      <Route
        index
        element={
          role === 'COMMUNITY' ? (
            <Suspense fallback={null}>
              <CommitteeDashboard />
            </Suspense>
          ) : role === 'LEADER' ? (
            <Suspense fallback={null}>
              <LeaderDashboard />
            </Suspense>
          ) : role === 'MATERIAL_OFFICER' ? (
            <Suspense fallback={null}>
              <OfficerDashboard />
            </Suspense>
          ) : (
            <Placeholder label={items[0].label} />
          )
        }
      />
      {items
        .filter((i) => i.to !== prefix)
        .map((i) => {
          const Page = PAGES[i.to]
          return (
            <Route
              key={i.to}
              path={i.to.slice(prefix.length + 1)}
              element={Page ? <Page /> : <Placeholder label={i.label} />}
            />
          )
        })}
      {(DYNAMIC[role] ?? []).map(({ path, Page }) => (
        <Route key={path} path={path} element={<Page />} />
      ))}
    </Route>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <SessionWatch />
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginGate />} />
                {/* Trang cÃ´ng khai: landing á»Ÿ "/", Ä‘Äƒng kÃ½ Ä‘á»“ng hÃ nh á»Ÿ "/register". */}
                <Route path="/register" element={<Register />} />
                <Route path="/register-account" element={<UserRegister />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/profile"
                  element={
                    <RequireRole roles={ROLES}>
                      <AppShell />
                    </RequireRole>
                  }
                >
                  <Route index element={<Profile />} />
                </Route>
                {ROLES.map(roleRoutes)}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
