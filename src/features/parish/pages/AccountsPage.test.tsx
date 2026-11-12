import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import AccountsPage from './AccountsPage'

const mockUsers = [
  { id: 'u1', name: 'LM. Phaolô Nguyễn Văn Hạnh', email: 'u1@test.com', role: 'PARISH', rawRole: 'PARISH', status: 'ACTIVE', locked: false, skills: [], points: 0, avatarHue: 0, version: 1 },
  { id: 'u2', name: 'Giuse Trần Văn Bình', email: 'u2@test.com', role: 'COMMUNITY', rawRole: 'LEADER', status: 'LOCKED', locked: true, skills: [], points: 0, avatarHue: 0, version: 2 },
  { id: 'u3', name: 'Maria Nguyễn Thị Mai', email: 'u3@test.com', role: 'COMMUNITY', rawRole: 'VOLUNTEER', status: 'INACTIVE', locked: false, skills: [], points: 0, avatarHue: 0, version: 1 },
]

const mockLockUser = vi.fn().mockResolvedValue({})
const mockUnlockUser = vi.fn().mockResolvedValue({})
const mockAssignRole = vi.fn().mockResolvedValue({})
const mockUpdateUser = vi.fn().mockResolvedValue({})

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: mockUsers, isPending: false }),
}))

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({
    data: [{ id: 'c1', name: 'Giáo khu Thánh Tâm' }],
    isPending: false,
  }),
}))

vi.mock('../api', () => ({
  useUpdateUser: () => ({ mutateAsync: mockUpdateUser, isPending: false }),
  useLockUser: () => ({ mutateAsync: mockLockUser, isPending: false }),
  useUnlockUser: () => ({ mutateAsync: mockUnlockUser, isPending: false }),
  useCreateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdminSkills: () => ({ data: ['Điện', 'Mộc'], isPending: false }),
  useAssignUserRole: () => ({ mutateAsync: mockAssignRole, isPending: false }),
  useRoles: () => ({
    data: [
      { id: 'r1', code: 'ADMIN', name: 'Admin' },
      { id: 'r2', code: 'PARISH', name: 'Parish' },
      { id: 'r3', code: 'LEADER', name: 'Leader' },
      { id: 'r4', code: 'MO', name: 'MO' },
      { id: 'r5', code: 'VOLUNTEER', name: 'Volunteer' },
    ],
    isPending: false,
  }),
  useParishes: () => ({ data: [{ id: 'p1', name: 'Giáo xứ Demo' }], isPending: false }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AccountsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('hiện user seed và dialog tạo tài khoản validate email', async () => {
  mount()
  expect(await screen.findByText('LM. Phaolô Nguyễn Văn Hạnh')).toBeDefined()
  expect(await screen.findByText('Giuse Trần Văn Bình')).toBeDefined()
  expect(await screen.findByText('Maria Nguyễn Thị Mai')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
  fireEvent.submit(document.getElementById('account-form')!)
  expect(await screen.findByText('Vui lòng nhập tên')).toBeDefined()
  expect(await screen.findByText('Vui lòng nhập email')).toBeDefined()
})

test('bấm switch khoá/mở tài khoản → gọi mockLockUser và mockUnlockUser kèm version, disabled với INACTIVE', async () => {
  mount()
  const switches = screen.getAllByRole('switch')
  expect(switches.length).toBe(3)

  // Switch 0: user 1 đang mở (locked = false) → bấm khoá
  fireEvent.click(switches[0])
  expect(mockLockUser).toHaveBeenCalledWith({
    id: 'u1',
    version: 1,
    reason: expect.any(String),
  })

  // Switch 1: user 2 đang khoá (locked = true) → bấm mở
  fireEvent.click(switches[1])
  expect(mockUnlockUser).toHaveBeenCalledWith({
    id: 'u2',
    version: 2,
    reason: expect.any(String),
  })

  // Switch 2: user 3 đang INACTIVE → nút bị disabled, click không gọi API
  expect(switches[2]).toHaveProperty('disabled', true)
  fireEvent.click(switches[2])
  expect(mockLockUser).toHaveBeenCalledTimes(1)
  expect(mockUnlockUser).toHaveBeenCalledTimes(1)
})

test('bấm nút Đổi vai trò → mở dialog và gọi assignRole kèm version và role code BE', async () => {
  mount()
  const roleButtons = screen.getAllByRole('button', { name: /Đổi vai trò/i })
  expect(roleButtons.length).toBe(3)

  fireEvent.click(roleButtons[0])
  expect(screen.getByText('Đổi vai trò tài khoản')).toBeDefined()

  const select = screen.getByLabelText(/Chọn vai trò mới/i)
  fireEvent.change(select, { target: { value: 'MO' } })

  const confirmBtn = screen.getByRole('button', { name: /Xác nhận/i })
  fireEvent.click(confirmBtn)

  expect(mockAssignRole).toHaveBeenCalledWith({
    id: 'u1',
    version: 1,
    role: 'MO',
    parishId: null,
  })
})

test('bấm nút Sửa → mở dialog và submit cập nhật hồ sơ với phone kèm version', async () => {
  mount()
  const editButtons = screen.getAllByRole('button', { name: /Sửa/i })
  expect(editButtons.length).toBe(3)

  fireEvent.click(editButtons[0])
  expect(screen.getByText('Sửa tài khoản')).toBeDefined()

  const phoneInput = screen.getByLabelText(/Số điện thoại/i)
  fireEvent.change(phoneInput, { target: { value: '0901234567' } })

  fireEvent.submit(document.getElementById('account-form')!)

  await waitFor(() => {
    expect(mockUpdateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'u1',
        version: 1,
        displayName: 'LM. Phaolô Nguyễn Văn Hạnh',
        email: 'u1@test.com',
        phone: '0901234567',
      }),
    )
  })
})
