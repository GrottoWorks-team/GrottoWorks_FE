import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import RoleNotificationsPage from './NotificationsPage'
import type { FeedItem } from '../api'
import { resetSeen } from '../seen'

const mockItems: FeedItem[] = [
  {
    id: 'n-1',
    kind: 'TASK_ASSIGNED',
    title: 'Phân công nhiệm vụ mới',
    body: 'Bạn được phân công phụ trách nhiệm vụ Dựng bộ khung sắt',
    isRead: false,
    source: 'BE',
    href: '/leader/tasks',
  },
  {
    id: 'n-2',
    kind: 'MATERIAL_ALLOCATED',
    title: 'Cấp phát vật tư hoàn tất',
    body: 'Đã cấp phát 5 cuộn Dây LED vàng 10m',
    isRead: true,
    source: 'BE',
    href: '/leader/tasks',
  },
]

let feedData = {
  items: mockItems,
  isPending: false,
  source: 'BE' as const,
}

const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()

vi.mock('../api', () => ({
  useNotificationFeed: () => feedData,
  useMarkNotificationRead: () => ({ mutate: mockMarkRead }),
  useMarkAllNotificationsRead: () => ({ mutate: mockMarkAllRead }),
}))

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>
          <RoleNotificationsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  resetSeen()
  feedData = {
    items: mockItems,
    isPending: false,
    source: 'BE',
  }
  vi.clearAllMocks()
})

test('hiển thị tiêu đề, các dòng thông báo BE và badge API', async () => {
  mount()

  expect(screen.getByText('Thông báo')).toBeDefined()
  expect(screen.getByText('Phân công nhiệm vụ mới')).toBeDefined()
  expect(screen.getByText('Bạn được phân công phụ trách nhiệm vụ Dựng bộ khung sắt')).toBeDefined()
  expect(screen.getByText('Cấp phát vật tư hoàn tất')).toBeDefined()
  expect(screen.getAllByText('API')).toHaveLength(2)
})

test('lọc Chưa đọc hiển thị đúng số lượng và ẩn thông báo đã đọc', async () => {
  mount()

  // Bấm filter Chưa đọc
  const unreadBtn = screen.getByRole('button', { name: /Chưa đọc/i })
  fireEvent.click(unreadBtn)

  expect(screen.getByText('Phân công nhiệm vụ mới')).toBeDefined()
})

test('bấm Đọc tất cả kích hoạt mutation', async () => {
  mount()

  const markAllBtn = screen.getByRole('button', { name: /Đọc tất cả/i })
  fireEvent.click(markAllBtn)

  expect(mockMarkAllRead).toHaveBeenCalledWith(['n-1', 'n-2'])
})
