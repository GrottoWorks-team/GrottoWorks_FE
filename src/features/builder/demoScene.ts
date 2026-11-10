// Scene DEMO dùng cho trang chia sẻ `/share/scene/:areaId` (TNV xem mô hình 3D
// của khu vực gắn với nhiệm vụ đã nhận).
//
// VÌ SAO CẦN: scene thật đang lưu trong localStorage của CHÍNH trình duyệt mà
// trưởng khu dựng (xem `repository.ts`) → máy khác (điện thoại của TNV) không
// đọc được. Khi BE có `GET /work-areas/{id}/design-scene` thì trang chia sẻ sẽ
// đọc scene từ server; trong lúc chờ, demo dùng scene dựng sẵn dưới đây để luồng
// "TNV mở nhiệm vụ → xem mô hình → thấy lớp chứa nhiệm vụ của mình" chạy được.
//
// Scene này KHÔNG ghi vào localStorage và KHÔNG thay thế scene thật của builder.
import { SCENE_SCHEMA_VERSION, type ConstructionLayer, type ConstructionScene, type SceneItem } from './types'

export interface DemoSceneOptions {
  /** Nhiệm vụ được gắn vào lớp đầu tiên (để TNV thấy "lớp của tôi"). */
  taskId?: string
  /** Tên hiển thị (thường là tên khu vực). */
  areaName?: string
}

const layer = (id: string, name: string, order: number, taskIds: string[] = []): ConstructionLayer => ({
  id,
  name,
  order,
  visible: true,
  // Lớp chứa nhiệm vụ của TNV không khoá để TNV thấy được cấu trúc bên trong.
  locked: false,
  taskIds,
})

const item = (
  id: string,
  assetId: string,
  layerId: string,
  position: [number, number, number],
  scale: [number, number, number] = [1, 1, 1],
): SceneItem => ({
  id,
  assetId,
  layerId,
  position,
  rotation: [0, 0, 0],
  scale,
})

/** Scene demo 3 lớp: kết cấu (chứa nhiệm vụ) · mái & nền · trang trí. */
export function buildDemoScene(workAreaId: string, options: DemoSceneOptions = {}): ConstructionScene {
  const { taskId, areaName } = options
  const structure = layer('demo-layer-structure', 'Kết cấu', 0, taskId ? [taskId] : [])
  const cover = layer('demo-layer-cover', 'Mái & nền', 1)
  const decor = layer('demo-layer-decor', 'Trang trí', 2)

  const layers = [structure, cover, decor]
  const items: SceneItem[] = [
    // Nền / bệ đá
    item('demo-item-base', 'demo-block', cover.id, [0, 0, 0], [2, 0.3, 2]),
    // 4 cột đá (kết cấu)
    item('demo-item-pillar-1', 'demo-pillar', structure.id, [-2.4, 0, -2.4], [1, 1.2, 1]),
    item('demo-item-pillar-2', 'demo-pillar', structure.id, [2.4, 0, -2.4], [1, 1.2, 1]),
    item('demo-item-pillar-3', 'demo-pillar', structure.id, [-2.4, 0, 2.4], [1, 1.2, 1]),
    item('demo-item-pillar-4', 'demo-pillar', structure.id, [2.4, 0, 2.4], [1, 1.2, 1]),
    // Dầm ngang (kết cấu)
    item('demo-item-beam-1', 'demo-beam', structure.id, [0, 3.6, -2.4], [1.2, 1, 1]),
    item('demo-item-beam-2', 'demo-beam', structure.id, [0, 3.6, 2.4], [1.2, 1, 1]),
    // Mái vòm hang đá
    item('demo-item-roof', 'demo-roof', cover.id, [0, 3.8, 0], [1.5, 1.2, 1.5]),
    // Đèn hang đá
    item('demo-item-lamp-1', 'demo-lamp', decor.id, [0, 1.4, 0], [1, 1, 1]),
    item('demo-item-lamp-2', 'demo-lamp', decor.id, [-2.4, 2.8, -2.4], [0.8, 0.8, 0.8]),
    item('demo-item-lamp-3', 'demo-lamp', decor.id, [2.4, 2.8, -2.4], [0.8, 0.8, 0.8]),
  ]

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: `demo-scene-${workAreaId}`,
    workAreaId,
    name: areaName ? `Mô hình minh hoạ — ${areaName}` : 'Mô hình minh hoạ',
    layers,
    items,
    updatedAt: new Date().toISOString(),
  }
}

/** Lớp đang chứa nhiệm vụ (dùng để tô sáng ở trang chia sẻ). */
export function layersForTask(scene: ConstructionScene, taskId?: string): ConstructionLayer[] {
  if (!taskId) return []
  return scene.layers.filter((l) => l.taskIds.includes(taskId))
}
