// Xem "bản thiết kế 3D" của khu vực ngay trong trang Bản thiết kế.
//
// Scene do trình dựng 3D lưu trong `SceneRepository` được hiển thị ở chế độ chỉ
// xem (không gizmo, không đặt item) — đúng nghĩa scene dựng ra CHÍNH LÀ bản
// thiết kế của khu vực. Nếu chưa từng lưu scene → hiện gợi ý mở trình dựng.
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Boxes, Layers } from 'lucide-react'
import { buttonBase, buttonSizes, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAssetCatalog } from '../assets'
import { sceneRepository } from '../repository'
import { BuilderCanvas } from './BuilderCanvas'
import type { ConstructionScene } from '../types'

export function ScenePreview({
  workAreaId,
  builderHref,
  className,
}: {
  workAreaId: string
  /** Đường dẫn mở trình dựng (để sửa bản thiết kế). */
  builderHref: string
  className?: string
}) {
  const { t } = useTranslation()
  const { byId } = useAssetCatalog()
  const [scene, setScene] = useState<ConstructionScene | null | 'missing'>(null)
  const [explode, setExplode] = useState(0)

  useEffect(() => {
    let live = true
    void sceneRepository.load(workAreaId).then((loaded) => {
      if (live) setScene(loaded ?? 'missing')
    })
    return () => {
      live = false
    }
  }, [workAreaId])

  if (scene === null) {
    return (
      <p className="grid h-[420px] place-items-center rounded-card border border-border bg-muted/30 text-sm text-muted-foreground sm:h-[520px]">
        {t('common.loading')}
      </p>
    )
  }

  if (scene === 'missing') {
    return (
      <div className="grid h-[420px] place-items-center gap-3 rounded-card border border-dashed border-border bg-muted/30 px-6 text-center sm:h-[520px]">
        <Boxes className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-semibold text-foreground">{t('builder.designNoScene')}</p>
        <Link
          to={builderHref}
          className={cn(buttonBase, buttonVariants.secondary, buttonSizes.default)}
        >
          {t('builder.open')}
        </Link>
      </div>
    )
  }

  const visibleLayers = scene.layers.filter((l) => l.visible)
  const linkedLayers = scene.layers.filter((l) => l.taskIds.length > 0).length

  return (
    <div className={className}>
      <div className="h-[420px] sm:h-[520px]">
        <BuilderCanvas
          readOnly
          scene={scene}
          assetById={byId}
          selectedItemId={null}
          transformMode="translate"
          placeMode="ground"
          alignToSurface={false}
          pendingAssetId={null}
          draggingAssetId={null}
          // Tách lớp chỉ dịch group của layer khi hiển thị — không sửa transform
          // trong scene đã lưu, nên an toàn cho chế độ chỉ xem.
          explode={explode}
          onSelect={() => undefined}
          onPlace={() => undefined}
          onTransform={() => undefined}
        />
      </div>

      {/* Xem cấu trúc bên trong: tách lớp (chỉ hiển thị, không ghi vào bản thiết kế) */}
      {scene.layers.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Layers className="size-3.5" aria-hidden />
            {t('builder.explode')}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={explode}
            aria-label={t('builder.explode')}
            onChange={(event) => setExplode(Number(event.target.value))}
            className="w-40 accent-brand-pine"
          />
          <span className="w-9 font-mono text-[11px] text-muted-foreground">
            {Math.round(explode * 100)}%
          </span>
          {explode > 0 && (
            <button
              type="button"
              onClick={() => setExplode(0)}
              className="ml-auto text-xs font-semibold text-primary hover:underline"
            >
              {t('builder.explodeReset')}
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="size-3.5" aria-hidden />
          {t('builder.preview.layers', {
            total: scene.layers.length,
            visible: visibleLayers.length,
          })}
        </span>
        <span>·</span>
        <span>{t('builder.counts', { layers: scene.layers.length, items: scene.items.length })}</span>
        <span>·</span>
        <span>{t('builder.preview.updated', { when: scene.updatedAt.slice(0, 10) })}</span>
        {linkedLayers > 0 && (
          <>
            <span>·</span>
            <span>{t('builder.preview.linkedLayers', { n: linkedLayers })}</span>
          </>
        )}
        <Link
          to={builderHref}
          className="ml-auto text-xs font-semibold text-primary hover:underline"
        >
          {t('builder.preview.edit')}
        </Link>
      </div>
    </div>
  )
}
