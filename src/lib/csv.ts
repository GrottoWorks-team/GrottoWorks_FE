// Xuất CSV mở được bằng Excel tiếng Việt: BOM UTF-8 + delimiter ';' +
// escape quote theo RFC 4180. Task 11 (báo cáo) dùng lại.
export function exportCsv(filename: string, rows: Record<string, string | number>[]): void {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const esc = (v: string | number) => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(';')),
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
