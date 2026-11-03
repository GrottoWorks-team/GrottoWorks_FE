// Fetch wrapper chuẩn: hỗ trợ /api/v1 và /api, unwrap envelope { data },
// Bearer token + Refresh Token rotation, ProblemDetails error parsing.
// 401 khi không refresh được → dispatch 'grotto:unauthorized' để App logout.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let isRefreshing = false

/** Bóc envelope `{ data, meta }` — dùng chung cho mọi endpoint BE. */
function unwrap<T>(body: unknown): T {
  if (body !== null && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as { data: T }).data
  }
  return body as T
}

/**
 * Gọi API và trả NGUYÊN body (không bóc `data`) để giữ metadata phân trang.
 * `PagedResponse` của BE = `{ data: T[], page: { page, size, totalItems, totalPages }, meta }`.
 */
async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('grotto-token')
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const fullPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`
  const url = location.origin + fullPath

  const res = await fetch(url, { ...init, headers })

  if (!res.ok) {
    if (res.status === 401) {
      const refreshToken = localStorage.getItem('grotto-refresh-token')
      if (refreshToken && !path.includes('/auth/refresh') && !path.includes('/auth/login') && !isRefreshing) {
        isRefreshing = true
        try {
          const refreshRes = await fetch(location.origin + '/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          })
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            const tokenPair = refreshData?.data ?? refreshData
            if (tokenPair?.accessToken) {
              localStorage.setItem('grotto-token', tokenPair.accessToken)
              if (tokenPair.refreshToken) {
                localStorage.setItem('grotto-refresh-token', tokenPair.refreshToken)
              }
              headers.set('Authorization', `Bearer ${tokenPair.accessToken}`)
              isRefreshing = false
              const retryRes = await fetch(url, { ...init, headers })
              if (retryRes.ok) {
                if (retryRes.status === 204) return undefined as T
                return (await retryRes.json()) as T
              }
            }
          }
        } catch {
          // refresh failure handled below
        } finally {
          isRefreshing = false
        }
      }

      if (token) {
        localStorage.removeItem('grotto-token')
        localStorage.removeItem('grotto-refresh-token')
        window.dispatchEvent(new Event('grotto:unauthorized'))
      }
    }

    let message = `${res.status} ${res.statusText}`
    let code: string | undefined
    let errors: Record<string, string[]> | undefined

    try {
      const body = (await res.json()) as any
      if (body) {
        code = body.code
        errors = body.errors
        if (body.detail) message = body.detail
        else if (body.message) message = body.message
        else if (body.title) message = body.title
        else if (body.errors) {
          const flat = Object.values(body.errors).flat() as string[]
          if (flat.length) message = flat.join(', ')
        }
      }
    } catch {
      // Body không phải JSON
    }

    throw new ApiError(res.status, message, code, errors)
  }

  if (res.status === 204) return undefined as T

  return (await res.json()) as T
}

/** Gọi API và bóc envelope `data` (mặc định cho hầu hết endpoint). */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return unwrap<T>(await request(path, init))
}

export interface PageMetaDto {
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/**
 * Gọi endpoint paged và GIỮ `page` (totalItems/totalPages). Không có `page`
 * (endpoint trả mảng thẳng) → `page: null` để caller tự xử lý.
 */
export async function apiPaged<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T[]; page: PageMetaDto | null }> {
  const body = await request<{ data?: T[]; page?: PageMetaDto } | T[]>(path, init)
  if (Array.isArray(body)) return { data: body, page: null }
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    page: body?.page ?? null,
  }
}
