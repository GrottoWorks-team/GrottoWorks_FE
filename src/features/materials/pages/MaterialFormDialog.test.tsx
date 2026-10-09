// Validation MaterialFormDialog: thiếu name → zod error (pattern
// SeasonFormDialog.test). Không cần msw — submit sai khong gui request nao.
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import { MaterialFormDialog } from './MaterialFormDialog'

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MaterialFormDialog onClose={() => {}} areaId="a1" />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const submit = () => fireEvent.submit(document.getElementById('material-form')!)

describe('MaterialFormDialog validation', () => {
  it('thiếu tên vật tư → hiện lỗi "Vui lòng nhập tên vật tư"', async () => {
    setup()
    submit()
    expect(await screen.findByText('Vui lòng nhập tên vật tư')).toBeDefined()
  })

  it('thiếu đơn vị cũng bị chặn', async () => {
    setup()
    fireEvent.change(screen.getByLabelText('Vật tư'), { target: { value: 'Đinh 2 inch' } })
    submit()
    expect(await screen.findByText('Vui lòng nhập đơn vị')).toBeDefined()
  })
})
