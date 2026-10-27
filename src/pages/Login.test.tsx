import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
    }
  },
  api: vi.fn(async (url: string) => {
    if (url === '/api/v1/auth/login') {
      return {
        accessToken: 'token-u2',
        refreshToken: 'refresh-u2',
        tokenType: 'Bearer',
        expiresIn: 900,
      }
    }
    if (url === '/api/v1/users/me') {
      return {
        id: 'u2',
        displayName: 'Giuse Trần Văn Bình',
        name: 'Giuse Trần Văn Bình',
        email: 'leader.demo@grottoworks.local',
        role: 'LEADER',
        communityId: 'c1',
        points: 0,
        skills: [],
      }
    }
    return []
  }),
}))

vi.mock('@/features/dashboards/api', () => ({
  useActivity: () => ({ data: [], isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({ data: [], isPending: false }),
}))

beforeEach(() => {
  localStorage.removeItem('grotto-token')
  localStorage.removeItem('grotto-refresh-token')
  window.history.pushState({}, '', '/login')
})

test('hiện chip tài khoản demo khớp seed thật của BE', async () => {
  render(<App />)
  // Ba tài khoản seed thật trong scripts/seed-demo.sh — không còn email bịa.
  for (const local of ['parish.demo', 'leader.demo', 'mo.demo']) {
    expect(
      await screen.findByRole('button', { name: new RegExp(local) }, { timeout: 10_000 }),
    ).toBeDefined()
  }
})

test('đăng nhập bằng form → vào shell với nav Trưởng khu', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByLabelText(/Email/i), 'leader.demo@grottoworks.local')
  await user.type(screen.getByLabelText(/^Mật khẩu/i), 'ChangeMe!123456')
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  expect(await screen.findByText('Giuse Trần Văn Bình', {}, { timeout: 10_000 })).toBeDefined()
  // LEADER không có mục "Khu vực công tác"; nav của họ bắt đầu bằng Nhiệm vụ.
  expect(
    await screen.findByRole('link', { name: /Nhiệm vụ/i }, { timeout: 10_000 }),
  ).toBeDefined()
})
