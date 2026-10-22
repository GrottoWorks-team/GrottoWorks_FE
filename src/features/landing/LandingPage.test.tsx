import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from './LandingPage'

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('hiển thị hero, khu vực công tác và khung QR tải app', () => {
    renderLanding()
    expect(screen.getByText('Nền tảng điều phối mùa Giáng Sinh giáo xứ')).toBeDefined()
    expect(screen.getByText('Cùng giáo xứ kiến tạo', { exact: false })).toBeDefined()
    expect(screen.getByText('Năm khu vực trọng điểm của một mùa Giáng Sinh')).toBeDefined()
    expect(screen.getByText('Hang đá Giáng Sinh')).toBeDefined()
    // "Sân khấu diễn nguyện" xuất hiện ở cả thẻ hero lẫn dải khu vực.
    expect(screen.getAllByText('Sân khấu diễn nguyện').length).toBeGreaterThan(0)
  })

  it('có khung QR tải ứng dụng và liên kết đăng ký', () => {
    renderLanding()
    expect(screen.getByAltText('Mã QR tải ứng dụng GrottoWorks')).toBeDefined()
    expect(screen.getByText('Quét mã để tải ứng dụng')).toBeDefined()
    expect(
      screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/join'),
    ).toBe(true)
  })
})
