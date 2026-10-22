import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/toast'
import GrottoDesignerPage from './GrottoDesignerPage'

// Mock hook useArea
vi.mock('@/features/areas/api', () => ({
  useArea: (id?: string) => ({
    data: {
      id: id || '66666666-6666-6666-6666-666666666666',
      name: 'Hang Bê-lem Chính',
      status: 'IN_PROGRESS',
    },
    isPending: false,
  }),
}))

describe('GrottoDesignerPage Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  it('render đầy đủ thanh công cụ toolbar và 3 cột workspace', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/parish/areas/66666666-6666-6666-6666-666666666666/designer']}>
            <Routes>
              <Route
                path="/parish/areas/:areaId/designer"
                element={<GrottoDesignerPage />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    )

    // Kiểm tra toolbar có tên phân khu
    expect(screen.getByText(/Hang Bê-lem Chính/i)).toBeDefined()

    // Kiểm tra có thư viện cấu kiện bên trái
    expect(screen.getByText(/Thư viện cấu kiện/i)).toBeDefined()

    // Kiểm tra có tab thuộc tính bên phải
    expect(screen.getByText(/Thuộc tính/i)).toBeDefined()

    // Kiểm tra có nút Xuất ảnh PNG và Lưu
    expect(screen.getByRole('button', { name: /Xuất ảnh PNG/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Lưu thiết kế/i })).toBeDefined()
  })
})
