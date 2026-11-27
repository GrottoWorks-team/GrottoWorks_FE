// Tab "Hình ảnh" của khu vực: xem/chụp thêm ảnh hiện trường để bấm vào khu trên
// bản đồ giáo xứ là thấy ngay. FE-only (xem `areaImages.ts`).
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/EmptyState'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { addAreaImage, getAreaImageUrl, listAreaImages, removeAreaImage, type AreaImageMeta } from '../areaImages'

export function AreaImagesTab({ areaId }: { areaId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const canEdit = user?.role === 'COMMUNITY' || user?.role === 'PARISH'
  const [metas, setMetas] = useState<AreaImageMeta[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const list = listAreaImages(areaId)
    setMetas(list)
    const next: Record<string, string> = {}
    for (const meta of list) {
      const url = await getAreaImageUrl(meta.key)
      if (url) next[meta.key] = url
    }
    setUrls((previous) => {
      Object.values(previous).forEach((url) => URL.revokeObjectURL(url))
      return next
    })
    setLoading(false)
  }, [areaId])

  useEffect(() => {
    void load()
    return () => {
      setUrls((previous) => {
        Object.values(previous).forEach((url) => URL.revokeObjectURL(url))
        return {}
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId])

  const onFiles = async (files: FileList) => {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast(t('features.areas.imagesErrType'), 'alert')
          continue
        }
        await addAreaImage(areaId, file, file.name)
      }
      await load()
    } finally {
      setUploading(false)
    }
  }

  const remove = async (key: string) => {
    await removeAreaImage(areaId, key)
    await load()
  }

  return (
    <div className="space-y-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{t('features.areas.imagesTitle')}</p>
        {canEdit ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = event.target.files
                event.target.value = ''
                if (files && files.length > 0) void onFiles(files)
              }}
            />
            <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              {t('features.areas.imagesAdd')}
            </Button>
          </>
        ) : null}
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : metas.length === 0 ? (
        <EmptyState text={t('features.areas.imagesEmpty')} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {metas.map((meta) => (
            <figure key={meta.key} className="overflow-hidden rounded-md border border-border bg-muted/30">
              {urls[meta.key] ? (
                <img src={urls[meta.key]} alt={meta.fileName} className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 place-items-center text-xs text-muted-foreground">{t('features.areas.imagesMissing')}</div>
              )}
              <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-[11px] text-muted-foreground">
                <span className="truncate">{meta.fileName}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void remove(meta.key)}
                    className="text-destructive hover:underline"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{t('features.areas.imagesHint')}</p>
    </div>
  )
}
