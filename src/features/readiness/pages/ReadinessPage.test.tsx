import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import ReadinessPage from './ReadinessPage'
import type { ReadinessCheckDto } from '@/types'
import '@/lib/i18n'

const mockChecklist: ReadinessCheckDto = {
  id: 'check-1',
  workAreaId: 'area-1',
  workAreaName: 'Hang đá Bê-lem',
  seasonId: 'season-2026',
  name: 'Kiểm tra an toàn kết cấu & Điều kiện sẵn sàng phân khu Bê-lem',
  status: 'InReview',
  reopenReason: null,
  completedBy: null,
  completedAt: null,
  version: 1,
  items: [
    {
      id: 'item-101',
      name: 'Kiểm tra kết cấu chịu lực giàn giáo & khung vòm hang đá',
      description: 'Chân đế giàn giáo vững chãi',
      mandatory: true,
      status: 'Passed',
      correctiveTaskId: null,
      checkedBy: 'Trưởng khu',
      checkedAt: '2026-11-10T08:30:00Z',
      note: 'Đã siết toàn bộ 24 khoá cùm giàn giáo',
      evidenceFileIds: ['file-evidence-101'],
      checkVersion: 1,
    },
    {
      id: 'item-102',
      name: 'Hệ thống điện nguồn & tủ ngắt CB chống rò rỉ an toàn',
      description: 'Dây dẫn bọc ruột gà cách điện',
      mandatory: true,
      status: 'Failed',
      correctiveTaskId: 'task-corr-102',
      checkedBy: 'Trưởng khu',
      checkedAt: '2026-11-10T09:15:00Z',
      note: 'Phát hiện đoạn dây cấp điện đèn led vòm bị trầy',
      evidenceFileIds: [],
      checkVersion: 1,
    },
    {
      id: 'item-103',
      name: 'Bình chữa cháy CO2 và bảng nội quy an toàn hiện trường',
      description: 'Bố trí 02 bình bột ABC/CO2',
      mandatory: true,
      status: 'Recheck',
      correctiveTaskId: null,
      checkedBy: null,
      checkedAt: null,
      note: 'Đã thay mới 02 bình CO2',
      evidenceFileIds: [],
      checkVersion: 1,
    },
  ],
}

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
  const origFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ data: mockChecklist }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    renderComponent()

    const title = await screen.findByText(
      'Kiểm tra an toàn kết cấu & Điều kiện sẵn sàng phân khu Bê-lem',
    )
    expect(title).toBeTruthy()

    expect(
      screen.getByText('Kiểm tra kết cấu chịu lực giàn giáo & khung vòm hang đá'),
    ).toBeTruthy()
    expect(
      screen.getAllByText('Hệ thống điện nguồn & tủ ngắt CB chống rò rỉ an toàn').length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Tổng số hạng mục')).toBeTruthy()
  } finally {
    globalThis.fetch = origFetch
  }
})

test('clicking Mark Pass calls recordResult mutation', async () => {
  const origFetch = globalThis.fetch
  const calledUrls: string[] = []

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    calledUrls.push(url)
    if (url.includes('/readiness-checks/check-1') && !url.includes('/items/')) {
      return new Response(JSON.stringify({ data: mockChecklist }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        data: {
          id: 'item-101',
          name: 'Kiểm tra kết cấu',
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

    const passBtn = await screen.findAllByRole('button', { name: /^Đạt$/i })
    expect(passBtn.length).toBeGreaterThan(0)

    await user.click(passBtn[0])

    await waitFor(() => {
      expect(calledUrls.some((url) => url.includes('/items/item-101'))).toBe(true)
    })
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Confirm Readiness bị khoá khi còn mục bắt buộc chưa đạt', async () => {
  const origFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ data: mockChecklist }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    renderComponent()

    const confirmBtn = (await screen.findByRole('button', {
      name: /Xác nhận sẵn sàng/i,
    })) as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)
    // Danh sách mục bắt buộc còn thiếu phải hiện ngay trên trang.
    expect(screen.getByText(/Còn mục bắt buộc chưa đạt/i)).toBeTruthy()
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Confirm Readiness mở hộp xác nhận khi mọi mục bắt buộc đã đạt', async () => {
  const origFetch = globalThis.fetch
  const passedChecklist: ReadinessCheckDto = {
    ...mockChecklist,
    items: mockChecklist.items.map((item) => ({
      ...item,
      status: 'Passed',
      evidenceFileIds: item.evidenceFileIds.length ? item.evidenceFileIds : ['file-evidence-x'],
    })),
  }
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ data: passedChecklist }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const user = userEvent.setup()
    renderComponent()

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận sẵn sàng/i })
    await user.click(confirmBtn)

    expect(await screen.findByText(/Xác nhận phân khu sẵn sàng/i)).toBeTruthy()
    expect(screen.getByText(/Concurrency Version/i)).toBeTruthy()
  } finally {
    globalThis.fetch = origFetch
  }
})
