// Kiểu dữ liệu cho 3D Layer Builder (giai đoạn A — lưu cục bộ).
//
// Quan hệ: ConstructionScene 1-n ConstructionLayer 1-n SceneItem.
//
// KHÁC bản gợi ý trong spec: item giữ `layerId` (một nguồn sự thật) thay vì
// layer giữ `itemIds` — tránh hai danh sách phải đồng bộ sau mỗi thao tác.
// `ConstructionLayer.taskIds` chỉ là THAM CHIẾU sang module nhiệm vụ; dữ liệu
// nghiệp vụ của task (status/deadline/priority) luôn đọc từ API TaskExecution.
//
// KHÔNG chứa dữ liệu nhị phân của model: chỉ `assetId` tham chiếu tới catalog
// (xem `assets.ts`).

export type Vec3 = [number, number, number]

/** Chế độ của gizmo TransformControls. */
export type TransformMode = 'translate' | 'rotate' | 'scale'

/** Đặt item lên mặt phẳng nền hay lên bề mặt mesh khác. */
export type PlaceMode = 'ground' | 'surface'

export type AssetSource = 'DEMO_PRIMITIVE' | 'GLB'
export type PrimitiveKind = 'BOX' | 'CYLINDER' | 'CONE' | 'SPHERE'

export interface AssetPrimitiveSpec {
  kind: PrimitiveKind
  /** Kích thước gốc (mét): [rộng, cao, sâu]. */
  size: Vec3
  color: string
}

export interface AssetDefinition {
  id: string
  /**
   * Tên hiển thị. Với asset demo đây là i18n key (`builder.asset.*`); với asset
   * nạp từ manifest `.glb` là tên thật. UI dùng `t(name, { defaultValue: name })`
   * nên cả hai trường hợp đều hiển thị đúng.
   */
  name: string
  category: string
  source: AssetSource
  /** Chỉ có khi `source === 'GLB'` — URL tuyệt đối (vd `/models/da.glb`). */
  url?: string
  /** Chỉ có khi `source === 'DEMO_PRIMITIVE'`. */
  primitive?: AssetPrimitiveSpec
  thumbnailUrl?: string
}

export interface SceneItem {
  id: string
  assetId: string
  layerId: string
  /** Toạ độ gốc của item = TÂM ĐÁY của model (đã chuẩn hoá khi nạp). */
  position: Vec3
  /** Góc xoay Euler (radian), thứ tự XYZ. */
  rotation: Vec3
  scale: Vec3
}

export interface ConstructionLayer {
  id: string
  name: string
  order: number
  visible: boolean
  locked: boolean
  /** ID nhiệm vụ trong module TaskExecution (không lưu bản sao dữ liệu task). */
  taskIds: string[]
}

export interface ConstructionScene {
  schemaVersion: number
  id: string
  /** Khu vực công tác mà công trình thuộc về (WorkArea.id). */
  workAreaId: string
  name: string
  layers: ConstructionLayer[]
  items: SceneItem[]
  updatedAt: string
}

/** Phiên bản định dạng scene — tăng khi cấu trúc JSON thay đổi. */
export const SCENE_SCHEMA_VERSION = 1
