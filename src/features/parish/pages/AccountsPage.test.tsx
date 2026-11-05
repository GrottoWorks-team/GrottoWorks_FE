import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import AccountsPage from './AccountsPage'

const mockUsers = [
  { id: 'u1', name: 'LM. Phaolô Nguyễn Văn Hạnh', email: 'u1@test.com', role: 'PARISH', skills: [], points: 0, avatarHue: 0 },
  { id: 'u2', name: 'Giuse Trần Văn Bình', email: 'u2@test.com', role: 'COMMUNITY', skills: [], points: 0, avatarHue: 0 },
]

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
  useUpdateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLockUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnlockUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateUser: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAdminSkills: () => ({ data: ['Điện', 'Mộc'], isPending: false }),
  useAssignUserRole: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRoles: () => ({ data: [{ id: 'r1', code: 'LEADER', name: 'Leader' }], isPending: false }),
  useParishes: () => ({ data: [{ id: 'p1', name: 'Giáo xứ Demo' }], isPending: false }),
}))

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

  fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))
  fireEvent.submit(document.getElementById('account-form')!)
  expect(await screen.findByText('Vui lòng nhập tên')).toBeDefined()
  expect(await screen.findByText('Vui lòng nhập email')).toBeDefined()
})
