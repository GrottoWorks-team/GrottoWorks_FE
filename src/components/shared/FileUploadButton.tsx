import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Loader2, CheckCircle2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { uploadFile } from '@/features/files/api'
import type { UploadedFileResult } from '@/features/files/api'
import type { FilePurpose } from '@/types'
import { cn } from '@/lib/utils'

export interface FileUploadButtonProps {
  purpose?: FilePurpose
  accept?: string
  maxSizeMb?: number
  label?: string
  onSuccess?: (result: UploadedFileResult) => void
  onError?: (error: Error) => void
  disabled?: boolean
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showDownloadLink?: boolean
}

export function FileUploadButton({
  purpose = 'Other',
  accept,
  maxSizeMb = 50,
  label,
  onSuccess,
  onError,
  disabled = false,
  variant = 'outline',
  size = 'default',
  className,
  showDownloadLink = false,
}: FileUploadButtonProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploaded, setLastUploaded] = useState<UploadedFileResult | null>(null)

  const handleButtonClick = () => {
    if (disabled || isUploading) return
    inputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset input value so re-selecting the same file fires change event
    e.target.value = ''

    if (!file) return

    const maxBytes = maxSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      const err = new Error(t('features.files.fileTooLarge', { max: maxSizeMb }))
      toast(err.message)
      onError?.(err)
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadFile(file, purpose)
      setLastUploaded(result)
      toast(t('features.files.uploadSuccess'))
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      toast(`${t('features.files.uploadFailed')}: ${error.message}`)
      onError?.(error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        data-testid="file-upload-input"
      />
      <div className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={disabled || isUploading}
          onClick={handleButtonClick}
          aria-label={label ?? t('features.files.upload')}
          data-testid="file-upload-button"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : lastUploaded ? (
            <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          <span>
            {isUploading
              ? t('features.files.uploading')
              : label ?? t('features.files.upload')}
          </span>
        </Button>

        {showDownloadLink && lastUploaded?.downloadUrl && (
          <a
            href={lastUploaded.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-pine hover:underline"
            data-testid="file-download-link"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span>{lastUploaded.fileName}</span>
          </a>
        )}
      </div>
    </div>
  )
}
