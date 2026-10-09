import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import AreaListPage from './AreaListPage'
import { AreaFormDialog } from './AreaFormDialog'
import { AreaAssignDialog } from './AreaAssignDialog'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'
import type { WorkArea } from '@/types'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.removeItem('grotto-token')
})
afterAll(() => server.close())

test('hiện 5 thẻ khu vực (grid mặc định) từ seed khi chưa đăng nhập', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter>
            <AreaListPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  for (const name of [
    'Hang đá Bê-lem',
    'Cây thông lớn',
    'Ánh sáng & đèn',
    'Sân khấu',
    'Sân nhà thờ',
  ]) {
    expect(await screen.findByText(name)).toBeDefined()
  }
  // Thẻ hiển thị badge mùa 2026 và deadline
  expect((await screen.findAllByText(/Mùa 2026/i)).length).toBeGreaterThan(0)
})

test('COMMUNITY chỉ thấy khu vực thuộc giáo khu của mình', async () => {
  // u2 có role COMMUNITY và communityId = 'c1'. Trong seed, chỉ có a4 ('Sân khấu') thuộc 'c1'.
  localStorage.setItem('grotto-token', 'demo-u2')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter>
            <AreaListPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Sân khấu')).toBeDefined()
  expect(screen.queryByText('Hang đá Bê-lem')).toBeNull()
  expect(screen.queryByText('Cây thông lớn')).toBeNull()
  expect(screen.queryByText('Ánh sáng & đèn')).toBeNull()
  expect(screen.queryByText('Sân nhà thờ')).toBeNull()
})

test('Lọc khu vực theo mùa: chọn mùa 2025 thì không có khu nào, chọn mùa 2026 thì có 5 khu', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter>
            <AreaListPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  const seasonSelect = (await screen.findByLabelText(/Lọc theo mùa/i)) as HTMLSelectElement
  expect(seasonSelect).toBeDefined()

  // Chờ options của mùa load xong từ API
  await screen.findByRole('option', { name: /2025/i })

  // Chọn mùa s0 (2025)
  await userEvent.selectOptions(seasonSelect, 's0')
  expect(await screen.findByText(/Chưa có khu vực nào/i)).toBeDefined()

  // Chọn mùa s1 (2026)
  await userEvent.selectOptions(seasonSelect, 's1')
  expect(await screen.findByText('Hang đá Bê-lem')).toBeDefined()
})

test('AreaFormDialog: COMMUNITY khóa select communityId', async () => {
  localStorage.setItem('grotto-token', 'demo-u2')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <AreaFormDialog onClose={() => {}} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  const selectComm = (await screen.findByLabelText(/Giáo khu/i)) as HTMLSelectElement
  expect(selectComm.disabled).toBe(true)
  expect(selectComm.value).toBe('c1')
})

test('AreaFormDialog: PARISH được chọn giáo khu khác', async () => {
  localStorage.setItem('grotto-token', 'demo-u1')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <AreaFormDialog onClose={() => {}} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
  const levelSelect = (await screen.findByLabelText(/^Cấp/i)) as HTMLSelectElement
  await userEvent.selectOptions(levelSelect, 'COMMUNITY')
  const parishCommSelect = (await screen.findByLabelText(/Giáo khu/i)) as HTMLSelectElement
  expect(parishCommSelect.disabled).toBe(false)
})

test('AreaFormDialog: validate deadline trước ngày bắt đầu mùa', async () => {
  localStorage.setItem('grotto-token', 'demo-u1')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <AreaFormDialog onClose={() => {}} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )

  const nameInput = await screen.findByLabelText(/Tên khu vực/i)
  await userEvent.type(nameInput, 'Khu thử nghiệm')

  const leaderSelect = await screen.findByLabelText(/^Trưởng khu/i)
  await userEvent.selectOptions(leaderSelect, 'u3')

  const officerSelect = await screen.findByLabelText(/^Trưởng ban hành giáo/i)
  await userEvent.selectOptions(officerSelect, 'u4')

  // s1 startDate là 2026-09-15. Nhập deadline 2026-09-01 (sớm hơn)
  const deadlineInput = await screen.findByLabelText(/Hạn hoàn thành/i)
  await userEvent.type(deadlineInput, '2026-09-01')

  const saveBtn = screen.getByRole('button', { name: /Lưu/i })
  await userEvent.click(saveBtn)

  expect(await screen.findByText(/Hạn hoàn thành phải từ ngày bắt đầu mùa trở đi/i)).toBeDefined()
})

test('AreaAssignDialog: hiển thị thông tin thời hạn và phân công thành công', async () => {
  const dummyArea: WorkArea = {
    id: 'a1',
    seasonId: 's1',
    name: 'Hang đá Bê-lem',
    type: 'GROTTO',
    level: 'PARISH',
    leaderId: 'u3',
    officerId: 'u4',
    progress: 35,
    volunteerCount: 12,
    taskCount: 8,
    status: 'AT_RISK',
    deadline: '2026-12-20',
    description: 'Khu vực hang đá chính',
  }

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let closed = false
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <AreaAssignDialog area={dummyArea} onClose={() => { closed = true }} />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )

  expect(await screen.findByText(/Phân công khu vực Hang đá Bê-lem/i)).toBeDefined()
  expect(screen.getByText('20/12/2026')).toBeDefined()

  const officerSelect = (await screen.findByLabelText(/Trưởng ban hành giáo/i)) as HTMLSelectElement
  await screen.findByRole('option', { name: /Phêrô Quang/i })
  await userEvent.selectOptions(officerSelect, 'u8')

  const saveBtn = screen.getByRole('button', { name: /Lưu/i })
  await userEvent.click(saveBtn)

  await waitFor(() => expect(closed).toBe(true))
})
