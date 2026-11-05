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
  skillIds: ['s1'],
  points: 100,
  avatarHue: 20,
}

let updatedPayload: any = null
let skillsPayload: string[] | null = null

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
  useSkillsCatalog: () => ({
    data: [
      { id: 's1', code: 'HAN', name: 'Hàn', status: 'ACTIVE' },
      { id: 's2', code: 'SON', name: 'Sơn', status: 'ACTIVE' },
      { id: 's3', code: 'MOC', name: 'Mộc', status: 'ACTIVE' },
    ],
    isPending: false,
  }),
}))

vi.mock('@/features/profile/api', () => ({
  useUpdateMyProfile: () => ({
    mutateAsync: vi.fn(async (payload) => {
      updatedPayload = payload
      return payload
    }),
    isPending: false,
  }),
  useReplaceMySkills: () => ({
    mutateAsync: vi.fn(async (ids: string[]) => {
      skillsPayload = ids
      return {}
    }),
    isPending: false,
  }),
  useReplaceMyAvailability: () => ({
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
    skillIds: ['s1'],
    points: 100,
    avatarHue: 20,
  }
  updatedPayload = null
  skillsPayload = null
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

test('hiện giờ công và prefilled tên theo seed (u27); điểm hiện "—" vì BE chưa có API', async () => {
  mount()

  // Điểm vinh danh: BE chưa có service Reward → hiển thị "—" thay vì 0 giả.
  expect(await screen.findByText('—')).toBeDefined()
  expect(await screen.findByText('28')).toBeDefined()
  const name = await screen.findByLabelText('Họ tên')
  expect((name as HTMLInputElement).value).toBe('Antôn Trương Minh Nhật')
})

test('submit → PATCH /users/me (displayName) + PUT /users/me/skills (skillIds)', async () => {
  mount()
  const user = userEvent.setup()

  const name = await screen.findByLabelText('Họ tên')
  await user.clear(name)
  await user.type(name, 'Antôn Tên Mới')
  fireEvent.click(screen.getByRole('button', { name: 'Sơn' }))

  await user.click(screen.getByRole('button', { name: 'Lưu' }))

  expect(await screen.findByText('Đã cập nhật hồ sơ')).toBeDefined()
  expect(updatedPayload.displayName).toBe('Antôn Tên Mới')
  // BE nhận GUID kỹ năng, không phải tên → gửi ['s1','s2'].
  expect(skillsPayload).toEqual(['s1', 's2'])
})
