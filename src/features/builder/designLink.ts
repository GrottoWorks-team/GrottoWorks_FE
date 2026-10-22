// Liên kết trình dựng 3D với hồ sơ thiết kế của khu vực.
//
// Mục tiêu nghiệp vụ: **scene 3D dựng trong builder CHÍNH LÀ bản thiết kế** của
// khu vực — không phải một tính năng tách rời. Vì vậy sau mỗi lần lưu scene,
// builder upsert một `Design` (designType = 'THREE_D') + `DesignVersion` trỏ tới
// scene đó (fileKey = `scene:<workAreaId>`), để trang "Bản thiết kế" của khu vực
// hiển thị và duyệt được.
//
// Chỉ lưu METADATA: nội dung scene nằm trong `SceneRepository`
// (localStorage `grotto-builder-scene-v1:*`). Không sao chép dữ liệu model vào
// DesignVersion và không tạo blob giả.
import type { Design, DesignVersion } from '@/types'
import { designStore } from '@/features/designs/localStore'
import { serializeScene } from './serialize'
import type { ConstructionScene } from './types'

/** Tiền tố fileKey đánh dấu "phiên bản này là scene của builder". */
export const SCENE_FILE_PREFIX = 'scene:'

export function sceneFileKey(workAreaId: string): string {
  return `${SCENE_FILE_PREFIX}${workAreaId}`
}

export function isSceneFileKey(fileKey?: string): boolean {
  return typeof fileKey === 'string' && fileKey.startsWith(SCENE_FILE_PREFIX)
}

/** Hồ sơ thiết kế 3D của khu vực (nếu đã có). */
export function findSceneDesign(areaId: string): Design | undefined {
  return designStore
    .listDesigns()
    .find((d) => d.areaId === areaId && d.designType === 'THREE_D' && isSceneDesign(d.id))
}

/** Design được tạo bởi builder luôn có ít nhất 1 version với fileKey `scene:*`. */
function isSceneDesign(designId: string): boolean {
  return designStore
    .listVersions()
    .some((v) => v.designId === designId && isSceneFileKey(v.fileKey))
}

/**
 * Upsert bản thiết kế 3D của khu vực sau khi lưu scene.
 * - Chưa có hồ sơ → tạo `Design` + `DesignVersion` (DRAFT).
 * - Đã có → cập nhật tiêu đề/thời điểm/dung lượng của đúng version scene.
 */
export function syncSceneDesign(input: {
  areaId: string
  scene: ConstructionScene
  userId: string
  title?: string
}): { designId: string; versionId: string } {
  const { areaId, scene, userId } = input
  const now = new Date().toISOString()
  const title = input.title?.trim() || scene.name
  const fileKey = sceneFileKey(areaId)
  const json = serializeScene(scene)
  const fileSize = new TextEncoder().encode(json).length

  let design = findSceneDesign(areaId)
  if (!design) {
    design = designStore.createDesign({
      areaId,
      title,
      description: undefined,
      designType: 'THREE_D',
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    design = designStore.updateDesign(design.id, { title, updatedAt: now })
  }

  const existing = designStore
    .listVersions()
    .find((v) => v.designId === design!.id && v.fileKey === fileKey)

  let version: DesignVersion
  if (existing) {
    version = designStore.updateVersion(existing.id, {
      fileName: `${title}.scene.json`,
      fileSize,
      uploadedAt: now,
    })
  } else {
    const versionNumber =
      designStore
        .listVersions()
        .filter((v) => v.designId === design!.id)
        .reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1
    version = designStore.createVersion({
      designId: design.id,
      versionNumber,
      fileKey,
      fileName: `${title}.scene.json`,
      mimeType: 'application/json',
      fileSize,
      changeNote: undefined,
      status: 'DRAFT',
      uploadedBy: userId,
      uploadedAt: now,
    })
  }

  designStore.updateDesign(design.id, { currentVersionId: version.id, updatedAt: now })
  return { designId: design.id, versionId: version.id }
}
