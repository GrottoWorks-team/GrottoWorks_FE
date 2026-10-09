import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import { NAV } from '@/components/shared/nav-config'

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('chưa có phiên → chuyển hướng sang trang đăng nhập', async () => {
    render(<App />)
    expect(await screen.findByLabelText('Email')).toBeDefined()
    expect(screen.getByLabelText('Mật khẩu')).toBeDefined()
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
