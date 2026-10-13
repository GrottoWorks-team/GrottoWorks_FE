// Tải lên một phiên bản ảnh mới cho hồ sơ thiết kế.
//
// File được lưu nguyên trong IndexedDB (xem lib/blobStore.ts) và metadata đi
// qua mock API. Phiên bản cũ KHÔNG bị ghi đè — luôn tạo bản ghi phiên bản mới
// và chỉ trỏ `currentVersionId` sang bản mới.
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { deleteBlob, newBlobKey, putBlob } from '@/lib/blobStore'
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_MODEL_EXTENSIONS,
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_BYTES,
  MAX_MODEL_BYTES,
  MODEL_ACCEPT_ATTR,
  formatBytes,
  validateImageFile,
  validateModelFile,
} from '../config'
import { useCreateDesignVersion, useUpdateDesign } from '../api'
import type { DesignType } from '@/types'

type FileError = 'none' | 'type' | 'size' | 'empty'

const ERROR_KEY: Record<FileError, string> = {
  none: 'features.design.errNone',
  type: 'features.design.errType',
  size: 'features.design.errSize',
  empty: 'features.design.errEmpty',
}

const TEXTAREA_CLS =
  'flex min-h-[72px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

export function UploadVersionDialog({
  designId,
  designType,
  nextVersionNumber,
  uploadedBy,
  onUploaded,
  onClose,
}: {
  designId: string
  designType: DesignType
  nextVersionNumber: number
  uploadedBy: string
  onUploaded: (versionId: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const createVersion = useCreateDesignVersion()
  const updateDesign = useUpdateDesign()
  const inputRef = useRef<HTMLInputElement>(null)
  const is3d = designType === 'THREE_D'

  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<FileError | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = (f: File | null) => {
    setError(null)
    if (!f) {
      setFile(null)
      return
    }
    const check = is3d ? validateModelFile(f) : validateImageFile(f)
    if (!check.ok) {
      setFile(null)
      setError(check.reason)
      return
    }
    setFile(f)
  }

  const submit = async () => {
    if (!file) {
      setError('none')
      return
    }
    setBusy(true)
    const key = newBlobKey('design')
    try {
      await putBlob(key, file)
      const now = new Date().toISOString()
      const version = await createVersion.mutateAsync({
        designId,
        versionNumber: nextVersionNumber,
        fileKey: key,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        changeNote: note.trim() || undefined,
        status: 'IN_REVIEW',
        uploadedBy,
        uploadedAt: now,
      })
      await updateDesign.mutateAsync({ id: designId, currentVersionId: version.id, updatedAt: now })
      toast(t('features.design.versionUploaded'))
      onUploaded(version.id)
      onClose()
    } catch {
      // Không để lại blob mồ côi khi tạo bản ghi thất bại.
      await deleteBlob(key).catch(() => {})
      toast(t('common.error'), 'alert')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={t('features.design.uploadVersion')}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? t('common.loading') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="design-file">
            {is3d ? t('features.design.modelFile') : t('features.design.imageFile')}
          </Label>
          <input
            id="design-file"
            ref={inputRef}
            type="file"
            accept={is3d ? MODEL_ACCEPT_ATTR : IMAGE_ACCEPT_ATTR}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className={cn(
              'block w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm',
              'file:mr-3 file:rounded-md file:border-0 file:bg-brand-pineLight file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-pine',
            )}
            aria-describedby="design-file-hint"
          />
          <p id="design-file-hint" className="mt-1 text-xs text-muted-foreground">
            {is3d
              ? t('features.design.modelHintFile', {
                  types: ACCEPTED_MODEL_EXTENSIONS.join(', '),
                  size: formatBytes(MAX_MODEL_BYTES),
                })
              : t('features.design.imageHint', {
                  types: ACCEPTED_IMAGE_TYPES.map((x) => x.replace('image/', '')).join(', '),
                  size: formatBytes(MAX_IMAGE_BYTES),
                })}
          </p>
          {error && (
            <p className="mt-1 text-xs font-semibold text-destructive">{t(ERROR_KEY[error])}</p>
          )}
          {file && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Paperclip className="size-3.5" />
              {file.name} · {formatBytes(file.size)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="design-change-note">{t('features.design.changeNote')}</Label>
          <textarea
            id="design-change-note"
            rows={2}
            className={cn(TEXTAREA_CLS)}
            placeholder={t('features.design.changeNotePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t('features.design.versionNumberHint', { n: nextVersionNumber })}
        </p>
      </div>
    </Dialog>
  )
}
