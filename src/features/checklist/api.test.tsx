// Toggle checklist end-to-end qua hook (msw + renderHook): PATCH done
// cho từng mục còn thiếu của khu a1 → GET verify mọi mục done và
// useChecklistProgress (computed client-side) báo 100%.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'
import { useChecklistProgress, useToggleItem } from './api'
import type { ChecklistItem } from '@/types'

const base = location.origin

const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)

test('toggle all undone items of area a1 → everything done, progress 100%', async () => {
  // Seed a1: cl1, cl5 done; cl2, cl3, cl4 chưa.
  const { result: toggle } = renderHook(() => useToggleItem(), { wrapper })
  for (const id of ['cl2', 'cl3', 'cl4']) {
    await act(async () => {
      await toggle.current.mutateAsync({ id, done: true })
    })
  }

  const items = (await (await fetch(`${base}/api/checklists`)).json()) as ChecklistItem[]
  const a1 = items.filter((x) => x.areaId === 'a1')
  expect(a1.length).toBe(5)
  expect(a1.every((x) => x.done)).toBe(true)

  // Progress computed từ data sau khi mutation invalidate cache.
  const { result } = renderHook(() => useChecklistProgress('a1'), { wrapper })
  await waitFor(() => expect(result.current.isPending).toBe(false))
  expect(result.current.done).toBe(5)
  expect(result.current.total).toBe(5)
  expect(result.current.percent).toBe(100)
})
