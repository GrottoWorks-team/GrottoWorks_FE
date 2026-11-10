import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import ReadinessPage from './ReadinessPage'
import '@/lib/i18n'

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/leader/readiness/check-1']}>
          <Routes>
            <Route path="/leader/readiness/:id" element={<ReadinessPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ToastProvider>,
  )
}

test('ReadinessPage renders checklist items and status badges', async () => {
  renderComponent()

  const title = await screen.findByText(
    'Kiểm tra an toàn kết cấu & Điều kiện sẵn sàng phân khu Bê-lem',
  )
  expect(title).toBeTruthy()

  expect(
    screen.getByText('Kiểm tra kết cấu chịu lực giàn giáo & khung vòm hang đá'),
  ).toBeTruthy()
  expect(
    screen.getByText('Hệ thống điện nguồn & tủ ngắt CB chống rò rỉ an toàn'),
  ).toBeTruthy()
  expect(
    screen.getByText('Bình chữa cháy CO2 và bảng nội quy an toàn hiện trường'),
  ).toBeTruthy()
  expect(screen.getByText('Tổng số hạng mục')).toBeTruthy()
})

test('clicking Mark Pass calls recordResult mutation', async () => {
  const origFetch = globalThis.fetch
  const calledUrls: string[] = []

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calledUrls.push(url)
    if (url.includes('/readiness-checks/check-1') && !url.includes('/items/')) {
      return new Response(
        JSON.stringify({
          data: {
            id: 'check-1',
            workAreaId: 'area-1',
            workAreaName: 'Hang đá Bê-lem',
            seasonId: 'season-2026',
            name: 'Kiểm tra an toàn kết cấu',
            status: 'InReview',
            version: 1,
            items: [
              {
                id: 'item-101',
                name: 'Kiểm tra giàn giáo',
                mandatory: true,
                status: 'Pending',
                evidenceFileIds: [],
                checkVersion: 1,
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        data: {
          id: 'item-101',
          name: 'Kiểm tra giàn giáo',
          status: 'Passed',
          checkVersion: 2,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const user = userEvent.setup()
    renderComponent()

    const passBtn = await screen.findByRole('button', { name: /^Đạt$/i })
    expect(passBtn).toBeTruthy()

    await user.click(passBtn)

    await waitFor(() => {
      expect(calledUrls.some((url) => url.includes('/items/item-101'))).toBe(true)
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

test('clicking Confirm Readiness opens confirmation dialog', async () => {
  const user = userEvent.setup()
  renderComponent()

  const confirmBtn = await screen.findByRole('button', { name: /Xác nhận sẵn sàng/i })
  await user.click(confirmBtn)

  expect(screen.getByText(/Xác nhận phân khu sẵn sàng/i)).toBeTruthy()
  expect(screen.getByText(/Concurrency Version/i)).toBeTruthy()
})
