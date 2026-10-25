import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { SeasonFormDialog } from './SeasonFormDialog'

vi.mock('@/features/communities/api', () => ({
  useCommunities: () => ({
    data: [{ id: 'c1', name: 'Giáo khu Thánh Tâm' }],
    isPending: false,
  }),
}))

vi.mock('@/features/parish/hooks', () => ({
  useCurrentParishId: () => ({ parishId: 'p1', isPending: false }),
}))

vi.mock('../api', () => ({
  useCreateSeason: () => ({
    mutateAsync: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 500))),
    isPending: false,
  }),
  useUpdateSeason: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSeason: () => ({
    data: undefined,
    isPending: false,
  }),
}))

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SeasonFormDialog onClose={() => {}} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const setDate = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

const submit = () => {
  fireEvent.submit(document.getElementById('season-form')!)
}

describe('SeasonFormDialog validation', () => {
  it('end trước start → hiện lỗi "Ngày kết thúc phải sau ngày mở"', async () => {
    setup()
    setDate('Ngày mở', '2026-12-24')
    setDate('Ngày kết thúc', '2026-09-15')
    submit()
    expect(await screen.findByText('Ngày kết thúc phải sau ngày mở')).toBeDefined()
  })

  it('end bằng start cũng bị chặn (start ≥ end)', async () => {
    setup()
    setDate('Ngày mở', '2026-09-15')
    setDate('Ngày kết thúc', '2026-09-15')
    submit()
    expect(await screen.findByText('Ngày kết thúc phải sau ngày mở')).toBeDefined()
  })

  it('end sau start → submit thành công', async () => {
    setup()
    const nameInput = screen.queryByLabelText(/Tên mùa/i)
    if (nameInput) fireEvent.change(nameInput, { target: { value: 'Mùa 2026' } })

    setDate('Ngày mở', '2026-09-15')
    setDate('Ngày kết thúc', '2026-12-24')
    submit()
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    )
    expect(screen.queryByText('Ngày kết thúc phải sau ngày mở')).toBeNull()
  })
})
