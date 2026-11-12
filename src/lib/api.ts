// Fetch wrapper chuẩn: hỗ trợ /api/v1 và /api, unwrap envelope { data },
// Bearer token + Refresh Token rotation, ProblemDetails error parsing.
// 401 khi không refresh được → dispatch 'grotto:unauthorized' để App logout.
import i18n from '@/lib/i18n'

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

/**
 * Mã lỗi nghiệp vụ BE (`body.code`) → câu tiếng Việt/Anh dễ hiểu.
 *
 * Thứ tự tra (12/11/2026 — đồng bộ toàn bộ mã BE, xem `tools/audit-error-codes.mjs`):
 *   1. `errors.<CODE>`  — câu soạn riêng cho mã đó (ưu tiên, sát ngữ cảnh nhất).
 *   2. `errorsByKind.<kind>` — câu theo NHÓM hậu tố (`_NOT_FOUND`, `_INVALID_STATE`, …) để mã
 *      mới BE thêm sau này vẫn ra tiếng Việt, không lộ `detail` tiếng Anh.
 *   3. `undefined` — nơi gọi giữ `detail` của BE (chính xác nhất nhưng tiếng Anh).
 */
const KIND_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/(_VERSION_MISMATCH|^INVALID_IF_MATCH|^SOURCE_VERSION_INVALID)$/, 'versionConflict'],
  [/(_NOT_FOUND|_UNKNOWN)$/, 'notFound'],
  [/(_REASON_REQUIRED|_NOTE_REQUIRED|_REQUIRED|_ID_REQUIRED)$/, 'required'],
  [/(_INVALID_STATE|_NOT_OPEN|_NOT_READY|_NOT_COMPLETED|_NOT_ACCEPTED|_NOT_APPROVED|_NOT_LOCKED)$/, 'invalidState'],
  [/(_ACCESS_DENIED|_SCOPE_DENIED|_DENIED|^FORBIDDEN|^UNAUTHENTICATED)$/, 'denied'],
  [/(_ALREADY_EXISTS|_EXISTS|_DUPLICATE|_CONFLICT|_ALREADY_POSTED|_ALREADY_RECORDED|_ALREADY_RECEIVED|_ALREADY_LINKED|_ALREADY_LOCKED|_RESERVED|_ATTACHED)$/, 'conflict'],
  [/(_UNAVAILABLE|_SERVICE_UNAVAILABLE|_STORAGE_UNAVAILABLE)$/, 'unavailable'],
  [/(_TOO_LONG|_TOO_MANY|_LIMIT_EXCEEDED|_LIMIT|_EXCEEDED|CAPACITY)/, 'tooMany'],
  [/(_PENDING|_IN_PROGRESS|_SYNC_PENDING)$/, 'pending'],
  [/(_MISMATCH|_INVALID|_INVALID_RANGE|_DATE_RANGE_INVALID|_OUT_OF_SEASON|_OUT_OF_WORK_AREA|_IN_FUTURE|_IN_PAST|^INVALID_)/, 'invalid'],
]

export function translateCode(code?: string): string | undefined {
  if (!code) return undefined
  const exact = `errors.${code}`
  if (i18n.exists(exact)) return i18n.t(exact) as string
  for (const [pattern, kind] of KIND_RULES) {
    if (!pattern.test(code)) continue
    const key = `errorsByKind.${kind}`
    if (i18n.exists(key)) return i18n.t(key) as string
  }
  return undefined
}

/** Nhãn ngắn của mã lỗi để hiển thị kèm khi cần đối chiếu log (`WORK_AREA_NOT_FOUND`). */
export function errorCodeLabel(error: unknown): string | undefined {
  return error instanceof ApiError && error.code ? error.code : undefined
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

    message = translateCode(code) ?? message

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
