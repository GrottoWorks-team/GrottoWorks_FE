// Tab "Hình ảnh" của khu vực: xem/chụp thêm ảnh hiện trường để bấm vào khu trên
// bản đồ giáo xứ là thấy ngay. FE-only (xem `areaImages.ts`).
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Khu vực — Hình ảnh".
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
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
  const [dragging, setDragging] = useState(false)
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

  const HEAD = 'font-mono text-[8.5px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

  return (
    <div className="flex w-full flex-col gap-[14px]">
      <div className="flex w-full items-center justify-between">
        <span className={HEAD}>{t('features.areas.imagesTitle')}</span>
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
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="flex h-[30px] items-center gap-[6px] rounded-[9px] bg-[#0A5C36] px-[11px] transition-colors hover:bg-[#0D7344] disabled:opacity-55"
            >
              {uploading ? (
                <Loader2 className="size-[11px] animate-spin text-[#F2D07A]" aria-hidden />
              ) : (
                <ImagePlus className="size-[11px] text-[#F2D07A]" aria-hidden />
              )}
              <span className="text-[10.5px] font-bold text-white">{t('features.areas.imagesAdd')}</span>
            </button>
          </>
        ) : null}
      </div>

      {loading ? (
        <p className="py-6 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
      ) : metas.length === 0 ? (
        <div
          onDragOver={(event) => {
            if (!canEdit) return
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            if (!canEdit) return
            event.preventDefault()
            setDragging(false)
            if (event.dataTransfer.files.length) void onFiles(event.dataTransfer.files)
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-[10px] rounded-[14px] border border-dashed bg-[#FAFBF8] p-5',
            dragging ? 'border-[#0A5C36] bg-[#F1F6EE]' : 'border-[#E3EAE0]',
          )}
        >
          <span className="text-[11.5px] font-semibold text-[#7C9287]">
            {t('features.areas.imagesEmpty')}
          </span>
          <span className="w-[260px] text-center text-[10px] leading-[15px] text-[#A3B4A9]">
            {t('features.areas.imagesDropHint', { defaultValue: 'Kéo thả ảnh vào đây hoặc bấm Thêm ảnh' })}
          </span>
        </div>
      ) : (
        <div className="grid w-full gap-[10px] sm:grid-cols-2">
          {metas.map((meta) => (
            <figure
              key={meta.key}
              className="overflow-hidden rounded-[12px] border border-[#E3EAE0] bg-[#FAFBF8]"
            >
              {urls[meta.key] ? (
                <img src={urls[meta.key]} alt={meta.fileName} className="h-36 w-full object-cover" />
              ) : (
                <div className="grid h-36 place-items-center text-[10.5px] text-[#A3B4A9]">
                  {t('features.areas.imagesMissing')}
                </div>
              )}
              <figcaption className="flex items-center justify-between gap-2 px-[10px] py-[7px]">
                <span className="truncate text-[10px] text-[#7C9287]">{meta.fileName}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => void remove(meta.key)}
                    className="text-[#B4634F] transition-colors hover:text-[#8F3B32]"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="size-[12px]" />
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <div className="flex w-full items-center rounded-[10px] bg-[#F7F9F5] px-[11px] py-[9px]">
        <span className="min-w-0 flex-1 text-[10px] leading-[15px] text-[#96AAA0]">
          {t('features.areas.imagesHint')}
        </span>
      </div>
    </div>
  )
}
