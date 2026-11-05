import { expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/toast'
import RegisterPage from './RegisterPage'

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({
    data: [{ id: 'c1', name: 'Giáo khu Thánh Tâm' }],
    isPending: false,
  }),
}))

vi.mock('@/features/tasks/api', () => ({
  useSkills: () => ({
    data: ['Điện', 'Mộc'],
    isPending: false,
  }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/join']}>
          <RegisterPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('gửi mà thiếu thông tin → báo lỗi trường bắt buộc', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))
  expect(await screen.findByText('Vui lòng nhập họ tên')).toBeDefined()
  expect(screen.getByText('Vui lòng chọn giáo khu')).toBeDefined()
})

test('điền đủ thông tin → báo chức năng đang chờ BE, không hiện xác nhận giả', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText('Họ và tên'), 'Têresa Nguyễn Thị Hoa')
  await user.type(screen.getByLabelText('Số điện thoại'), '0901234567')

  await screen.findByRole('option', { name: 'Giáo khu Thánh Tâm' })
  await user.selectOptions(screen.getByLabelText('Giáo khu'), 'c1')
  await user.selectOptions(screen.getByLabelText('Khu vực muốn đồng hành'), 'GROTTO')

  await user.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

  await waitFor(() =>
    expect(
      screen.getByText(
        'Chức năng đăng ký đồng hành đang chờ BE bổ sung API — vui lòng liên hệ ban hành giáo.',
      ),
    ).toBeDefined(),
  )
  expect(screen.queryByText('Đã gửi đăng ký!')).toBeNull()
})
