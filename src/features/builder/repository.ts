// Ranh giới lưu trữ của editor.
//
// Lý do tách interface: giai đoạn A lưu localStorage, giai đoạn B sẽ thay bằng
// API (`GET/PUT /api/v1/work-areas/{id}/design-scene` — xem
// `BE-gap-requests-activity-flows.md` §6). Logic scene/layer/transform chỉ biết
// interface này nên KHÔNG phải viết lại khi đổi backend.
//
// Lưu ý trung thực: localStorage chỉ là nơi lưu của MỘT trình duyệt, KHÔNG chia
// sẻ giữa các tài khoản/thiết bị và không thay thế phân quyền backend.
import { deserializeScene, serializeScene } from './serialize'
import type { ConstructionScene } from './types'

export interface SceneRepository {
  /** Trả null khi chưa từng lưu scene cho work area này. */
  load(workAreaId: string): Promise<ConstructionScene | null>
  /** Lưu và trả scene đã cập nhật `updatedAt`. */
  save(scene: ConstructionScene): Promise<ConstructionScene>
  clear(workAreaId: string): Promise<void>
}

/** Key riêng, KHÔNG dùng chung với `grotto-designs-v1` (review 2D/3D). */
export const SCENE_STORAGE_PREFIX = 'grotto-builder-scene-v1'

export class LocalSceneRepository implements SceneRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  private key(workAreaId: string): string {
    return `${SCENE_STORAGE_PREFIX}:${workAreaId}`
  }

  async load(workAreaId: string): Promise<ConstructionScene | null> {
    const raw = this.storage.getItem(this.key(workAreaId))
    if (!raw) return null
    // Dữ liệu hỏng → coi như chưa có, không làm sập editor.
    try {
      return deserializeScene(raw)
    } catch {
      return null
    }
  }

  async save(scene: ConstructionScene): Promise<ConstructionScene> {
    const next: ConstructionScene = { ...scene, updatedAt: new Date().toISOString() }
    try {
      this.storage.setItem(this.key(scene.workAreaId), serializeScene(next))
    } catch {
      throw new Error('SCENE_SAVE_FAILED')
    }
    return next
  }

  async clear(workAreaId: string): Promise<void> {
    this.storage.removeItem(this.key(workAreaId))
  }
}

export const sceneRepository: SceneRepository = new LocalSceneRepository()
