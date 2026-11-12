// Hồi quy 12/11/2026: BE trả `PurchaseRequestStatus.Planning` → JSON "PLANNING" (BA R-12: không có DRAFT).
// FE từng so sánh 'DRAFT' nên trang chi tiết không hiện nút "Gửi duyệt" cho MO.
// Test này khoá hợp đồng: dữ liệu PLANNING ⇒ có nút Gửi duyệt; bộ lọc gửi đúng "PLANNING" lên BE.
import { describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import PurchaseDetailPage from './PurchaseDetailPage'
import PurchaseListPage from './PurchaseListPage'
import type { PurchaseRequestDto } from '../api'

const request: PurchaseRequestDto = {
  id: 'da3cf4fd-90d9-486e-b4aa-50ca8e624103',
  workAreaId: 'area-1',
  workAreaName: 'Hang đá trung tâm',
  seasonId: 'season-1',
  requestedBy: 'user-1',
  reason: 'thiếu',
  status: 'PLANNING',
  items: [
    {
      id: 'item-1',
      materialId: 'mat-1',
      materialCode: 'VAT-002',
      materialName: 'Bóng đèn LED 9W',
      unit: 'bóng',
      requestedQuantity: 10,
      estimatedCost: 200000,
      note: null,
      shortageOverrideReason: null,
    },
  ],
  estimatedTotal: { amount: 200000, currency: 'VND' },
  approvedBy: null,
  decisionNote: null,
  approvedAt: null,
  rejectedAt: null,
  createdAt: '2026-11-12T22:49:00+07:00',
  updatedAt: null,
  version: 6186,
  purchases: [],
}

const sendMutate = vi.fn().mockResolvedValue(undefined)
const listFilter = vi.fn()

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: { id: 'mo-1', role: 'MATERIAL_OFFICER' }, isPending: false }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => ({ id: request.id }) }
})

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api')
  return {
    ...actual,
    usePurchaseRequest: () => ({ data: request, isPending: false }),
    usePurchaseRequestHistory: () => ({ data: [], isPending: false }),
    usePurchaseRequests: (filter: unknown) => {
      listFilter(filter)
      return { data: [request], isPending: false }
    },
    useSendForApproval: () => ({ mutateAsync: sendMutate, isPending: false }),
    useUpdatePurchaseRequest: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreatePurchaseTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useConfirmPurchaseDelivery: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useRequestPurchaseInfo: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useApproveCostOverrun: () => ({ mutateAsync: vi.fn(), isPending: false }),
    openPurchaseReceipt: vi.fn(),
  }
})

const wrap = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('purchase request status PLANNING', () => {
  test('chi tiết: MO thấy nút Gửi duyệt khi yêu cầu đang PLANNING', async () => {
    wrap(<PurchaseDetailPage />)
    const submit = await screen.findByRole('button', { name: /Gửi duyệt/i })
    expect(submit.hasAttribute('disabled')).toBe(false)

    await userEvent.click(submit)
    await waitFor(() => expect(sendMutate).toHaveBeenCalledWith({ requestId: request.id, version: 6186 }))
  })

  test('danh sách: bộ lọc trạng thái dùng PLANNING và dòng PLANNING có nút Gửi duyệt', async () => {
    wrap(<PurchaseListPage />)
    // Nhãn "Đang chuẩn bị" xuất hiện ở thẻ thống kê, badge và option lọc.
    expect((await screen.findAllByText('Đang chuẩn bị')).length).toBeGreaterThan(0)

    const planningOption = Array.from(document.querySelectorAll('option')).find(
      (option) => option.value === 'PLANNING',
    )
    expect(planningOption?.textContent).toBe('Đang chuẩn bị')

    expect(screen.getAllByRole('button', { name: /Gửi duyệt/i }).length).toBeGreaterThan(0)
    expect(listFilter).toHaveBeenCalled()
  })
})
