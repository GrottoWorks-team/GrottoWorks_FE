// 26/11/2026: tải tệp lên kho đối tượng (Cloudflare R2 / MinIO).
//
// Luồng chuẩn: `POST /files/upload-requests` → `PUT <uploadUrl>` (presigned, đi thẳng tới storage)
// → `POST /files/{id}/complete`. Nhưng presigned PUT gọi từ trình duyệt cần bucket cấu hình CORS
// (AllowedOrigins + PUT + Content-Type); nếu chưa cấu hình, trình duyệt chặn preflight và tải
// minh chứng hỏng (`has been blocked by CORS policy`).
//
// Vì vậy khi PUT trực tiếp thất bại vì CORS/mất mạng, ta chuyển sang `PUT /files/{id}/proxy-upload`
// để máy chủ stream hộ — endpoint này hoàn tất upload luôn nên KHÔNG gọi `/complete` nữa.
import { ApiError, api } from './api'

export interface PresignedUpload {
  fileId: string
  uploadUrl: string
  method?: string
  headers?: Record<string, string>
}

/** Loại nội dung `proxy-upload` của BE chấp nhận (FilesController.Consumes). */
const PROXY_CONTENT_TYPES = new Set([
  'application/octet-stream',
  'application/pdf',
  'model/gltf-binary',
  'image/png',
  'image/jpeg',
  'image/webp',
])

export type UploadTransport = 'direct' | 'proxy'

/**
 * Đẩy bytes lên storage. Trả `'direct'` khi presigned PUT thành công (cần gọi `/complete`),
 * `'proxy'` khi phải đi qua gateway (BE đã hoàn tất upload).
 */
export async function putFileObject(file: File, upload: PresignedUpload): Promise<UploadTransport> {
  try {
    const response = await fetch(upload.uploadUrl, {
      method: upload.method || 'PUT',
      headers: upload.headers ?? {},
      body: file,
    })
    if (response.ok) return 'direct'
  } catch {
    // TypeError khi CORS chặn preflight hoặc mất mạng → thử đường proxy bên dưới.
  }

  const contentType = file.type || 'application/octet-stream'
  if (!PROXY_CONTENT_TYPES.has(contentType.toLowerCase())) {
    throw new ApiError(
      0,
      `Không tải được tệp lên kho lưu trữ (CORS) và loại tệp ${contentType} chưa hỗ trợ tải qua máy chủ.`,
      'FILE_UPLOAD_TRANSPORT_UNAVAILABLE',
    )
  }

  await api(`/api/v1/files/${upload.fileId}/proxy-upload`, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  return 'proxy'
}
