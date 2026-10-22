// Thao tác thuần trên ConstructionScene — không chạm DOM, three.js hay storage.
//
// Mọi hàm là bất biến (trả scene mới) và trả lại CHÍNH scene cũ khi thao tác bị
// chặn (layer đang khóa, không tìm thấy item…) — nhờ vậy UI so sánh tham chiếu
// là biết thao tác có hiệu lực hay không, và test khẳng định được "khóa lớp
// chặn thật" chứ không chỉ đổi icon.
import type {
  ConstructionLayer,
  ConstructionScene,
  SceneItem,
  Vec3,
} from './types'
import { SCENE_SCHEMA_VERSION } from './types'

const now = () => new Date().toISOString()

function ids(rows: { id: string }[], prefix: string): string {
  let max = 0
  for (const row of rows) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(row.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${prefix}${max + 1}`
}

function touch(scene: ConstructionScene, patch: Partial<ConstructionScene>): ConstructionScene {
  return { ...scene, ...patch, updatedAt: now() }
}

// ── Khởi tạo ────────────────────────────────────────────────────────────────

export function createScene(input: {
  id: string
  workAreaId: string
  name: string
  /** Tên các lớp mặc định (đã dịch ở tầng UI). */
  layerNames: string[]
  createdAt?: string
}): ConstructionScene {
  const layers: ConstructionLayer[] = input.layerNames.map((name, i) => ({
    id: `ly${i + 1}`,
    name,
    order: i,
    visible: true,
    locked: false,
    taskIds: [],
  }))

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: input.id,
    workAreaId: input.workAreaId,
    name: input.name,
    layers,
    items: [],
    updatedAt: input.createdAt ?? now(),
  }
}

// ── Truy vấn ────────────────────────────────────────────────────────────────

export function sortedLayers(scene: ConstructionScene): ConstructionLayer[] {
  return [...scene.layers].sort((a, b) => a.order - b.order)
}

export function layerById(
  scene: ConstructionScene,
  layerId: string,
): ConstructionLayer | undefined {
  return scene.layers.find((l) => l.id === layerId)
}

export function itemsOfLayer(scene: ConstructionScene, layerId: string): SceneItem[] {
  return scene.items.filter((i) => i.layerId === layerId)
}

export function itemById(scene: ConstructionScene, itemId: string): SceneItem | undefined {
  return scene.items.find((i) => i.id === itemId)
}

/** Layer đang khóa → mọi thao tác editor lên item của nó bị từ chối. */
export function isItemLocked(scene: ConstructionScene, itemId: string): boolean {
  const item = itemById(scene, itemId)
  if (!item) return true
  return layerById(scene, item.layerId)?.locked ?? true
}

// ── Layer ───────────────────────────────────────────────────────────────────

export function addLayer(scene: ConstructionScene, name: string): ConstructionScene {
  const id = ids(scene.layers, 'ly')
  const order = scene.layers.length ? Math.max(...scene.layers.map((l) => l.order)) + 1 : 0
  const layer: ConstructionLayer = {
    id,
    name: name.trim() || id,
    order,
    visible: true,
    locked: false,
    taskIds: [],
  }
  return touch(scene, { layers: [...scene.layers, layer] })
}

export function renameLayer(
  scene: ConstructionScene,
  layerId: string,
  name: string,
): ConstructionScene {
  const trimmed = name.trim()
  if (!trimmed) return scene
  return touch(scene, {
    layers: scene.layers.map((l) => (l.id === layerId ? { ...l, name: trimmed } : l)),
  })
}

/** Đổi thứ tự hiển thị (order) — không phải thứ tự render của three.js. */
export function moveLayer(
  scene: ConstructionScene,
  layerId: string,
  delta: -1 | 1,
): ConstructionScene {
  const ordered = sortedLayers(scene)
  const index = ordered.findIndex((l) => l.id === layerId)
  const target = index + delta
  if (index < 0 || target < 0 || target >= ordered.length) return scene

  const swapped = [...ordered]
  ;[swapped[index], swapped[target]] = [swapped[target], swapped[index]]
  const withOrder = swapped.map((l, i) => ({ ...l, order: i }))
  return touch(scene, {
    layers: scene.layers.map((l) => withOrder.find((x) => x.id === l.id) ?? l),
  })
}

export function setLayerVisible(
  scene: ConstructionScene,
  layerId: string,
  visible: boolean,
): ConstructionScene {
  return touch(scene, {
    layers: scene.layers.map((l) => (l.id === layerId ? { ...l, visible } : l)),
  })
}

export function setLayerLocked(
  scene: ConstructionScene,
  layerId: string,
  locked: boolean,
): ConstructionScene {
  return touch(scene, {
    layers: scene.layers.map((l) => (l.id === layerId ? { ...l, locked } : l)),
  })
}

/** Chỉ xoá được lớp rỗng — tránh mất item ngoài ý muốn. */
export function removeLayer(scene: ConstructionScene, layerId: string): ConstructionScene {
  if (scene.layers.length <= 1) return scene
  if (itemsOfLayer(scene, layerId).length > 0) return scene
  const layers = sortedLayers(scene)
    .filter((l) => l.id !== layerId)
    .map((l, i) => ({ ...l, order: i }))
  return touch(scene, { layers })
}

// ── Item ────────────────────────────────────────────────────────────────────

export function addItem(
  scene: ConstructionScene,
  input: {
    assetId: string
    layerId: string
    position: Vec3
    rotation?: Vec3
    scale?: Vec3
  },
): { scene: ConstructionScene; itemId?: string } {
  const layer = layerById(scene, input.layerId)
  if (!layer || layer.locked) return { scene }

  const itemId = ids(scene.items, 'it')
  const item: SceneItem = {
    id: itemId,
    assetId: input.assetId,
    layerId: input.layerId,
    position: input.position,
    rotation: input.rotation ?? [0, 0, 0],
    scale: input.scale ?? [1, 1, 1],
  }
  return { scene: touch(scene, { items: [...scene.items, item] }), itemId }
}

/** Cập nhật transform — bị chặn khi layer của item đang khóa. */
export function updateItemTransform(
  scene: ConstructionScene,
  itemId: string,
  patch: Partial<Pick<SceneItem, 'position' | 'rotation' | 'scale'>>,
): ConstructionScene {
  if (isItemLocked(scene, itemId)) return scene
  return touch(scene, {
    items: scene.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  })
}

export function duplicateItem(
  scene: ConstructionScene,
  itemId: string,
): { scene: ConstructionScene; itemId?: string } {
  if (isItemLocked(scene, itemId)) return { scene }
  const source = itemById(scene, itemId)
  if (!source) return { scene }

  const newId = ids(scene.items, 'it')
  const copy: SceneItem = {
    ...source,
    id: newId,
    position: [
      Number((source.position[0] + 0.5).toFixed(3)),
      source.position[1],
      Number((source.position[2] + 0.5).toFixed(3)),
    ],
  }
  return { scene: touch(scene, { items: [...scene.items, copy] }), itemId: newId }
}

export function removeItem(scene: ConstructionScene, itemId: string): ConstructionScene {
  if (isItemLocked(scene, itemId)) return scene
  return touch(scene, { items: scene.items.filter((i) => i.id !== itemId) })
}

/** Chuyển item sang layer khác — cả layer nguồn và đích đều không được khóa. */
export function moveItemToLayer(
  scene: ConstructionScene,
  itemId: string,
  layerId: string,
): ConstructionScene {
  const target = layerById(scene, layerId)
  if (!target || target.locked) return scene
  if (isItemLocked(scene, itemId)) return scene
  return touch(scene, {
    items: scene.items.map((i) => (i.id === itemId ? { ...i, layerId } : i)),
  })
}

// ── Liên kết nhiệm vụ (chỉ giữ ID) ──────────────────────────────────────────

export function linkTask(
  scene: ConstructionScene,
  layerId: string,
  taskId: string,
): ConstructionScene {
  const layer = layerById(scene, layerId)
  if (!layer || layer.taskIds.includes(taskId)) return scene
  return touch(scene, {
    layers: scene.layers.map((l) =>
      l.id === layerId ? { ...l, taskIds: [...l.taskIds, taskId] } : l,
    ),
  })
}

export function unlinkTask(
  scene: ConstructionScene,
  layerId: string,
  taskId: string,
): ConstructionScene {
  const layer = layerById(scene, layerId)
  if (!layer || !layer.taskIds.includes(taskId)) return scene
  return touch(scene, {
    layers: scene.layers.map((l) =>
      l.id === layerId ? { ...l, taskIds: l.taskIds.filter((id) => id !== taskId) } : l,
    ),
  })
}

// ── Exploded view ───────────────────────────────────────────────────────────
//
// Offset chỉ phục vụ HIỂN THỊ: tính từ order của layer, không ghi vào
// `items[].position`. Canvas áp offset lên group của layer.
export function explodeOffsets(
  scene: ConstructionScene,
  factor: number,
  /** Khoảng cách (mét) giữa hai lớp khi tách hoàn toàn. */
  step = 2,
): Record<string, Vec3> {
  const out: Record<string, Vec3> = {}
  const ordered = sortedLayers(scene)
  for (const [index, layer] of ordered.entries()) {
    out[layer.id] = [0, Number((index * step * factor).toFixed(3)), 0]
  }
  return out
}
