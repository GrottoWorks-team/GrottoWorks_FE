// Cấu hình cho Design Review — tập trung một chỗ, không hard-code rải rác.
// Giá trị ở đây là mức khởi điểm hợp lý cho giai đoạn mock (client-side);
// khi có backend/object storage thật thì giới hạn phải được enforce ở server
// theo hạ tầng thực tế.

/** Giới hạn kích thước file ảnh 2D (byte) — 8 MB. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** MIME ảnh được chấp nhận cho 2D Review. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** `accept` cho <input type="file">. */
export const IMAGE_ACCEPT_ATTR = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

/** `accept` cho <input type="file"> của mô hình 3D. */
export const MODEL_ACCEPT_ATTR = '.glb,model/gltf-binary';

/** Giới hạn kích thước model 3D (byte) — 25 MB. Dùng cho L3. */
export const MAX_MODEL_BYTES = 25 * 1024 * 1024;

/** MIME/đuôi model được chấp nhận cho 3D Review (chỉ .glb tự chứa). */
export const ACCEPTED_MODEL_EXTENSIONS = ['.glb'] as const;

/** Một thao tác luôn bị chặn nếu file rỗng. */
export const MIN_FILE_BYTES = 1;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** i
  return `${value >= 10 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

/** Hậu tố (lowercase) của tên file, gồm cả dấu chấm. */
export function fileExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i).toLowerCase()
}

export type FileValidation = { ok: true } | { ok: false; reason: 'type' | 'size' | 'empty' }

/** Kiểm tra file ảnh 2D: loại MIME + dung lượng. Không tin riêng đuôi file. */
export function validateImageFile(file: { type: string; size: number }): FileValidation {
  if (file.size < MIN_FILE_BYTES) return { ok: false, reason: 'empty' }
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: 'type' }
  }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, reason: 'size' }
  return { ok: true }
}

/** Kiểm tra file model 3D (L3) — chỉ .glb tự chứa, không tin riêng đuôi file. */
export function validateModelFile(file: { name: string; size: number }): FileValidation {
  if (file.size < MIN_FILE_BYTES) return { ok: false, reason: 'empty' }
  if (!(ACCEPTED_MODEL_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
    return { ok: false, reason: 'type' }
  }
  if (file.size > MAX_MODEL_BYTES) return { ok: false, reason: 'size' }
  return { ok: true }
}
