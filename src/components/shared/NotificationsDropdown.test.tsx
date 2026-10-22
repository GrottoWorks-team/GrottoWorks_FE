import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationsDropdown } from './NotificationsDropdown'
import type { FeedItem } from '@/features/notifications/api'
import { resetSeen } from '@/features/notifications/seen'

const twoAreas = (): FeedItem[] => [
  {
    id: 'assigned-leader:area-1',
    kind: 'ASSIGNED_LEADER',
    areaName: 'Khu vực #66666666',
    areaStatus: 'PLANNING',
    href: '/leader',
  },
  {
    id: 'assigned-leader:area-2',
    kind: 'ASSIGNED_LEADER',
    areaName: 'Khu vực #a1b2c3d4',
    areaStatus: 'READY',
    href: '/leader',
  },
]

let currentItems: FeedItem[] = twoAreas()

vi.mock('@/features/notifications/api', () => ({
  useNotificationFeed: () => ({ items: currentItems, isPending: false }),
}))

beforeEach(() => {
  // store 'đã đọc' là module cache → phải reset, không chỉ xoá localStorage
  resetSeen()
  currentItems = twoAreas()
})

function mount() {
  return render(
    <MemoryRouter>
      <NotificationsDropdown />
    </MemoryRouter>,
  )
}

test('có khu được phân công → dot sáng, mở panel thấy đúng mục, tắt dot sau khi mở', async () => {
  mount()

  expect(await screen.findByTestId('unread-dot')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('Bạn được phân công phụ trách khu Khu vực #66666666')).toBeDefined()
  expect(screen.getByText('Bạn được phân công phụ trách khu Khu vực #a1b2c3d4')).toBeDefined()
  expect(screen.queryByTestId('unread-dot')).toBeNull()
})

test('phân công thêm khu mới → dot sáng lại dù đã mở panel trước đó', async () => {
  const { rerender } = mount()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
  expect(screen.queryByTestId('unread-dot')).toBeNull()

  currentItems = [
    {
      id: 'assigned-leader:area-3',
      kind: 'ASSIGNED_LEADER',
      areaName: 'Khu vực #ffff0000',
      areaStatus: 'PLANNING',
      href: '/leader',
    },
    ...currentItems,
  ]
  rerender(
    <MemoryRouter>
      <NotificationsDropdown />
    </MemoryRouter>,
  )

  expect(await screen.findByTestId('unread-dot')).toBeDefined()
})

test('chưa có phân công nào → hiện empty state thay vì danh sách', async () => {
  currentItems = []
  mount()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(await screen.findByText('Chưa có thông báo nào')).toBeDefined()
  expect(screen.queryByTestId('unread-dot')).toBeNull()
})

test('mở panel chỉ đọc 10 mục đang thấy; "Đọc tất cả" xoá nốt phần còn lại', async () => {
  currentItems = Array.from({ length: 12 }, (_, i) => ({
    id: `assigned-leader:area-${i}`,
    kind: 'ASSIGNED_LEADER' as const,
    areaName: `Khu vực #${i}`,
    areaStatus: 'PLANNING',
    href: '/leader',
  }))
  mount()

  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))

  expect(screen.getAllByRole('listitem')).toHaveLength(10)
  // 2 mục ngoài 10 vẫn chưa đọc → dot còn sáng
  expect(screen.getByTestId('unread-dot')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Đọc tất cả' }))

  expect(screen.queryByTestId('unread-dot')).toBeNull()
})
