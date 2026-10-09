// Dashboard render stat từ mocked summary endpoints (msw/node + resetDb
// mỗi test, pattern như AreaListPage.test.tsx): committee 4 StatCard theo
// seed, leader donut + checklist + trễ hạn, officer shortage list.
// Leader/material-officer summary suy user từ Bearer token; không có token (test
// chạy chưa đăng nhập) → handlers fallback u3/u4 (leader/material-officer đầu tiên,
// cả hai phụ trách a1) nên data xác định theo seed.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import type { ReactNode } from 'react'
import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'
import {
  useCommitteeSummary,
  useLeaderSummary,
  useOfficerSummary,
  type CommitteeSummary,
  type LeaderSummary,
  type OfficerSummary,
} from './api'
import CommitteeDashboard from './CommitteeDashboard'
import LeaderDashboard from './LeaderDashboard'
import OfficerDashboard from './OfficerDashboard'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

// Wrapper đầy đủ cho page (Toast + Router vì Button navigate dùng useNavigate).
const pageWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={newClient()}>
    <ToastProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </ToastProvider>
  </QueryClientProvider>
)

const renderPage = (node: ReactNode) => render(node, { wrapper: pageWrapper })

test('committee summary khớp seed: 5 khu, 3 đơn PENDING, 3 đăng ký chờ, 3 hỗ trợ mở', async () => {
  const { result } = renderHook(() => useCommitteeSummary(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={newClient()}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  const s = result.current.data as CommitteeSummary
  expect(s.areas.length).toBe(5)
  expect(s.pendingPurchases).toBe(3) // pr5, pr6, pr7
  expect(s.pendingVolunteers).toBe(3) // vr1, vr4, vr6
  expect(s.openSupportRequests).toBe(3) // sr1, sr2, sr6
  expect(s.donationPercent).toBeGreaterThanOrEqual(0)
  expect(s.weekHours).toBeGreaterThanOrEqual(0)
})

test('CommitteeDashboard renders stat + 5 khu + bảng việc cần chú ý', async () => {
  renderPage(<CommitteeDashboard />)
  // StatCard count-up hiển thị số 3 (pendingPurchases) và 5 khu vực.
  for (const name of ['Hang đá Bê-lem', 'Cây thông lớn', 'Ánh sáng & đèn', 'Sân khấu', 'Sân nhà thờ']) {
    expect(await screen.findByText(name)).toBeTruthy()
  }
  expect(await screen.findByText('Việc cần chú ý')).toBeTruthy()
  expect(await screen.findByText('Giờ công theo ngày (14 ngày gần nhất)')).toBeTruthy()
  // Dải tiến độ mùa ACTIVE 2026 hiển thị % đã trôi.
  const strip = await screen.findByLabelText('Tiến độ mùa')
  expect(strip.getAttribute('data-percent')).toMatch(/^\d+$/)
})

test('LeaderDashboard renders khu a1: checklist 2/5, 2 việc trễ hạn', async () => {
  renderPage(<LeaderDashboard />)
  expect(await screen.findByText('Khu Hang đá Bê-lem')).toBeTruthy()
  // Checklist a1: cl1, cl5 done → 2/5.
  expect(await screen.findByText('2/5')).toBeTruthy()
  // Việc trễ (mốc demo 28/11, chưa DONE/REVIEW): t2 dueDate 10/11, t6 dueDate 08/11.
  expect(await screen.findByText('Xây tường gạch hình thức núi')).toBeTruthy()
  expect(await screen.findByText('Gắn bạt che mưa phía sau hang')).toBeTruthy()
})

test('OfficerDashboard renders thiếu hụt khu a1: Xi măng PCB40, Bạt che mưa', async () => {
  renderPage(<OfficerDashboard />)
  expect(await screen.findByText('Vật tư khu Hang đá Bê-lem')).toBeTruthy()
  // shortageList a1: m1 thiếu 10 bao, m2 thiếu 100 viên, m5 thiếu 60 m2 —
  // tên mặt hàng có thể xuất hiện ở cả shortageList lẫn incoming → getAllBy.
  for (const name of ['Xi măng PCB40', 'Gạch đỏ', 'Bạt che mưa']) {
    const hits = await screen.findAllByText(name)
    expect(hits.length).toBeGreaterThanOrEqual(1)
  }
})

test('leader/material-officer summary hooks: khu a1, taskCounts + shortageList khớp seed', async () => {
  const leader = renderHook(() => useLeaderSummary(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={newClient()}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(leader.result.current.isSuccess).toBe(true))
  const ls = leader.result.current.data as LeaderSummary
  expect(ls.area?.id).toBe('a1') // fallback u3 → a1
  expect(ls.taskCounts).toEqual({ DONE: 2, DOING: 2, TODO: 2, REVIEW: 1, REVISE: 1 })
  expect(ls.checklist).toEqual({ done: 2, total: 5 })

  const officer = renderHook(() => useOfficerSummary(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={newClient()}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(officer.result.current.isSuccess).toBe(true))
  const os = officer.result.current.data as OfficerSummary
  expect(os.shortageList.map((m) => m.name)).toEqual([
    'Xi măng PCB40',
    'Gạch đỏ',
    'Bạt che mưa',
  ])
  // PENDING nào có vật tư khu a1: pr5 (m13, m14 — khu a3) → không có.
  expect(os.pendingPurchases.length).toBe(0)
})
