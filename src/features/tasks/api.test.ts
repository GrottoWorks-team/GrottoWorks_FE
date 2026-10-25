import { expect, test } from 'vitest'
import { mapTaskDtoToTask, type TaskDto } from './api'

const base: TaskDto = {
  id: 't1',
  workAreaId: 'a1',
  name: 'Việc A',
  description: null,
  completionCriteria: null,
  taskType: 'WORK',
  purchaseRequestId: null,
  priority: 'MEDIUM',
  estimatedMinutes: 60,
  requiredVolunteers: 1,
  startAt: null,
  deadline: '2026-11-01T00:00:00Z',
  status: 'OPEN',
  version: 1,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: null,
}

test('OPEN (chưa ai nhận) map thành TODO', () => {
  expect(mapTaskDtoToTask({ ...base, status: 'OPEN' }).status).toBe('TODO')
})

test('NOT_STARTED (đã chốt tuyển) map thành READY, KHÔNG gộp vào TODO', () => {
  expect(mapTaskDtoToTask({ ...base, status: 'NOT_STARTED' }).status).toBe('READY')
})



// Test that (thay cho test rong cua Task 2): chay hook that qua renderHook,
// bat fetch that, khang dinh URL + method + header If-Match.
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

test('useMarkTaskReady goi dung POST /api/v1/tasks/{id}/ready kem If-Match', async () => {
  const seen: Array<{ url: string; method?: string; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { ...base, status: 'NOT_STARTED', version: 7 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useMarkTaskReady } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useMarkTaskReady(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })

    await result.current.mutateAsync({ id: 'abc', version: 6 })
    await waitFor(() => expect(seen.length).toBe(1))

    expect(seen[0].url).toContain('/api/v1/tasks/abc/ready')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].ifMatch).toBe('"6"')
  } finally {
    globalThis.fetch = origFetch
  }
})
