// F-06 (ratchet): không thêm chuỗi tiếng Việt cứng trong màn hình.
// Test chạy trong CI (vitest) nên bất kỳ copy mới hard-code sẽ fail merge.
//
// Quy ước: mọi copy đi qua `t()`/`i18n.t()`. Dữ liệu thật (tên đơn vị vật tư,
// giá trị gửi BE) và chú thích không bị tính.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { expect, test } from 'vitest'

// vitest chạy từ gốc project (jsdom không có import.meta.url dạng file://).
const SRC = join(process.cwd(), 'src')

/** Dữ liệu thật, không phải copy trên giao diện. */
const ALLOWED_FILES = new Set([
  // Danh mục đơn vị vật tư (giá trị lưu vào BE, không dịch).
  'features/parish/pages/CategoriesPage.tsx',
])

const VIETNAMESE = /[àáảãạăâđêôơưýỳỷỹỵÀÁẢÃẠĂÂĐÊÔƠƯÝỲỶỸỴ]/

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'locales' || entry.name === 'node_modules') continue
      walk(path, out)
    } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
      out.push(path)
    }
  }
  return out
}

/** Bỏ chú thích để không bắt nhầm ghi chú tiếng Việt. */
function stripComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\/[^\n]*/g, '')
}

test('không có chuỗi tiếng Việt cứng trong màn hình (.tsx)', () => {
  const offenders: string[] = []
  for (const file of walk(SRC)) {
    const relativePath = relative(SRC, file).split('\\').join('/')
    if (ALLOWED_FILES.has(relativePath)) continue
    const lines = stripComments(readFileSync(file, 'utf8')).split(/\r?\n/)
    lines.forEach((line, index) => {
      if (!VIETNAMESE.test(line)) return
      if (/t\(|i18n\.t\(|defaultValue/.test(line)) return
      // Chỉ tính dòng có chuỗi/JSX text, không tính định danh code thuần.
      if (!/["'`>]/.test(line)) return
      offenders.push(`${relative}:${index + 1}`)
    })
  }
  expect(offenders.slice(0, 20)).toEqual([])
})
