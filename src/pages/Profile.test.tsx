import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import Profile from './Profile'

let currentUser = {
  id: 'u27',
  name: 'Antôn Trương Minh Nhật',
  email: 'u27@test.com',
  role: 'VOLUNTEER' as const,
  skills: ['Hàn'],
  points: 100,
  avatarHue: 20,
}

let updatedPayload: any = null

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: currentUser, isPending: false, refresh: vi.fn().mockResolvedValue({}) }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/timesheets/api', () => ({
  useTimesheets: () => ({
    data: [{ volunteerId: 'u27', hours: 28 }],
    isPending: false,
  }),
}))

vi.mock('@/features/tasks/api', () => ({
  useSkills: () => ({
    data: ['Hàn', 'Sơn', 'Mộc'],
    isPending: false,
  }),
}))

vi.mock('@/features/profile/api', () => ({
  useUpdateProfile: () => ({
    mutateAsync: vi.fn(async (payload) => {
      updatedPayload = payload
      currentUser = { ...currentUser, ...payload }
      return currentUser
    }),
    isPending: false,
  }),
  useUpdateMyProfile: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

beforeEach(() => {
  currentUser = {
    id: 'u27',
    name: 'Antôn Trương Minh Nhật',
    email: 'u27@test.com',
    role: 'VOLUNTEER' as const,
    skills: ['Hàn'],
    points: 100,
    avatarHue: 20,
  }
  updatedPayload = null
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <Profile />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('hiện điểm vinh danh, giờ công và prefilled tên theo seed (u27)', async () => {
  mount()

  expect(await screen.findByText('100')).toBeDefined()
  expect(await screen.findByText('28')).toBeDefined()
  const name = await screen.findByLabelText('Họ tên')
  expect((name as HTMLInputElement).value).toBe('Antôn Trương Minh Nhật')
})

test('submit → PATCH /api/users/u27 với tên + kỹ năng mới', async () => {
  mount()
  const user = userEvent.setup()

  const name = await screen.findByLabelText('Họ tên')
  await user.clear(name)
  await user.type(name, 'Antôn Tên Mới')
  fireEvent.click(screen.getByRole('button', { name: 'Sơn' }))

  await user.click(screen.getByRole('button', { name: 'Lưu' }))

  expect(await screen.findByText('Đã cập nhật hồ sơ')).toBeDefined()
  expect(updatedPayload.name).toBe('Antôn Tên Mới')
  expect(updatedPayload.skills).toEqual(['Hàn', 'Sơn'])
})
