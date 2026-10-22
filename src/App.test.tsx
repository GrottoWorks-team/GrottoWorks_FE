import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { NAV } from '@/components/shared/nav-config'

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('chưa có phiên → hiển thị trang landing công khai', async () => {
    render(<App />)
    // Landing là lazy route: chờ hero render xong (badge là text duy nhất).
    expect(
      await screen.findByText('Nền tảng điều phối mùa Giáng Sinh giáo xứ'),
    ).toBeDefined()
    expect(screen.getByText('Đăng nhập')).toBeDefined()
    // Landing có liên kết tới trang đăng ký đồng hành.
    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/join'),
    ).toBe(true)
  })

  it('route lạ → trang 404', async () => {
    window.history.pushState({}, '', '/khong-ton-tai')
    render(<App />)
    expect(await screen.findByText('Không tìm thấy trang')).toBeDefined()
  })

  it('NAV: COMMUNITY có seasons, areas, support, checklist, reports, volunteers và PARISH có seasons, areas, purchases', () => {
    const commItems = NAV.COMMUNITY.flatMap((g) => g.items)
    const commPaths = commItems.map((i) => i.to)
    expect(commPaths).toContain('/community')
    expect(commPaths).toContain('/community/seasons')
    expect(commPaths).toContain('/community/areas')
    expect(commPaths).toContain('/community/volunteers')
    expect(commPaths).toContain('/community/support')
    expect(commPaths).toContain('/community/checklist')
    expect(commPaths).toContain('/community/reports')
    expect(commPaths).not.toContain('/community/purchases')

    const parishItems = NAV.PARISH.flatMap((g) => g.items)
    const parishPaths = parishItems.map((i) => i.to)
    expect(parishPaths).toContain('/parish/seasons')
    expect(parishPaths).toContain('/parish/areas')
    expect(parishPaths).toContain('/parish/purchases')
  })
})
