import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { ToastProvider } from '@/components/ui/toast'
import { SeasonActivateDialog, validateSeasonActivation } from './SeasonActivateDialog'
import { handlers } from '@/mocks/handlers'
import { resetDb } from '@/lib/db'
import type { Season, WorkArea } from '@/types'

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  resetDb()
  localStorage.removeItem('grotto-token')
})
afterAll(() => server.close())
const validSeason: Season = {
  id: 's1',
  year: 2026,
  startDate: '2026-09-15',
  endDate: '2026-12-24',
  status: 'PLANNED',
  budget: 100_000_000,
  description: 'Mùa 2026',
  communityIds: ['c1'],
}
const validArea: WorkArea = {
  id: 'a-test',
  name: 'Hang đá thử nghiệm',
  type: 'GROTTO',
  level: 'PARISH',
  leaderId: 'u3',
  officerId: 'u4',
  deadline: '2027-12-20',
  progress: 0,
  volunteerCount: 0,
  taskCount: 0,
  status: 'ON_TRACK',
  seasonId: 's1',
}

function setup(season: Season, areas: WorkArea[], onClose = () => {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <SeasonActivateDialog season={season} areas={areas} onClose={onClose} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('validateSeasonActivation logic', () => {
  it('đạt đủ 4 điều kiện → canActivate = true', () => {
    const result = validateSeasonActivation(validSeason, [validArea])
    expect(result.canActivate).toBe(true)
    expect(result.items.every((i) => i.valid)).toBe(true)
  })

  it('ngày kết thúc không sau ngày mở → canActivate = false', () => {
    const s = { ...validSeason, endDate: '2026-09-01' }
    const result = validateSeasonActivation(s, [validArea])
    expect(result.canActivate).toBe(false)
    expect(result.items.find((i) => i.key === 'dates')?.valid).toBe(false)
  })

  it('không có cộng đoàn tham gia → canActivate = false', () => {
    const s = { ...validSeason, communityIds: [] }
    const result = validateSeasonActivation(s, [validArea])
    expect(result.canActivate).toBe(false)
    expect(result.items.find((i) => i.key === 'communities')?.valid).toBe(false)
  })

  it('chưa có khu vực nào thuộc mùa → canActivate = false', () => {
    const result = validateSeasonActivation(validSeason, [])
    expect(result.canActivate).toBe(false)
    expect(result.items.find((i) => i.key === 'areas')?.valid).toBe(false)
  })

  it('khu vực thiếu officerId hoặc deadline → canActivate = false', () => {
    const a = { ...validArea, officerId: '', deadline: undefined }
    const result = validateSeasonActivation(validSeason, [a])
    expect(result.canActivate).toBe(false)
    expect(result.items.find((i) => i.key === 'staff')?.valid).toBe(false)
  })
})

describe('SeasonActivateDialog UI', () => {
  it('chưa đủ điều kiện → nút Kích hoạt bị disabled', () => {
    setup(validSeason, []) // không có khu vực
    const activateBtn = screen.getByRole('button', { name: /kích hoạt/i })
    expect((activateBtn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Chưa đủ điều kiện kích hoạt mùa')).toBeDefined()
  })

  it('đủ điều kiện → nút Kích hoạt enabled và bấm kích hoạt thành công', async () => {
    let closed = false
    setup(validSeason, [validArea], () => {
      closed = true
    })
    const activateBtn = screen.getByRole('button', { name: /kích hoạt/i })
    expect((activateBtn as HTMLButtonElement).disabled).toBe(false)
    expect(
      screen.getByText('Tất cả điều kiện đã đạt. Sẵn sàng kích hoạt mùa Giáng sinh.'),
    ).toBeDefined()

    fireEvent.click(activateBtn)
    await waitFor(() => expect(closed).toBe(true))
  })
})
