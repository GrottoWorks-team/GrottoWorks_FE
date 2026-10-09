// Login qua MSW node handlers thật (login → navigate → AppShell render).
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import App from '@/App'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.removeItem('grotto-token')
  window.history.pushState({}, '', '/')
})
afterAll(() => server.close())

test('hiện 4 chip tài khoản demo', async () => {
  render(<App />)
  for (const local of ['admin', 'committee', 'leader', 'officer']) {
    expect(await screen.findByRole('button', { name: new RegExp(local) })).toBeDefined()
  }
})

test('đăng nhập committee → vào shell với nav điều phối, hiện Mùa chuẩn bị & Khu vực công tác', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: /committee/ }))
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  expect(await screen.findByText('Điều phối')).toBeDefined()
  expect(await screen.findByText('Giuse Trần Văn Bình')).toBeDefined()
  expect(await screen.findByRole('link', { name: /Mùa chuẩn bị/i })).toBeDefined()
  expect(await screen.findByRole('link', { name: /Khu vực công tác/i })).toBeDefined()
})


