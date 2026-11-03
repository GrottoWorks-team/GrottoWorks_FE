import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/components/ui/toast'
import ReportPage from './ReportPage'
import type { ReportData } from '../api'

const mockReport: ReportData = {
  reportType: 'TASKS',
  parishId: 'p1',
  seasonId: 's1',
  generatedAt: '2026-10-30T10:00:00+00:00',
  generatedBy: 'u1',
  scope: 'PARISH',
  filters: { seasonId: 's1' },
  columns: [
    { key: 'taskName', label: 'Nhiệm vụ' },
    { key: 'hours', label: 'Giờ', unit: 'h' },
  ],
  rows: [
    { taskName: 'Xây nền hang đá', hours: 10 },
    { taskName: 'Lắp đèn', hours: 4 },
  ],
  totals: { hours: 14 },
  notes: ['Số liệu tính đến hết mùa.'],
}

vi.mock('@/features/season/api', () => ({
  useSeasons: () => ({ data: [{ id: 's1', name: 'Mùa Giáng sinh 2026' }] }),
}))

vi.mock('@/features/areas/api', () => ({
  useScopedAreas: () => ({ data: [] }),
}))

vi.mock('../api', () => ({
  useReportData: () => ({ data: mockReport, isPending: false, isError: false }),
}))

test('render động theo columns/rows/totals của ReportDataDto', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ReportPage />
      </ToastProvider>
    </QueryClientProvider>,
  )

  expect(await screen.findByText('Xây nền hang đá')).toBeDefined()
  expect(screen.getByText('Lắp đèn')).toBeDefined()
  expect(screen.getAllByText('Nhiệm vụ').length).toBeGreaterThan(0)
  expect(screen.getByText('Giờ (h)')).toBeDefined()
  expect(screen.getByText('Số liệu tính đến hết mùa.')).toBeDefined()
  expect(screen.getByText('Tổng')).toBeDefined()
  expect(screen.getByText('14')).toBeDefined()
})