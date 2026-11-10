import { expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ActivityPage from './ActivityPage'
import type { ActivityLog } from '@/types'

const mockLogs: ActivityLog[] = [
  {
    id: 'log-1',
    actor: 'u1',
    action: 'UPDATE_TASK',
    target: 'TASK:task-99',
    at: '2026-11-10T12:00:00Z',
  },
]

const mockDetail = {
  id: 'log-1',
  action: 'UPDATE_TASK',
  entityType: 'TASK',
  entityId: 'task-99',
  actorUserId: 'u1',
  timestamp: '2026-11-10T12:00:00Z',
  metadata: { status: 'DONE' },
}

const mockHistory = [
  {
    fieldName: 'status',
    oldValue: 'IN_PROGRESS',
    newValue: 'DONE',
    changedAt: '2026-11-10T12:00:00Z',
    changedBy: 'u1',
  },
]

vi.mock('../api', () => ({
  useActivityLogs: () => ({
    data: mockLogs,
    isPending: false,
  }),
  useActivityLogDetail: (id?: string) => ({
    data: id ? mockDetail : null,
    isLoading: false,
  }),
  useResourceHistory: (type?: string, id?: string) => ({
    data: type && id ? mockHistory : null,
    isLoading: false,
  }),
}))

vi.mock('@/features/users/api', () => ({
  useUsers: () => ({
    data: [{ id: 'u1', name: 'Nguyen Van Admin', avatarHue: 120 }],
    isPending: false,
  }),
}))

function renderComponent() {
  return render(<ActivityPage />)
}

test('hiển thị danh sách nhật ký hoạt động', () => {
  renderComponent()

  expect(screen.getByText('Lịch sử hệ thống')).toBeDefined()
  expect(screen.getByText('Nguyen Van Admin')).toBeDefined()
  expect(screen.getAllByText('UPDATE_TASK').length).toBeGreaterThan(0)
  expect(screen.getByText('TASK:task-99')).toBeDefined()
})

test('mở dialog xem chi tiết nhật ký và lịch sử biến động trạng thái', async () => {
  renderComponent()

  const viewBtn = screen.getByTestId('view-log-log-1')
  fireEvent.click(viewBtn)

  expect(screen.getByText('Chi tiết nhật ký hoạt động')).toBeDefined()
  expect(screen.getByTestId('activity-log-detail-content')).toBeDefined()

  await waitFor(() => {
    expect(screen.getByText(/Lịch sử trạng thái tài nguyên/)).toBeDefined()
    expect(screen.getByText('IN_PROGRESS')).toBeDefined()
    expect(screen.getByText('DONE')).toBeDefined()
  })
})
