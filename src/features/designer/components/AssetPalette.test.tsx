import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AssetPalette } from './AssetPalette'

describe('AssetPalette Component', () => {
  it('render 4 tab danh mục cấu kiện chuẩn', () => {
    render(<AssetPalette onSelectAsset={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /Vách đá/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /Tượng ảnh/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /Ánh sáng/i })).toBeDefined()
    expect(screen.getByRole('tab', { name: /Trang trí/i })).toBeDefined()
  })

  it('lọc danh sách cấu kiện theo ô tìm kiếm', () => {
    render(<AssetPalette onSelectAsset={vi.fn()} />)

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm cấu kiện/i)
    fireEvent.change(searchInput, { target: { value: 'Bê-lem' } })

    // Vòm đá chính Bê-lem hoặc Sao Bê-lem xuất hiện
    expect(screen.getByText(/Vòm đá chính Bê-lem/i)).toBeDefined()
  })

  it('gọi callback onSelectAsset khi click vào cấu kiện', () => {
    const handleSelect = vi.fn()
    render(<AssetPalette onSelectAsset={handleSelect} />)

    const archBtn = screen.getByText(/Vòm đá chính Bê-lem/i)
    fireEvent.click(archBtn)

    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: 'rock-arch-main' }),
    )
  })
})
