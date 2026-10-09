// ReportPage render aggregates từ db seed (msw + render page thật với
// committee u2). Kiểm: bảng tổng kết + StatCard (chờ count-up 700ms xong),
// RecognitionBoard sort điểm desc + huy chương top 1, và nút Xuất CSV
// gọi exportCsv thật (stub URL.createObjectURL SAU khi data load — stub
// sớm sẽ phá fetch/msw; soi BOM trong blob).
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/lib/auth'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import ReportPage from './ReportPage'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.setItem('grotto-token', 'demo-u2') // committee
})
afterAll(() => server.close())

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthProvider>
          <ReportPage />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

// jsdom Blob thiếu arrayBuffer() — đọc bytes qua FileReader (như csv.test).
const blobBytes = (b: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(new Uint8Array(fr.result as ArrayBuffer))
    fr.readAsArrayBuffer(b)
  })

test('render aggregates đúng seed: tổng chi phí, nhiệm vụ DONE, giờ công, quyên góp', async () => {
  mount()

  // StatCard tổng chi phí: pc1..pc4 = 2_760_000+700_000+2_700_000+600_000.
  // Count-up 700ms sau khi data về → timeout rộng cho jsdom rAF chậm.
  expect(await screen.findByText('6.760.000', {}, { timeout: 5000 })).toBeDefined()
  // Bảng nhiệm vụ hoàn thành: t1 "Xây nền hang đá" (DONE seed).
  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()
  // Bảng quyên góp: donor d1.
  expect(await screen.findByText('Bà Anna Võ Kim Ngân')).toBeDefined()
  // Giờ công theo TNV: u27 có 4 ca × 7h = 28h (xuất hiện ở cả bảng giờ công
  // và vinh danh → findAll rồi soi đúng hàng có 28.0).
  const hoursRow = (await screen.findAllByText('Antôn Trương Minh Nhật')).find((el) =>
    el.closest('tr')?.textContent?.includes('28.0'),
  )
  expect(hoursRow).toBeDefined()
})

test('RecognitionBoard sort điểm giảm dần — top 1 huy chương vàng (u11, 130 điểm)', async () => {
  mount()

  const top = (await screen.findByText('Antôn Nguyễn Đức Long')).closest('tr')!
  expect(top.textContent).toContain('130')
  expect(screen.getAllByLabelText('Hạng 1')).toHaveLength(1)
})

test('Xuất CSV bảng chi phí: đúng tên file + BOM UTF-8', async () => {
  mount()
  const user = userEvent.setup()

  // Chờ data thật render (bảng chi phí có dòng) trước khi stub URL —
  // stub toàn cục URL trước mount phá fetch/msw → mọi query chết.
  await screen.findAllByText('Xi măng PCB40')
  const exportButtons = await screen.findAllByRole('button', { name: 'Xuất CSV' })
  expect(exportButtons.length).toBe(4) // 4 bảng, mỗi bảng 1 nút

  let captured: Blob | null = null
  let filename = ''
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((b: Blob) => {
      captured = b
      return 'blob:mock'
    }),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download
  })

  await user.click(exportButtons[0]) // bảng đầu = chi phí

  expect(filename).toBe('grottoworks-bao-cao-chi-phi.csv')
  const bytes = await blobBytes(captured!)
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
