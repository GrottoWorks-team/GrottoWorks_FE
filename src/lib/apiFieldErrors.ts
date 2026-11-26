// Lỗi theo trường từ BE (ProblemDetails `errors`) → map để hiện dưới đúng ô nhập.
// Giữ nguyên nội dung form: chỉ hiện lỗi, không reset dữ liệu người dùng đã nhập.
import { ApiError } from './api'

export type FieldErrors = Record<string, string>

export function fieldErrorsOf(error: unknown): FieldErrors {
  if (!(error instanceof ApiError) || !error.errors) return {}
  const out: FieldErrors = {}
  for (const [key, messages] of Object.entries(error.errors)) {
    const message = messages.filter(Boolean).join(' ').trim()
    if (!message) continue
    out[key] = message
    out[key.toLowerCase()] = message
  }
  return out
}

const normalise = (value: string) => value.replace(/\[(\d+)\]/g, '.$1').toLowerCase()

/**
 * Tìm thông báo lỗi cho một ô: khớp đúng tên, hoặc khớp phần cuối
 * (`items[0].requestedQuantity` ↔ `requestedQuantity`).
 */
export function fieldError(errors: FieldErrors, ...names: Array<string | undefined>): string | undefined {
  const needles = names.filter(Boolean).map((n) => normalise(n as string))
  for (const [key, message] of Object.entries(errors)) {
    const normalisedKey = normalise(key)
    if (needles.includes(normalisedKey)) return message
  }
  for (const [key, message] of Object.entries(errors)) {
    const normalisedKey = normalise(key)
    if (needles.some((needle) => normalisedKey.endsWith(needle))) return message
  }
  return undefined
}
