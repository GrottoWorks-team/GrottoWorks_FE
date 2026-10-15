import type { GrottoCanvasItem } from './types'

export interface MaterialSummaryItem {
  materialName: string
  totalQuantity: number
  unit: string
  itemsCount: number
}

/**
 * Tính toán danh mục vật tư cần chuẩn bị dựa trên các vật thể có trên bản vẽ.
 * Nhóm các vật tư cùng tên và cộng dồn số lượng.
 */
export function calculateBOM(items: GrottoCanvasItem[]): MaterialSummaryItem[] {
  const map = new Map<string, MaterialSummaryItem>()

  for (const item of items) {
    if (!item.materialReq || !item.materialReq.materialName) continue

    const key = item.materialReq.materialName.trim().toLowerCase()
    const qty = Number(item.materialReq.quantity) || 1
    const unit = item.materialReq.unit || 'cái'

    if (map.has(key)) {
      const existing = map.get(key)!
      existing.totalQuantity += qty
      existing.itemsCount += 1
    } else {
      map.set(key, {
        materialName: item.materialReq.materialName.trim(),
        totalQuantity: qty,
        unit,
        itemsCount: 1,
      })
    }
  }

  return Array.from(map.values())
}

/**
 * Xuất danh mục vật tư ra chuỗi định dạng CSV có ký tự UTF-8 BOM (\uFEFF)
 * để mở trực tiếp trong Microsoft Excel trên Windows không bị lỗi font tiếng Việt.
 */
export function exportBOMToCsv(summary: MaterialSummaryItem[], areaName?: string): string {
  const lines: string[] = []

  // UTF-8 BOM
  lines.push('\uFEFF"BẢNG KÊ VẬT TƯ THI CÔNG HANG ĐÁ GIÁNG SINH"')
  if (areaName) {
    lines.push(`"Phân khu: ${areaName.replace(/"/g, '""')}"`)
  }
  lines.push(`"Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}"`)
  lines.push('')
  lines.push('"STT","Tên vật tư","Số lượng","Đơn vị tính","Số vị trí sử dụng"')

  summary.forEach((item, index) => {
    const name = item.materialName.replace(/"/g, '""')
    const unit = item.unit.replace(/"/g, '""')
    lines.push(`"${index + 1}","${name}","${item.totalQuantity}","${unit}","${item.itemsCount}"`)
  })

  return lines.join('\r\n')
}
