// exportCsv (src/lib/csv.ts): BOM UTF-8 + delimiter ';' + escape RFC 4180.
// jsdom không có URL.createObjectURL → stub để bắt Blob; chặn navigation
// bằng spy trên HTMLAnchorElement.click.
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { exportCsv } from './csv'

let captured: Blob | null = null
let clicked: HTMLAnchorElement | null = null
// jsdom Blob thiếu .text(); FileReader.readAsText lại strip BOM theo spec
// UTF-8 → đọc ArrayBuffer rồi tự decode để thấy được byte BOM.
const blobBytes = (b: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const fr = new FileReader()
    fr.onload = () => resolve(new Uint8Array(fr.result as ArrayBuffer))
    fr.readAsArrayBuffer(b)
  })
const blobText = (bytes: Uint8Array) =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes).replace(/^\uFEFF/, '')

beforeEach(() => {
  captured = null
  clicked = null
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((b: Blob) => {
      captured = b
      return 'blob:mock'
    }),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked = this
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('filename + BOM + delimiter ";" + escape ";"/quote/newline theo RFC 4180', async () => {
  exportCsv('bao-cao.csv', [
    { Cot: 'a;b' },
    { Cot: 'nói "xin chào"' },
    { Cot: 'dòng\nxuống' },
    { Cot: 'trơn' },
  ])
  expect(URL.createObjectURL).toHaveBeenCalledOnce()
  expect(clicked?.download).toBe('bao-cao.csv')
  const bytes = await blobBytes(captured!)
  // BOM thật sự trong blob: EF BB BF (decode thường strip mất nên soi bytes).
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf])
  const text = blobText(bytes)
  expect(text).toBe('Cot\r\n"a;b"\r\n"nói ""xin chào"""\r\n"dòng\nxuống"\r\ntrơn')
})

test('ô chứa cả ; lẫn " cùng lúc vẫn escape đúng', async () => {
  exportCsv('mix.csv', [{ A: 'x;y"z', B: 42 }])
  const text = blobText(await blobBytes(captured!))
  expect(text).toBe('A;B\r\n"x;y""z";42')
})

test('rows rỗng → không tạo file', () => {
  exportCsv('empty.csv', [])
  expect(URL.createObjectURL).not.toHaveBeenCalled()
  expect(clicked).toBeNull()
})
