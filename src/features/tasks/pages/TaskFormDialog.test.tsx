import { expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { TaskFormDialog } from './TaskFormDialog'

vi.mock('@/features/areas/api', () => ({
  useAreas: () => ({ data: [{ id: 'a1', name: 'Hang đá Bê-lem' }], isPending: false }),
  useScopedAreas: () => ({ data: [{ id: 'a1', name: 'Hang đá Bê-lem' }], isPending: false }),
}))

vi.mock('@/features/materials/api', () => ({
  useMaterials: () => ({ data: [], isPending: false }),
}))

vi.mock('../api', () => ({
  useSkillsCatalog: () => ({
    data: [
      { id: 's1', code: 'DIEN', name: 'Điện', status: 'ACTIVE' },
      { id: 's2', code: 'MOC', name: 'Mộc', status: 'ACTIVE' },
    ],
    isPending: false,
  }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceTaskSkills: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReplaceTaskMaterials: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

test('submit thiếu title → hiện lỗi zod "Vui lòng nhập tên việc"', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TaskFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  fireEvent.submit(document.getElementById('task-form')!)
  expect(await screen.findByText('Vui lòng nhập tên việc')).toBeDefined()
})

test('TaskFormDialog có ô chọn priority và datetime-local startAt', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <TaskFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )

  const prioritySelect = screen.getByLabelText(/Mức độ ưu tiên|Priority/i) as HTMLSelectElement
  expect(prioritySelect).toBeDefined()
  expect(prioritySelect.value).toBe('MEDIUM')

  const startAtInput = screen.getByLabelText(/Thời gian bắt đầu|Start time/i) as HTMLInputElement
  expect(startAtInput).toBeDefined()
  expect(startAtInput.type).toBe('datetime-local')
  expect(startAtInput.value).toBeTruthy()
})
