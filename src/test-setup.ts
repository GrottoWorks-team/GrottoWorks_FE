// Setup chung cho vitest: i18n (useTranslation cần instance đã init) + cleanup RTL.
import { afterEach, vi } from 'vitest'
import '@/lib/i18n'
import { cleanup } from '@testing-library/react'

// jsdom chưa có ResizeObserver — recharts ResponsiveContainer cần (dashboard
// BarChart/PieChart trong test). Stub tức thì: kích thước 0 → chart vẫn vẽ
// SVG, count-up/tooltip không crash.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = window.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver)

// jsdom không có matchMedia. Mock prefers-reduced-motion → matches cho MỌI test:
// StatCard count-up đặt giá trị ngay (không rAF 700ms chậm/flaky dưới tải —
// ReportPage từng vượt timeout), animation CSS cũng tắt.
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: query.includes('prefers-reduced-motion'),
  media: query,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia

afterEach(() => cleanup())
