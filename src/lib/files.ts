// Tệp đính kèm — NotificationAudit file service (MinIO presigned):
//   POST   /api/v1/files/upload-requests      → { fileId, uploadUrl, method, headers }
//   PUT    <uploadUrl>                        (MinIO, không qua gateway)
//   POST   /api/v1/files/{fileId}/complete    → xác nhận đã upload
//   GET    /api/v1/files/{fileId}/download-url→ { downloadUrl, expiresAt }
//   DELETE /api/v1/files/{fileId}             (chỉ file chưa gắn nghiệp vụ)
import { ApiError, api } from './api'

export type FilePurpose = 'ProgressEvidence' | 'ReadinessEvidence' | 'PurchaseReceipt' | 'Other'

interface UploadRequestDto {
  fileId: string
  uploadUrl: string
  method: string
  headers: Record<string, string>
  expiresAt: string
}

/** Upload 3 bước theo presigned URL, trả về fileId để gắn vào nghiệp vụ. */
export async function uploadFile(file: File, purpose: FilePurpose): Promise<string> {
  const request = await api<UploadRequestDto>('/api/v1/files/upload-requests', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      purpose,
      checksum: null,
    }),
  })

  const upload = await fetch(request.uploadUrl, {
    method: request.method || 'PUT',
    headers: request.headers ?? {},
    body: file,
  })
  if (!upload.ok) {
    throw new ApiError(upload.status, `Upload failed: ${upload.status} ${upload.statusText}`)
  }

  await api<void>(`/api/v1/files/${request.fileId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ checksum: null }),
  })
  return request.fileId
}

export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const res = await api<{ downloadUrl: string }>(`/api/v1/files/${fileId}/download-url`)
  return res.downloadUrl
}

export async function openFile(fileId: string): Promise<void> {
  const url = await getFileDownloadUrl(fileId)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function deleteFile(fileId: string): Promise<void> {
  await api<void>(`/api/v1/files/${fileId}`, { method: 'DELETE' })
}
