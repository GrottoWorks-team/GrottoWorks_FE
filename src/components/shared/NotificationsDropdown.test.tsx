import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationsDropdown } from './NotificationsDropdown'
import type { NotificationDto } from '@/features/notifications/api'

const state = vi.hoisted(() => ({
  items: [] as NotificationDto[],
  unread: 0,
  markRead: vi.fn(),
  markAll: vi.fn(),
}))

vi.mock('@/features/notifications/api', () => ({
  useNotificationFeed: () => ({ items: state.items, isPending: false }),
  useUnreadNotificationCount: () => ({ data: state.unread }),
  useMarkNotificationRead: () => ({ mutate: state.markRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({ mutate: state.markAll, isPending: false }),
}))

function dto(overrides: Partial<NotificationDto> & { id: string }): NotificationDto {
  return {
    eventType: 'task.assignment.created',
    title: 'Bạn được phân công công việc mới',
    body: 'Khu vực hang đá trung tâm',
    referenceType: 'task',
    referenceId: 'task-1',
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  state.markRead.mockClear()
  state.markAll.mockClear()
  state.items = [
    dto({ id: 'n1', title: 'Thông báo một' }),
    dto({ id: 'n2', title: 'Thông báo hai', isRead: true }),
  ]
  state.unread = 1
})

function mount() {
  return render(
    <MemoryRouter>
      <NotificationsDropdown />
    </MemoryRouter>,
  )
}

test('có thông báo chưa đọc → dot sáng; mở panel thấy đúng các mục', async () => {
  mount()

  expect(await screen.findByTestId('unread-dot')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('Thông báo một')).toBeDefined()
  expect(screen.getByText('Thông báo hai')).toBeDefined()
})

test('bấm một mục chưa đọc → gọi API đánh dấu đã đọc', async () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  fireEvent.click(screen.getByText('Thông báo một'))

  expect(state.markRead).toHaveBeenCalledWith('n1')
})

test('"Đọc tất cả" → gọi read-all', async () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  fireEvent.click(screen.getByRole('button', { name: 'Đọc tất cả' }))

  expect(state.markAll).toHaveBeenCalled()
})

test('chưa có thông báo → empty state, không có dot', async () => {
  state.items = []
  state.unread = 0
  mount()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(await screen.findByText('Chưa có thông báo nào')).toBeDefined()
  expect(screen.queryByTestId('unread-dot')).toBeNull()
})
