// Serialize/deserialize scene sang JSON có kiểm tra cấu trúc.
//
// Vì sao cần: dữ liệu scene là dữ liệu người dùng (localStorage hôm nay, API
// ngày mai) — không được tin tưởng mù. Mọi trường được kiểm kiểu/số hữu hạn
// trước khi đưa vào editor; `schemaVersion` cho phép từ chối định dạng lạ thay
// vì render sai.
import type { ConstructionLayer, ConstructionScene, SceneItem, Vec3 } from './types'
import { SCENE_SCHEMA_VERSION } from './types'

export class SceneFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SceneFormatError'
  }
}

/** Làm tròn 3 chữ số để JSON không phình vì sai số dấu phẩy động. */
function round(value: number): number {
  return Number(value.toFixed(3))
}

function vec3(value: unknown, field: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new SceneFormatError(`${field} phải là mảng 3 số`)
  }
  const out = value.map((n) => {
    if (typeof n !== 'number' || !Number.isFinite(n)) {
      throw new SceneFormatError(`${field} chứa giá trị không phải số hữu hạn`)
    }
    return round(n)
  })
  return [out[0], out[1], out[2]]
}

function str(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) {
    throw new SceneFormatError(`${field} phải là chuỗi không rỗng`)
  }
  return value
}

function strArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new SceneFormatError(`${field} phải là mảng`)
  return value.map((v, i) => str(v, `${field}[${i}]`))
}

function parseItem(raw: unknown, index: number): SceneItem {
  if (!raw || typeof raw !== 'object') {
    throw new SceneFormatError(`items[${index}] không phải object`)
  }
  const it = raw as Record<string, unknown>
  return {
    id: str(it.id, `items[${index}].id`),
    assetId: str(it.assetId, `items[${index}].assetId`),
    layerId: str(it.layerId, `items[${index}].layerId`),
    position: vec3(it.position, `items[${index}].position`),
    rotation: vec3(it.rotation, `items[${index}].rotation`),
    scale: vec3(it.scale, `items[${index}].scale`),
  }
}

function parseLayer(raw: unknown, index: number): ConstructionLayer {
  if (!raw || typeof raw !== 'object') {
    throw new SceneFormatError(`layers[${index}] không phải object`)
  }
  const l = raw as Record<string, unknown>
  if (typeof l.order !== 'number' || !Number.isFinite(l.order)) {
    throw new SceneFormatError(`layers[${index}].order phải là số`)
  }
  return {
    id: str(l.id, `layers[${index}].id`),
    name: str(l.name, `layers[${index}].name`),
    order: l.order,
    visible: l.visible !== false,
    locked: l.locked === true,
    taskIds: l.taskIds === undefined ? [] : strArray(l.taskIds, `layers[${index}].taskIds`),
  }
}

export function serializeScene(scene: ConstructionScene): string {
  // Ghi đè schemaVersion bằng hằng hiện tại: dữ liệu luôn được xuất theo định
  // dạng mà bản build này hiểu.
  return JSON.stringify({ ...scene, schemaVersion: SCENE_SCHEMA_VERSION })
}

/** Parse + kiểm tra. Ném SceneFormatError khi JSON hỏng/định dạng lạ. */
export function deserializeScene(raw: string): ConstructionScene {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new SceneFormatError('JSON không hợp lệ')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new SceneFormatError('Scene phải là object')
  }
  const scene = parsed as Record<string, unknown>

  if (scene.schemaVersion !== SCENE_SCHEMA_VERSION) {
    throw new SceneFormatError(
      `schemaVersion ${String(scene.schemaVersion)} không được hỗ trợ (hiện tại ${SCENE_SCHEMA_VERSION})`,
    )
  }
  if (!Array.isArray(scene.layers) || scene.layers.length === 0) {
    throw new SceneFormatError('Scene phải có ít nhất một layer')
  }
  if (!Array.isArray(scene.items)) {
    throw new SceneFormatError('items phải là mảng')
  }

  const layers = scene.layers.map(parseLayer)
  const layerIds = new Set(layers.map((l) => l.id))
  const items = scene.items.map(parseItem)

  for (const item of items) {
    if (!layerIds.has(item.layerId)) {
      throw new SceneFormatError(`item ${item.id} trỏ tới layer không tồn tại`)
    }
  }

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: str(scene.id, 'id'),
    workAreaId: str(scene.workAreaId, 'workAreaId'),
    name: str(scene.name, 'name'),
    layers,
    items,
    updatedAt: typeof scene.updatedAt === 'string' ? scene.updatedAt : new Date().toISOString(),
  }
}
