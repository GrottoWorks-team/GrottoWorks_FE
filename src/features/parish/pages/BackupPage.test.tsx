import { beforeEach, expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/toast'
import BackupPage from './BackupPage'

const mockStartBackup = vi.fn().mockResolvedValue({
  jobId: 'job-bak-123',
  status: 'PENDING',
})

const mockBackup = vi.fn().mockResolvedValue({ mock: 'data' })

let mockJobStatusData: unknown = null

vi.mock('../api', () => ({
  useBackup: () => ({
    mutateAsync: mockBackup,
    isPending: false,
  }),
  useStartBackup: () => ({
    mutateAsync: mockStartBackup,
    isPending: false,
  }),
  useBackupStatus: (jobId?: string) => ({
    data: jobId ? mockJobStatusData : null,
    isPending: false,
  }),
}))

function renderComponent() {
  return render(
    <ToastProvider>
      <BackupPage />
    </ToastProvider>
  )
}

beforeEach(() => {
  mockStartBackup.mockClear()
  mockBackup.mockClear()
  mockJobStatusData = null
})

test('hiển thị 3 card chức năng sao lưu dữ liệu', () => {
  renderComponent()

  expect(screen.getByTestId('server-backup-card')).toBeDefined()
  expect(screen.getByText('Sao lưu cơ sở dữ liệu máy chủ')).toBeDefined()
  expect(screen.getByText('Sao lưu JSON')).toBeDefined()
  expect(screen.getByText('Đặt lại dữ liệu demo')).toBeDefined()
})

test('khởi tạo sao lưu máy chủ POST /backups thành công', async () => {
  mockJobStatusData = {
    jobId: 'job-bak-123',
    status: 'COMPLETED',
    fileId: 'file-bak-999',
  }

  renderComponent()

  const startBtn = screen.getByTestId('start-server-backup-btn')
  fireEvent.click(startBtn)

  await waitFor(() => {
    expect(mockStartBackup).toHaveBeenCalled()
  })

  expect(screen.getByTestId('backup-job-status')).toBeDefined()
  expect(screen.getByText('COMPLETED')).toBeDefined()
  expect(screen.getByTestId('download-backup-file-link')).toBeDefined()
})
