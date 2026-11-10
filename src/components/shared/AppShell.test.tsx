import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './AppShell'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'PARISH', name: 'Admin Demo' },
    logout: vi.fn(),
  }),
}))

vi.mock('@/features/notifications/api', () => ({
  useNotificationFeed: () => ({ items: [], isPending: false }),
  useMarkNotificationRead: () => ({ mutate: vi.fn() }),
  useMarkAllNotificationsRead: () => ({ mutate: vi.fn() }),
}))

vi.mock('@/features/notifications/seen', () => ({
  useSeenIds: () => [],
}))

function renderAppShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppShell role="PARISH" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AppShell sidebar collapse', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('mặc định mở khi màn rộng (aside có w-64, hiện nhãn menu)', () => {
    const { container } = renderAppShell()
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('w-64')
    expect(aside?.className).not.toContain('w-[72px]')
    expect(screen.getByText('Mùa Giáng sinh')).toBeDefined()
  })

  it('bấm nút → aside có class w-[72px], nhãn menu biến mất', async () => {
    const user = userEvent.setup()
    const { container } = renderAppShell()
    const aside = container.querySelector('aside')

    const toggleBtn = screen.getByRole('button', { name: /thu gọn thanh bên/i })
    expect(toggleBtn).toBeDefined()

    await user.click(toggleBtn)

    expect(aside?.className).toContain('w-[72px]')
    expect(aside?.className).not.toContain('w-64')
    expect(screen.queryByText('Mùa Giáng sinh')).toBeNull()
  })

  it('bấm lần nữa → trở lại w-64', async () => {
    const user = userEvent.setup()
    const { container } = renderAppShell()
    const aside = container.querySelector('aside')

    const toggleBtn = screen.getByRole('button', { name: /thu gọn thanh bên/i })
    await user.click(toggleBtn)
    expect(aside?.className).toContain('w-[72px]')

    const expandBtn = screen.getByRole('button', { name: /mở rộng thanh bên/i })
    await user.click(expandBtn)
    expect(aside?.className).toContain('w-64')
    expect(screen.getByText('Mùa Giáng sinh')).toBeDefined()
  })

  it("localStorage['grotto-sidebar-collapsed'] được ghi đúng '1' / '0'", async () => {
    const user = userEvent.setup()
    renderAppShell()

    const toggleBtn = screen.getByRole('button', { name: /thu gọn thanh bên/i })
    await user.click(toggleBtn)
    expect(localStorage.getItem('grotto-sidebar-collapsed')).toBe('1')

    const expandBtn = screen.getByRole('button', { name: /mở rộng thanh bên/i })
    await user.click(expandBtn)
    expect(localStorage.getItem('grotto-sidebar-collapsed')).toBe('0')
  })
})
