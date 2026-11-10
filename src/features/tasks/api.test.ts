import { expect, test } from 'vitest'
import { mapTaskDtoToTask, type TaskDto } from './api'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

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

// ══════════════════════════════════════════════════════════════════════════════
// Đợt A: Test các hooks mới (11 route)
// ══════════════════════════════════════════════════════════════════════════════

test('Đợt A: useApproveTaskApplication gọi đúng POST /api/v1/task-applications/{id}/approve kèm If-Match', async () => {
  const seen: Array<{ url: string; method?: string; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { id: 'as-1', status: 'ACCEPTED' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useApproveTaskApplication } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useApproveTaskApplication(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })

    await result.current.mutateAsync({ applicationId: 'app-99', version: 2 })
    await waitFor(() => expect(seen.length).toBe(1))

    expect(seen[0].url).toContain('/api/v1/task-applications/app-99/approve')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].ifMatch).toBe('"2"')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Đợt A: useRejectTaskApplication gọi đúng POST /api/v1/task-applications/{id}/reject kèm body và If-Match', async () => {
  const seen: Array<{ url: string; method?: string; body?: any; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { id: 'app-99', status: 'REJECTED' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useRejectTaskApplication } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useRejectTaskApplication(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })

    await result.current.mutateAsync({
      applicationId: 'app-99',
      reason: 'Thiếu kỹ năng phù hợp',
      version: 3,
    })
    await waitFor(() => expect(seen.length).toBe(1))

    expect(seen[0].url).toContain('/api/v1/task-applications/app-99/reject')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].ifMatch).toBe('"3"')
    expect(seen[0].body.reason).toBe('Thiếu kỹ năng phù hợp')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Đợt A: useCancelTask gọi đúng POST /api/v1/tasks/{id}/cancel kèm body và If-Match', async () => {
  const seen: Array<{ url: string; method?: string; body?: any; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { ...base, status: 'CANCELLED' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useCancelTask } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useCancelTask(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })

    await result.current.mutateAsync({
      taskId: 'task-77',
      reason: 'Thay đổi phương án thi công',
      version: 5,
    })
    await waitFor(() => expect(seen.length).toBe(1))

    expect(seen[0].url).toContain('/api/v1/tasks/task-77/cancel')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].ifMatch).toBe('"5"')
    expect(seen[0].body.reason).toBe('Thay đổi phương án thi công')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Đợt A: useSetTaskTeamLeader và useClearTaskTeamLeader gọi đúng PUT / DELETE team-leader', async () => {
  const seen: Array<{ url: string; method?: string; body?: any; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { ...base, teamLeaderAssignmentId: 'as-lead' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useSetTaskTeamLeader, useClearTaskTeamLeader } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const setHook = renderHook(() => useSetTaskTeamLeader(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })
    await setHook.result.current.mutateAsync({
      taskId: 'task-88',
      teamLeaderAssignmentId: 'as-lead',
      version: 4,
    })

    const clearHook = renderHook(() => useClearTaskTeamLeader(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })
    await clearHook.result.current.mutateAsync({
      taskId: 'task-88',
      version: 5,
    })

    await waitFor(() => expect(seen.length).toBe(2))

    expect(seen[0].url).toContain('/api/v1/tasks/task-88/team-leader')
    expect(seen[0].method).toBe('PUT')
    expect(seen[0].ifMatch).toBe('"4"')
    expect(seen[0].body.teamLeaderAssignmentId).toBe('as-lead')

    expect(seen[1].url).toContain('/api/v1/tasks/task-88/team-leader')
    expect(seen[1].method).toBe('DELETE')
    expect(seen[1].ifMatch).toBe('"5"')
    expect(seen[1].body).toBeNull()
  } finally {
    globalThis.fetch = origFetch
  }
})

test('Đợt A: useApproveTaskCompletion và useRequestTaskRevision gọi đúng approve / request-revision', async () => {
  const seen: Array<{ url: string; method?: string; body?: any; ifMatch?: string | null }> = []
  const origFetch = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.push({
      url: String(input),
      method: init?.method,
      body: init?.body ? JSON.parse(String(init.body)) : null,
      ifMatch: new Headers(init?.headers).get('If-Match'),
    })
    return new Response(JSON.stringify({ data: { ...base, status: 'COMPLETED' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const { useApproveTaskCompletion, useRequestTaskRevision } = await import('./api')
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const approveHook = renderHook(() => useApproveTaskCompletion(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })
    await approveHook.result.current.mutateAsync({
      taskId: 'task-99',
      reason: 'Đạt yêu cầu nghiệm thu',
      version: 2,
    })

    const revisionHook = renderHook(() => useRequestTaskRevision(), {
      wrapper: ({ children }) => React.createElement(QueryClientProvider, { client: qc }, children),
    })
    await revisionHook.result.current.mutateAsync({
      taskId: 'task-99',
      reason: 'Cần gia cố thêm khung sắt',
      version: 3,
    })

    await waitFor(() => expect(seen.length).toBe(2))

    expect(seen[0].url).toContain('/api/v1/tasks/task-99/approve')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].ifMatch).toBe('"2"')
    expect(seen[0].body.reason).toBe('Đạt yêu cầu nghiệm thu')

    expect(seen[1].url).toContain('/api/v1/tasks/task-99/request-revision')
    expect(seen[1].method).toBe('POST')
    expect(seen[1].ifMatch).toBe('"3"')
    expect(seen[1].body.reason).toBe('Cần gia cố thêm khung sắt')
  } finally {
    globalThis.fetch = origFetch
  }
})
