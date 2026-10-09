import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import SeasonListPage from './SeasonListPage'
import { handlers } from '@/mocks/handlers'
import { resetDb, loadDb, saveDb } from '@/lib/db'

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
        <MemoryRouter>
          <SeasonListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('SeasonListPage (Flow 4 + Flow 6)', () => {
  it('hiển thị danh sách mùa kèm cột Cộng đoàn và Mô tả', async () => {
    setup()
    expect(await screen.findByText('2026')).toBeDefined()
    expect(screen.getByText('Cộng đoàn')).toBeDefined()
    expect(screen.getByText('Mô tả')).toBeDefined()
    // Seed s1 có 3 cộng đoàn
    expect(await screen.findAllByText('3 Cộng đoàn')).toBeDefined()
  })

  it('mùa PLANNED có nút Kích hoạt (Rocket); bấm Kích hoạt mở dialog kiểm tra điều kiện', async () => {
    // Thêm 1 mùa PLANNED vào db
    const db = loadDb()
    db.seasons.push({
      id: 's-planned',
      year: 2027,
      startDate: '2027-09-15',
      endDate: '2027-12-24',
      status: 'PLANNED',
      budget: 80_000_000,
      description: 'Mùa dự kiến 2027',
      communityIds: ['c1'],
    })
    saveDb(db)

    setup()
    expect(await screen.findByText('2027')).toBeDefined()

    // Tìm nút Kích hoạt của mùa 2027
    const activateBtn = await screen.findByRole('button', { name: 'Kích hoạt' })
    expect(activateBtn).toBeDefined()

    // Bấm Kích hoạt -> vì chưa có khu vực nào thuộc s-planned, mở SeasonActivateDialog
    fireEvent.click(activateBtn)
    expect(await screen.findByText('Kiểm tra điều kiện kích hoạt')).toBeDefined()
    expect(await screen.findByText('Chưa đủ điều kiện kích hoạt mùa')).toBeDefined()
  })
})
