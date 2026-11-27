// 26/11/2026: BE đọc query rất chặt (API Contract 4.4 — Services/*/Api/Common/QueryReader.cs):
// `size` chỉ nhận 1–100, vượt là 400 INVALID_PAGE_SIZE. Trước đây vài dialog xin `size: 200`
// nên request fail âm thầm và danh sách chọn vật tư hiện rỗng.
export const MAX_PAGE_SIZE = 100

/** Ghép query string, bỏ qua giá trị rỗng. */
export function withQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
