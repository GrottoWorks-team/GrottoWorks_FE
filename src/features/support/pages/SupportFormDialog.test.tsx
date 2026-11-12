// Regression 13/11/2026: form "Tạo yêu cầu hỗ trợ" kiểu Vật tư từng KHÔNG gọi API khi bấm Lưu
// (dòng vị trí mặc định `name: ''` bị zod validate dù khối Vị trí đang ẩn → submit im lặng).
import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { SupportFormDialog } from './SupportFormDialog'

const createMutate = vi.fn(async (_input: Record<string, unknown>) => ({}))

vi.mock('@/features/areas/api', () => ({
  useScopedAreas: () => ({
    data: [{ id: 'a1', seasonId: 's1', name: 'Hang đá trung tâm', leaderId: 'u1' }],
    isPending: false,
  }),
}))

vi.mock('@/features/materials/api', () => ({
  useWorkAreaRequirements: () => ({
    data: [{ materialId: 'm1', materialName: 'Bóng đèn LED 9W', unit: 'bóng', requiredQuantity: 10 }],
    isPending: false,
  }),
}))

vi.mock('@/features/tasks/api', () => ({
  useTasks: () => ({ data: [], isPending: false }),
}))

vi.mock('../api', () => ({
  useCreateSupportRequest: () => ({ mutateAsync: createMutate, isPending: false }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'LEADER' } }),
}))

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SupportFormDialog open onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

test('loại Vật tư: chọn khu + vật tư rồi Lưu → gọi API với positions rỗng', async () => {
  createMutate.mockClear()
  renderDialog()

  fireEvent.change(screen.getByLabelText(/Khu vực|Work area/i), { target: { value: 'a1' } })
  fireEvent.change(screen.getByLabelText(/Loại hỗ trợ|Support type/i), { target: { value: 'MATERIAL' } })
  // Khối "Vật tư cần" hiện ra → thêm một dòng rồi chọn vật tư.
  fireEvent.click(await screen.findByRole('button', { name: /Thêm vật tư|Add material/i }))
  fireEvent.change(await screen.findByLabelText(/^Vật tư$|^Material$/i), { target: { value: 'm1' } })

  fireEvent.submit(document.getElementById('support-create-form')!)

  await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
  expect(createMutate.mock.calls[0][0]).toMatchObject({
    seasonId: 's1',
    workAreaId: 'a1',
    supportType: 'MATERIAL',
    positions: [],
    materials: [{ materialId: 'm1', requiredQuantity: 1 }],
  })
})

test('thiếu vật tư mà bấm Lưu → báo lỗi ngay trong dialog (không im lặng)', async () => {
  createMutate.mockClear()
  renderDialog()

  fireEvent.change(screen.getByLabelText(/Khu vực|Work area/i), { target: { value: 'a1' } })
  fireEvent.change(screen.getByLabelText(/Loại hỗ trợ|Support type/i), { target: { value: 'MATERIAL' } })
  fireEvent.submit(document.getElementById('support-create-form')!)

  // Không gọi API + phải hiện lý do ngay trong dialog (trước đây hoàn toàn im lặng).
  expect(await screen.findByText(/Chọn vật tư|Add at least one material/i)).toBeDefined()
  expect(createMutate).not.toHaveBeenCalled()
})
