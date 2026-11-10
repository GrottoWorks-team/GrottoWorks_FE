import { expect, test } from 'vitest'
import {
  attachReadinessEvidence,
  confirmAreaReadiness,
  createReadinessCheck,
  getReadinessCheck,
  getReadinessEvidenceDownloadUrl,
  getSeasonReadiness,
  linkCorrectiveTask,
  recheckReadinessItem,
  recordReadinessResult,
  reopenReadinessCheck,
  replaceReadinessItems,
} from './api'

test('getReadinessCheck calls GET /api/v1/readiness-checks/{id}', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'GET'
    return new Response(
      JSON.stringify({
        data: {
          id: 'check-1',
          workAreaId: 'area-1',
          workAreaName: 'Khu Bê-lem',
          seasonId: 'season-1',
          name: 'Kiểm tra an toàn kết cấu',
          status: 'Planning',
          items: [],
          version: 1,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await getReadinessCheck('check-1')
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1')
    expect(calledMethod).toBe('GET')
    expect(res.id).toBe('check-1')
    expect(res.name).toBe('Kiểm tra an toàn kết cấu')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('getSeasonReadiness calls GET /api/v1/seasons/{seasonId}/readiness', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledUrl = String(input)
    return new Response(
      JSON.stringify({
        data: {
          seasonId: 'season-1',
          workAreas: 3,
          readyWorkAreas: 2,
          areas: [],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await getSeasonReadiness('season-1')
    expect(calledUrl).toContain('/api/v1/seasons/season-1/readiness')
    expect(res.readyWorkAreas).toBe(2)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('createReadinessCheck calls POST /api/v1/work-areas/{id}/readiness-checks with Idempotency-Key', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''
  let idempotencyKey: string | null = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'GET'
    idempotencyKey = new Headers(init?.headers).get('Idempotency-Key')
    return new Response(
      JSON.stringify({
        data: {
          id: 'check-created',
          workAreaId: 'area-1',
          workAreaName: 'Khu Bê-lem',
          seasonId: 'season-1',
          name: 'Danh mục mới',
          status: 'Planning',
          items: [],
          version: 1,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await createReadinessCheck('area-1', {
      name: 'Danh mục mới',
      items: [{ name: 'Hạng mục 1', mandatory: true }],
    })
    expect(calledUrl).toContain('/api/v1/work-areas/area-1/readiness-checks')
    expect(calledMethod).toBe('POST')
    expect(idempotencyKey).toBeTruthy()
    expect(res.id).toBe('check-created')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('replaceReadinessItems calls PUT /items with If-Match header', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''
  let ifMatch: string | null = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'GET'
    ifMatch = new Headers(init?.headers).get('If-Match')
    return new Response(
      JSON.stringify({
        data: {
          id: 'check-1',
          version: 2,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    await replaceReadinessItems('check-1', 1, [{ name: 'Đo điện', mandatory: true }])
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/items')
    expect(calledMethod).toBe('PUT')
    expect(ifMatch).toBe('"1"')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('recordReadinessResult calls PUT /items/{itemId} with If-Match header', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''
  let ifMatch: string | null = null
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'GET'
    ifMatch = new Headers(init?.headers).get('If-Match')
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'item-1',
          name: 'Hàn khung',
          status: 'Passed',
          checkVersion: 3,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await recordReadinessResult('check-1', 'item-1', 2, {
      result: 'Passed',
      note: 'Đã hàn gia cố đạt chuẩn',
    })
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/items/item-1')
    expect(calledMethod).toBe('PUT')
    expect(ifMatch).toBe('"2"')
    expect(bodyJson.result).toBe('Passed')
    expect(bodyJson.version).toBe(2)
    expect(res.status).toBe('Passed')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('attachReadinessEvidence calls POST /items/{itemId}/evidence', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'GET'
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'item-1',
          evidenceFileIds: ['file-1', 'file-2'],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await attachReadinessEvidence('check-1', 'item-1', ['file-1', 'file-2'])
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/items/item-1/evidence')
    expect(calledMethod).toBe('POST')
    expect(bodyJson).toEqual([{ id: 'file-1' }, { id: 'file-2' }])
    expect(res.evidenceFileIds).toEqual(['file-1', 'file-2'])
  } finally {
    globalThis.fetch = origFetch
  }
})

test('linkCorrectiveTask calls PUT /items/{itemId}/corrective-task with If-Match header', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let ifMatch: string | null = null
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    ifMatch = new Headers(init?.headers).get('If-Match')
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'item-1',
          correctiveTaskId: 'task-corr-1',
          status: 'CorrectiveAction',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    await linkCorrectiveTask('check-1', 'item-1', 4, 'task-corr-1')
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/items/item-1/corrective-task')
    expect(ifMatch).toBe('"4"')
    expect(bodyJson.taskId).toBe('task-corr-1')
    expect(bodyJson.version).toBe(4)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('recheckReadinessItem calls POST /items/{itemId}/recheck with If-Match header', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let calledMethod = ''
  let ifMatch: string | null = null
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    calledMethod = init?.method || 'POST'
    ifMatch = new Headers(init?.headers).get('If-Match')
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'item-1',
          status: 'Passed',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    await recheckReadinessItem('check-1', 'item-1', 5, {
      result: 'Passed',
      note: 'Kiểm tra lại sau khi sửa đã đạt',
    })
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/items/item-1/recheck')
    expect(calledMethod).toBe('POST')
    expect(ifMatch).toBe('"5"')
    expect(bodyJson.version).toBe(5)
  } finally {
    globalThis.fetch = origFetch
  }
})

test('confirmAreaReadiness calls POST /confirm with If-Match header', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let ifMatch: string | null = null
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    ifMatch = new Headers(init?.headers).get('If-Match')
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'check-1',
          status: 'Ready',
          version: 6,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await confirmAreaReadiness('check-1', 5)
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/confirm')
    expect(ifMatch).toBe('"5"')
    expect(bodyJson.version).toBe(5)
    expect(res.status).toBe('Ready')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('reopenReadinessCheck calls POST /reopen with If-Match header and reason', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''
  let ifMatch: string | null = null
  let bodyJson: any = null

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calledUrl = String(input)
    ifMatch = new Headers(init?.headers).get('If-Match')
    bodyJson = JSON.parse(String(init?.body))
    return new Response(
      JSON.stringify({
        data: {
          id: 'check-1',
          status: 'Reopened',
          reopenReason: 'Phát hiện sự cố rò rỉ điện cần kiểm tra lại',
          version: 7,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await reopenReadinessCheck(
      'check-1',
      6,
      'Phát hiện sự cố rò rỉ điện cần kiểm tra lại',
    )
    expect(calledUrl).toContain('/api/v1/readiness-checks/check-1/reopen')
    expect(ifMatch).toBe('"6"')
    expect(bodyJson.version).toBe(6)
    expect(bodyJson.reason).toBe('Phát hiện sự cố rò rỉ điện cần kiểm tra lại')
    expect(res.status).toBe('Reopened')
  } finally {
    globalThis.fetch = origFetch
  }
})

test('getReadinessEvidenceDownloadUrl calls download-url endpoint', async () => {
  const origFetch = globalThis.fetch
  let calledUrl = ''

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledUrl = String(input)
    return new Response(
      JSON.stringify({
        data: {
          downloadUrl: 'https://storage.grottoworks.local/evidence.jpg',
          fileName: 'evidence.jpg',
          expiresAtUtc: '2026-11-12T00:00:00Z',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  try {
    const res = await getReadinessEvidenceDownloadUrl('check-1', 'item-1', 'file-1')
    expect(calledUrl).toContain(
      '/api/v1/readiness-checks/check-1/items/item-1/evidence/file-1/download-url',
    )
    expect(res.downloadUrl).toBe('https://storage.grottoworks.local/evidence.jpg')
  } finally {
    globalThis.fetch = origFetch
  }
})
