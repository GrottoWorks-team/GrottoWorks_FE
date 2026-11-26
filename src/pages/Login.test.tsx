import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'

vi.mock('@/lib/api', () => ({
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
        email: 'bao.tran@giaoxuthanhtam.org.vn',
        role: 'COMMUNITY',
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

test('không hiển thị nút tài khoản demo', () => {
  render(<App />)
  expect(screen.queryByRole('button', { name: /hoa\.nguyen|bao\.tran|ngan\.nguyen|anh\.pham/i })).toBeNull()
})

test('đăng nhập committee → vào shell với nav điều phối, hiện Mùa Giáng sinh & Khu vực công tác', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.type(await screen.findByLabelText('Email'), 'bao.tran@giaoxuthanhtam.org.vn')
  await user.type(await screen.findByLabelText('Mật khẩu'), 'test-password')
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  expect(await screen.findByText('Điều phối', {}, { timeout: 10_000 })).toBeDefined()
  expect(await screen.findByText('Giuse Trần Văn Bình', {}, { timeout: 10_000 })).toBeDefined()
  expect(
    await screen.findByRole('link', { name: /Mùa Giáng sinh/i }, { timeout: 10_000 }),
  ).toBeDefined()
  expect(
    await screen.findByRole('link', { name: /Khu vực công tác/i }, { timeout: 10_000 }),
  ).toBeDefined()
})
