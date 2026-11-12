import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadButton } from './FileUploadButton'
import * as filesApi from '@/features/files/api'
import { ToastProvider } from '@/components/ui/toast'

vi.mock('@/features/files/api', () => ({
  uploadFile: vi.fn(),
}))

function mount(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('FileUploadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with default label', () => {
    mount(<FileUploadButton />)
    expect(screen.getByTestId('file-upload-button')).toBeDefined()
  })

  it('renders custom label and triggers input click', async () => {
    const user = userEvent.setup()
    mount(<FileUploadButton label="Tải chứng từ" />)

    const btn = screen.getByRole('button', { name: 'Tải chứng từ' })
    expect(btn).toBeDefined()

    const input = screen.getByTestId('file-upload-input') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    await user.click(btn)
    expect(clickSpy).toHaveBeenCalled()
  })

  it('executes successful 3-step file upload flow and calls onSuccess', async () => {
    const onSuccess = vi.fn()
    const mockResult = {
      fileId: 'fid-123',
      fileName: 'test-doc.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      downloadUrl: 'https://storage.example.com/test-doc.pdf',
    }

    vi.mocked(filesApi.uploadFile).mockResolvedValueOnce(mockResult)

    mount(
      <FileUploadButton
        purpose="PurchaseReceipt"
        onSuccess={onSuccess}
        showDownloadLink
      />,
    )

    const input = screen.getByTestId('file-upload-input')
    const file = new File(['dummy content'], 'test-doc.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(filesApi.uploadFile).toHaveBeenCalledWith(file, 'PurchaseReceipt')
      expect(onSuccess).toHaveBeenCalledWith(mockResult)
    })

    const link = await screen.findByTestId('file-download-link')
    expect(link.getAttribute('href')).toBe('https://storage.example.com/test-doc.pdf')
    expect(link.textContent).toContain('test-doc.pdf')
  })

  it('prevents upload if file size exceeds maxSizeMb', async () => {
    const onError = vi.fn()
    mount(<FileUploadButton maxSizeMb={1} onError={onError} />)

    const input = screen.getByTestId('file-upload-input')
    // 2MB file
    const bigFile = new File([new ArrayBuffer(2 * 1024 * 1024)], 'large.zip', {
      type: 'application/zip',
    })

    fireEvent.change(input, { target: { files: [bigFile] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
      expect(filesApi.uploadFile).not.toHaveBeenCalled()
    })
  })

  it('handles upload errors and invokes onError', async () => {
    const onError = vi.fn()
    vi.mocked(filesApi.uploadFile).mockRejectedValueOnce(new Error('S3 Connection Timed Out'))

    mount(<FileUploadButton onError={onError} />)

    const input = screen.getByTestId('file-upload-input')
    const file = new File(['content'], 'test.png', { type: 'image/png' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
