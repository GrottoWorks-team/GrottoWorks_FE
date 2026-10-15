import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NotificationsDropdown } from './NotificationsDropdown'

let currentLogs = [
  { id: 'log40', actor: 'u2', action: 'xác nhận hóa đơn', target: 'pc4', at: '2026-10-14T20:00:00Z' },
  { id: 'log39', actor: 'u3', action: 'tạo', target: 't39', at: '2026-10-14T19:00:00Z' },
  { id: 'log38', actor: 'u4', action: 'tạo', target: 't38', at: '2026-10-14T18:00:00Z' },
  { id: 'log37', actor: 'u5', action: 'tạo', target: 't37', at: '2026-10-14T17:00:00Z' },
  { id: 'log36', actor: 'u6', action: 'tạo', target: 't36', at: '2026-10-14T16:00:00Z' },
  { id: 'log35', actor: 'u7', action: 'tạo', target: 't35', at: '2026-10-14T15:00:00Z' },
  { id: 'log34', actor: 'u8', action: 'tạo', target: 't34', at: '2026-10-14T14:00:00Z' },
  { id: 'log33', actor: 'u9', action: 'tạo', target: 't33', at: '2026-10-14T13:00:00Z' },
  { id: 'log32', actor: 'u10', action: 'tạo', target: 't32', at: '2026-10-14T12:00:00Z' },
  { id: 'log31', actor: 'u11', action: 'tạo', target: 't31', at: '2026-10-14T11:00:00Z' },
]

vi.mock('@/features/dashboards/api', () => ({
  useActivity: () => ({ data: currentLogs, isPending: false }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({
    data: [{ id: 'u2', name: 'Giuse Trần Văn Bình' }],
    isPending: false,
  }),
}))

beforeEach(() => {
  localStorage.removeItem('grotto-notif-read')
  currentLogs = [
    { id: 'log40', actor: 'u2', action: 'xác nhận hóa đơn', target: 'pc4', at: '2026-10-14T20:00:00Z' },
    { id: 'log39', actor: 'u3', action: 'tạo', target: 't39', at: '2026-10-14T19:00:00Z' },
    { id: 'log38', actor: 'u4', action: 'tạo', target: 't38', at: '2026-10-14T18:00:00Z' },
    { id: 'log37', actor: 'u5', action: 'tạo', target: 't37', at: '2026-10-14T17:00:00Z' },
    { id: 'log36', actor: 'u6', action: 'tạo', target: 't36', at: '2026-10-14T16:00:00Z' },
    { id: 'log35', actor: 'u7', action: 'tạo', target: 't35', at: '2026-10-14T15:00:00Z' },
    { id: 'log34', actor: 'u8', action: 'tạo', target: 't34', at: '2026-10-14T14:00:00Z' },
    { id: 'log33', actor: 'u9', action: 'tạo', target: 't33', at: '2026-10-14T13:00:00Z' },
    { id: 'log32', actor: 'u10', action: 'tạo', target: 't32', at: '2026-10-14T12:00:00Z' },
    { id: 'log31', actor: 'u11', action: 'tạo', target: 't31', at: '2026-10-14T11:00:00Z' },
  ]
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={client}>
      <NotificationsDropdown />
    </QueryClientProvider>,
  )
  return { ...result, client }
}

test('mở panel → 10 hoạt động mới nhất; dot tắt sau mở, sáng lại khi có log mới', async () => {
  const { rerender, client } = mount()

  expect(await screen.findByTestId('unread-dot')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(await screen.findAllByRole('listitem')).toHaveLength(10)
  expect(screen.getByText('Giuse Trần Văn Bình')).toBeDefined()
  expect(screen.getByText('xác nhận hóa đơn')).toBeDefined()
  expect(screen.getByText('pc4')).toBeDefined()
  expect(screen.queryByTestId('unread-dot')).toBeNull()

  currentLogs = [
    { id: 'log41', actor: 'u2', action: 'tạo việc', target: 'Task dot test', at: new Date().toISOString() },
    ...currentLogs,
  ]
  rerender(
    <QueryClientProvider client={client}>
      <NotificationsDropdown />
    </QueryClientProvider>,
  )
  expect(await screen.findByTestId('unread-dot')).toBeDefined()
})
