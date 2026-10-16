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

const createRegistrationMock = vi.fn().mockResolvedValue({ id: 'r1' })

vi.mock('./api', () => ({
  useCreateRegistration: () => ({
    mutateAsync: createRegistrationMock,
    isPending: false,
  }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/register']}>
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

test('điền đủ thông tin → gửi thành công, hiện xác nhận', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.type(screen.getByLabelText('Họ và tên'), 'Têresa Nguyễn Thị Hoa')
  await user.type(screen.getByLabelText('Số điện thoại'), '0901234567')

  await screen.findByRole('option', { name: 'Giáo khu Thánh Tâm' })
  await user.selectOptions(screen.getByLabelText('Giáo khu'), 'c1')
  await user.selectOptions(screen.getByLabelText('Khu vực muốn đồng hành'), 'GROTTO')

  await user.click(screen.getByRole('button', { name: 'Gửi đăng ký' }))

  await waitFor(() => expect(screen.getByText('Đã gửi đăng ký!')).toBeDefined())
  expect(
    screen.getByText('Cảm ơn bạn. Ban điều hành giáo xứ sẽ liên hệ trong thời gian sớm nhất.'),
  ).toBeDefined()
  expect(createRegistrationMock).toHaveBeenCalled()
})
