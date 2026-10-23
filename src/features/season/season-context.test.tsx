// Bug 23/10/2026: "mở một trang mới thì mùa lại load lại, không giữ mùa đã chọn".
// Nguyên nhân: mùa chỉ được ghi ở `?season=` nên link sidebar (không mang query)
// làm provider rơi về mặc định. Test khoá lại hành vi: đổi mùa → chuyển trang →
// F5 vẫn giữ đúng mùa (localStorage `grotto-season`).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Season } from '@/types'
import { SeasonProvider, SeasonSelect, useSeasonContext } from './season-context'

const { seasons } = vi.hoisted(() => {
  const make = (id: string, year: number, status: Season['status']): Season => ({
    id,
    parishId: 'p1',
    name: `Mùa ${year}`,
    year,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    status,
    budget: 0,
    communityIds: [],
    version: 1,
  })
  return {
    seasons: [make('s-active', 2026, 'ACTIVE'), make('s-plan', 2027, 'PLANNING')],
  }
})

vi.mock('./api', () => ({
  useSeasons: () => ({ data: seasons, isPending: false }),
}))

function Probe() {
  const { seasonId } = useSeasonContext()
  return (
    <>
      <SeasonSelect />
      <p data-testid="season-id">{seasonId ?? 'none'}</p>
      {/* Link sidebar thật không mang theo `?season=` */}
      <Link to="/other">Sang trang khác</Link>
    </>
  )
}

function renderApp(initialEntry = '/leader') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SeasonProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </SeasonProvider>
    </MemoryRouter>,
  )
}

const seasonIdText = () => screen.getByTestId('season-id').textContent

beforeEach(() => {
  localStorage.clear()
})

describe('SeasonProvider — giữ mùa đã chọn', () => {
  it('chưa có lựa chọn → dùng mùa ACTIVE', () => {
    renderApp()
    expect(seasonIdText()).toBe('s-active')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('s-active')
  })

  it('đổi mùa → chuyển sang trang không có ?season= vẫn giữ mùa vừa chọn', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.selectOptions(screen.getByRole('combobox'), 's-plan')
    expect(localStorage.getItem('grotto-season')).toBe('s-plan')

    await user.click(screen.getByRole('link', { name: 'Sang trang khác' }))
    expect(seasonIdText()).toBe('s-plan')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('s-plan')
  })

  it('F5 (mount lại) vẫn giữ mùa đã chọn', async () => {
    const user = userEvent.setup()
    const first = renderApp()

    await user.selectOptions(screen.getByRole('combobox'), 's-plan')
    first.unmount()

    renderApp()
    expect(seasonIdText()).toBe('s-plan')
  })

  it('?season trên URL thắng mùa đã lưu và được ghi lại', () => {
    localStorage.setItem('grotto-season', 's-plan')
    renderApp('/leader?season=s-active')

    expect(seasonIdText()).toBe('s-active')
    expect(localStorage.getItem('grotto-season')).toBe('s-active')
  })

  it('mùa đã lưu không còn tồn tại (bị xoá / giáo xứ khác) → quay về mặc định', () => {
    localStorage.setItem('grotto-season', 'season-cu-khong-con')
    renderApp()

    expect(seasonIdText()).toBe('s-active')
    expect(localStorage.getItem('grotto-season')).toBe('s-active')
  })
})
