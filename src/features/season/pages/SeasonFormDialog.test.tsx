// Validation SeasonFormDialog: zod refine start < end, chọn cộng đoàn.
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { SeasonFormDialog } from './SeasonFormDialog'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.removeItem('grotto-token')
})
afterAll(() => server.close())

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

// jsdom không gõ được từng ký tự vào input[type=date] → fireEvent.change.
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

  it('chưa chọn cộng đoàn → hiện lỗi "Chọn ít nhất 1 cộng đoàn tham gia"', async () => {
    setup()
    setDate('Ngày mở', '2026-09-15')
    setDate('Ngày kết thúc', '2026-12-24')
    submit()
    expect(await screen.findByText('Chọn ít nhất 1 cộng đoàn tham gia')).toBeDefined()
  })

  it('end sau start và đã chọn cộng đoàn → submit thành công', async () => {
    setup()
    setDate('Ngày mở', '2026-09-15')
    setDate('Ngày kết thúc', '2026-12-24')
    const checkbox = await screen.findByRole('checkbox', { name: 'Giáo khu Thánh Tâm' })
    fireEvent.click(checkbox)
    submit()
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(
        true,
      ),
    )
    expect(screen.queryByText('Ngày kết thúc phải sau ngày mở')).toBeNull()
    expect(screen.queryByText('Chọn ít nhất 1 cộng đoàn tham gia')).toBeNull()
  })
})
