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

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
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
                const retryBody = await retryRes.json()
                return (retryBody && typeof retryBody === 'object' && 'data' in retryBody ? retryBody.data : retryBody) as T
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

  const body = (await res.json()) as any
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body.data as T
  }
  return body as T
}
