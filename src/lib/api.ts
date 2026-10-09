// Fetch wrapper chuẩn: prefix '/api', gắn Content-Type + Bearer token
// (localStorage 'grotto-token'), throw ApiError khi !res.ok.
// 401 khi đang có token → dispatch 'grotto:unauthorized' để App logout + về /login.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('grotto-token')
  // Headers instance: accept mọi dạng init.headers (record/array/Headers),
  // set auth SAU để caller không override mất Bearer token.
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // URL tuyệt đối: fetch của Node (vitest) không nhận URL tương đối.
  const res = await fetch(location.origin + '/api' + path, { ...init, headers })
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('grotto:unauthorized'))
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      // body không phải JSON
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
