// Đọc thông tin cơ bản trên ảnh hoá đơn (số tiền, ngày, nhà cung cấp) bằng Tesseract.js
// tải động từ CDN — KHÔNG thêm dependency vào bundle, KHÔNG gửi ảnh ra server.
//
// Vì sao chỉ "điền gợi ý": ảnh chụp nghiêng/mờ cho sai số cao (xem
// GrottoWorks_Kiem_Soat_Ke_Khong_Tien_Vat_Tu_2026-11-22.md §8). Kết quả OCR chỉ
// prefill form, người ghi nhận phải xem lại và bấm lưu; ảnh hoá đơn vẫn là bằng
// chứng bắt buộc ở BE.
//
// Nếu CDN không tải được (máy offline) → ném `OcrUnavailableError` để UI báo và
// người dùng nhập tay, không chặn luồng.

export interface InvoiceDraft {
  supplier?: string
  purchaseDate?: string
  totalAmount?: number
  rawText: string
}

export class OcrUnavailableError extends Error {
  constructor(message = 'Không tải được bộ đọc hoá đơn (cần mạng). Nhập tay giúp mình nhé.') {
    super(message)
    this.name = 'OcrUnavailableError'
  }
}

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'

interface TesseractLike {
  createWorker: (langs?: string) => Promise<{
    recognize: (image: Blob | string) => Promise<{ data?: { text?: string } }>
    terminate: () => Promise<unknown>
  }>
}

let loader: Promise<TesseractLike> | null = null

function loadTesseract(): Promise<TesseractLike> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new OcrUnavailableError())
  }
  const existing = (window as unknown as { Tesseract?: TesseractLike }).Tesseract
  if (existing?.createWorker) return Promise.resolve(existing)
  if (loader) return loader
  loader = new Promise<TesseractLike>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TESSERACT_CDN
    script.async = true
    script.onload = () => {
      const loaded = (window as unknown as { Tesseract?: TesseractLike }).Tesseract
      if (loaded?.createWorker) resolve(loaded)
      else reject(new OcrUnavailableError())
    }
    script.onerror = () => {
      loader = null
      reject(new OcrUnavailableError())
    }
    document.head.appendChild(script)
  })
  return loader
}

/** Đọc ảnh hoá đơn → gợi ý nhà cung cấp / ngày / tổng tiền. */
export async function readInvoice(blob: Blob): Promise<InvoiceDraft> {
  const Tesseract = await loadTesseract()
  let worker: Awaited<ReturnType<TesseractLike['createWorker']>> | null = null
  try {
    // 'vie' tải traineddata từ CDN của Tesseract; hoá đơn Việt thường lẫn tiếng Anh.
    worker = await Tesseract.createWorker('vie+eng')
    const result = await worker.recognize(blob)
    return draftFromText(result?.data?.text ?? '')
  } finally {
    await worker?.terminate().catch(() => undefined)
  }
}

const TOTAL_WORDS = /(t[oổ]ng\s*(c[oộ]ng|ti[eề]n|thanh\s*to[aá]n)?|thanh\s*to[aá]n|total|amount\s*due)/i
const DATE_PATTERN = /(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/

function parseAmount(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d.,-]/g, '')
  if (!cleaned) return undefined
  // 1.234.567 → 1234567 ; 1,234,567.00 → 1234567 ; 250.000,50 → 250000.5
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized: string
  if (lastComma > lastDot && lastComma === cleaned.length - 3) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = cleaned.replace(/,/g, '')
  }
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** Tách số tiền lớn nhất trên một dòng (hoá đơn thường ghi "Tổng cộng: 1.250.000"). */
function amountsIn(line: string): number[] {
  const matches = line.match(/\d[\d.,]*\d|\d/g) ?? []
  return matches.map(parseAmount).filter((value): value is number => typeof value === 'number')
}

export function draftFromText(text: string): InvoiceDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let totalAmount: number | undefined
  for (let index = 0; index < lines.length; index += 1) {
    if (!TOTAL_WORDS.test(lines[index])) continue
    // Số tiền có thể nằm cùng dòng hoặc 1–2 dòng sau (hoá đơn in cột).
    for (let offset = 0; offset <= 2 && totalAmount === undefined; offset += 1) {
      const values = amountsIn(lines[index + offset] ?? '')
      if (values.length > 0) totalAmount = Math.max(...values)
    }
    if (totalAmount !== undefined) break
  }
  if (totalAmount === undefined) {
    const all = lines.flatMap(amountsIn)
    if (all.length > 0) totalAmount = Math.max(...all)
  }

  let purchaseDate: string | undefined
  for (const line of lines) {
    const match = DATE_PATTERN.exec(line)
    if (!match) continue
    const day = Number(match[1])
    const month = Number(match[2])
    let year = Number(match[3])
    if (year < 100) year += 2000
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
      purchaseDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      break
    }
  }

  const ignored = /(ho[áa]\s*[đd][ơo]n|invoice|phi[eế]u|c[oô]ng\s*ty|địa\s*chỉ|address|tel|điện\s*thoại)/i
  const supplier = lines.find((line) => line.length >= 3 && /[a-zà-ỹ]/i.test(line) && !ignored.test(line))

  return { supplier, purchaseDate, totalAmount, rawText: text }
}
