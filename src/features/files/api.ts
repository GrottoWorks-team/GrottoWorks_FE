import { api } from '@/lib/api'
import type {
  CreateUploadRequestDto,
  UploadRequestDto,
  CompleteUploadRequestDto,
  FileReferenceDto,
  FileDownloadDto,
  FilePurpose,
} from '@/types'

export const fileKeys = {
  all: ['files'] as const,
  detail: (id: string) => ['files', id] as const,
  downloadUrl: (id: string) => ['files', id, 'download-url'] as const,
}

export async function computeFileChecksum(file: File | Blob): Promise<string | undefined> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined
  try {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return undefined
  }
}

/** Bước 1: Yêu cầu tạo presigned upload URL (POST /api/v1/files/upload-requests) */
export async function createUploadRequest(
  payload: CreateUploadRequestDto,
): Promise<UploadRequestDto> {
  return api<UploadRequestDto>('/api/v1/files/upload-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Bước 2: Tải file trực tiếp lên S3/MinIO (không qua gateway, không kèm Authorization) */
export async function uploadToStorage(
  uploadUrl: string,
  file: File | Blob,
  method: string = 'PUT',
  headers?: Record<string, string>,
): Promise<Response> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': file.type || 'application/octet-stream',
    ...(headers ?? {}),
  }

  const response = await fetch(uploadUrl, {
    method,
    headers: requestHeaders,
    body: file,
  })

  if (!response.ok) {
    throw new Error(`Tải file lên bộ lưu trữ thất bại: HTTP ${response.status} ${response.statusText}`)
  }

  return response
}

/** Bước 3: Xác nhận hoàn tất upload (POST /api/v1/files/{fileId}/complete) */
export async function completeUpload(
  fileId: string,
  payload?: CompleteUploadRequestDto,
): Promise<FileReferenceDto> {
  return api<FileReferenceDto>(`/api/v1/files/${fileId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

/** Lấy thông tin file (GET /api/v1/files/{fileId}) */
export async function getFile(fileId: string): Promise<FileReferenceDto> {
  return api<FileReferenceDto>(`/api/v1/files/${fileId}`)
}

/** Lấy URL tải xuống presigned (GET /api/v1/files/{fileId}/download-url) */
export async function getFileDownloadUrl(fileId: string): Promise<FileDownloadDto> {
  return api<FileDownloadDto>(`/api/v1/files/${fileId}/download-url`)
}

/** Xoá file chưa gán vào nghiệp vụ (DELETE /api/v1/files/{fileId}) */
export async function deleteFile(fileId: string): Promise<void> {
  await api(`/api/v1/files/${fileId}`, { method: 'DELETE' })
}

export interface UploadedFileResult {
  fileId: string
  fileName: string
  contentType: string
  sizeBytes: number
  downloadUrl?: string
}

/**
 * Luồng tải file hoàn chỉnh:
 * 1. POST /files/upload-requests
 * 2. PUT uploadUrl (S3/MinIO)
 * 3. POST /files/{id}/complete
 * 4. GET /files/{id}/download-url
 */
export async function uploadFile(
  file: File,
  purpose: FilePurpose = 'Other',
): Promise<UploadedFileResult> {
  const checksum = await computeFileChecksum(file)

  const uploadReq = await createUploadRequest({
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    purpose,
    checksum: checksum ?? null,
  })

  await uploadToStorage(uploadReq.uploadUrl, file, uploadReq.method, uploadReq.headers)

  const completed = await completeUpload(uploadReq.fileId, { checksum: checksum ?? null })

  let downloadUrl: string | undefined
  try {
    const download = await getFileDownloadUrl(uploadReq.fileId)
    downloadUrl = download.downloadUrl
  } catch {
    // Không bắt buộc phải có download URL ngay nếu chưa cần
  }

  return {
    fileId: completed.id || uploadReq.fileId,
    fileName: completed.fileName || file.name,
    contentType: completed.contentType ?? file.type,
    sizeBytes: completed.sizeBytes ?? file.size,
    downloadUrl,
  }
}
