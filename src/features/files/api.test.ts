import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createUploadRequest,
  uploadToStorage,
  completeUpload,
  getFile,
  getFileDownloadUrl,
  deleteFile,
  uploadFile,
  computeFileChecksum,
} from './api'
import * as apiModule from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
}))

describe('files API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createUploadRequest calls POST /api/v1/files/upload-requests', async () => {
    const mockResponse = {
      fileId: 'file-1',
      uploadUrl: 'https://minio.local/bucket/pending/file-1',
      method: 'PUT',
      headers: { 'x-amz-server-side-encryption': 'AES256' },
      expiresAt: '2026-12-01T00:00:00Z',
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockResponse)

    const payload = {
      fileName: 'evidence.png',
      contentType: 'image/png',
      sizeBytes: 2048,
      purpose: 'ProgressEvidence',
      checksum: 'abc123hash',
    }

    const res = await createUploadRequest(payload)
    expect(res).toEqual(mockResponse)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/files/upload-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('uploadToStorage performs direct fetch without Authorization header', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
    })
    globalThis.fetch = fetchMock

    const file = new File(['sample content'], 'test.txt', { type: 'text/plain' })
    const res = await uploadToStorage(
      'https://minio.local/bucket/test.txt',
      file,
      'PUT',
      { 'x-custom-header': 'value' },
    )

    expect(res.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith('https://minio.local/bucket/test.txt', {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        'x-custom-header': 'value',
      },
      body: file,
    })
  })

  it('completeUpload calls POST /api/v1/files/{id}/complete', async () => {
    const mockFileRef = {
      id: 'f-123',
      fileName: 'receipt.pdf',
      contentType: 'application/pdf',
      sizeBytes: 4096,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockFileRef)

    const res = await completeUpload('f-123', { checksum: 'hex123' })
    expect(res).toEqual(mockFileRef)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/files/f-123/complete', {
      method: 'POST',
      body: JSON.stringify({ checksum: 'hex123' }),
    })
  })

  it('getFile calls GET /api/v1/files/{id}', async () => {
    const mockRef = {
      id: 'f-123',
      fileName: 'spec.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockRef)

    const res = await getFile('f-123')
    expect(res).toEqual(mockRef)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/files/f-123')
  })

  it('getFileDownloadUrl calls GET /api/v1/files/{id}/download-url', async () => {
    const mockDownload = {
      downloadUrl: 'https://minio.local/bucket/completed/file.pdf',
      expiresAt: '2026-12-01T01:00:00Z',
    }
    vi.mocked(apiModule.api).mockResolvedValueOnce(mockDownload)

    const res = await getFileDownloadUrl('f-123')
    expect(res).toEqual(mockDownload)
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/files/f-123/download-url')
  })

  it('deleteFile calls DELETE /api/v1/files/{id}', async () => {
    vi.mocked(apiModule.api).mockResolvedValueOnce(undefined)

    await deleteFile('f-123')
    expect(apiModule.api).toHaveBeenCalledWith('/api/v1/files/f-123', { method: 'DELETE' })
  })

  it('computeFileChecksum computes sha-256 hex string for a blob', async () => {
    const blob = new Blob(['hello world'])
    const checksum = await computeFileChecksum(blob)
    if (checksum) {
      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('uploadFile orchestrates the complete 3-step upload and download url query', async () => {
    const file = new File(['binary content'], 'photo.jpg', { type: 'image/jpeg' })

    const uploadReq = {
      fileId: 'file-xyz',
      uploadUrl: 'https://minio.local/upload/xyz',
      method: 'PUT',
      headers: {},
      expiresAt: '2026-12-01T00:00:00Z',
    }
    const completedRef = {
      id: 'file-xyz',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 14,
    }
    const downloadDto = {
      downloadUrl: 'https://minio.local/download/xyz',
      expiresAt: '2026-12-01T01:00:00Z',
    }

    vi.mocked(apiModule.api)
      .mockResolvedValueOnce(uploadReq)
      .mockResolvedValueOnce(completedRef)
      .mockResolvedValueOnce(downloadDto)

    globalThis.fetch = vi.fn().mockResolvedValueOnce({ ok: true, status: 200 })

    const result = await uploadFile(file, 'ProgressEvidence')

    expect(result).toEqual({
      fileId: 'file-xyz',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 14,
      downloadUrl: 'https://minio.local/download/xyz',
    })
  })
})
