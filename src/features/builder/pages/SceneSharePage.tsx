// Trang CÔNG KHAI xem mô hình 3D của khu vực — dùng cho TNV mở từ app mobile
// (`/share/scene/:areaId?task=<taskId>&name=<tên khu vực>`).
//
// Vì sao công khai: role VOLUNTEER không có giao diện web (xem
// `routes/RequireRole.tsx`), nên app mobile mở link này bằng trình duyệt. Link
// chỉ đọc, không có thao tác ghi.
//
// Nguồn dữ liệu (tạm thời, chờ BE):
//   1. Scene đã lưu của khu vực trong localStorage (`sceneRepository`) — chỉ có
//      trên đúng trình duyệt mà trưởng khu dựng.
//   2. Không có scene → scene DEMO (`buildDemoScene`) để luồng demo chạy được
//      trên mọi thiết bị.
// Khi BE có `GET /work-areas/{id}/design-scene` (+ token chia sẻ), chỉ cần thay
// phần nạp scene, phần render giữ nguyên.
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Boxes, Layers, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssetCatalog } from '@/features/builder/assets'
import { buildDemoScene, layersForTask } from '@/features/builder/demoScene'
import { sceneRepository } from '@/features/builder/repository'
import { BuilderCanvas } from '@/features/builder/components/BuilderCanvas'
import type { ConstructionScene } from '@/features/builder/types'

type Source = 'loading' | 'saved' | 'demo' | 'error'

export default function SceneSharePage() {
  const { t } = useTranslation()
  const { areaId = '' } = useParams<{ areaId: string }>()
  const [params] = useSearchParams()
  const taskId = params.get('task') ?? undefined
  const areaName = params.get('name') ?? undefined

  const { byId } = useAssetCatalog()
  const [scene, setScene] = useState<ConstructionScene | null>(null)
  const [source, setSource] = useState<Source>('loading')
  const [explode, setExplode] = useState(0)

  useEffect(() => {
    let alive = true
    setSource('loading')
    void sceneRepository
      .load(areaId)
      .then((saved) => {
        if (!alive) return
        if (saved) {
          setScene(saved)
          setSource('saved')
        } else {
          setScene(buildDemoScene(areaId, { taskId, areaName }))
          setSource('demo')
        }
      })
      .catch(() => {
        if (!alive) return
        setScene(buildDemoScene(areaId, { taskId, areaName }))
        setSource('demo')
      })
    return () => {
      alive = false
    }
  }, [areaId, taskId, areaName])

  const myLayers = useMemo(() => (scene ? layersForTask(scene, taskId) : []), [scene, taskId])

  if (!scene || source === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <p className="lbl-mono text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="space-y-1">
          <p className="lbl-mono text-brand-pine">{t('share.scene.eyebrow')}</p>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {areaName ?? scene.name}
          </h1>
          <p className="text-sm text-muted-foreground">{t('share.scene.sub')}</p>
        </header>

        {source === 'demo' && (
          <div className="flex items-start gap-2 rounded-md border border-brand-gold/40 bg-brand-gold/10 px-3 py-2 text-xs text-foreground">
            <Boxes className="mt-0.5 size-4 shrink-0 text-brand-gold" aria-hidden />
            <p>{t('share.scene.demoNotice')}</p>
          </div>
        )}

        {myLayers.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-brand-pineLight px-3 py-2 text-sm text-brand-pine">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{t('share.scene.myLayer', { name: myLayers.map((l) => l.name).join(', ') })}</p>
          </div>
        )}

        <div className="overflow-hidden rounded-card border border-border bg-card">
          <div className="h-[360px] sm:h-[520px]">
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
              explode={explode}
              onSelect={() => undefined}
              onPlace={() => undefined}
              onTransform={() => undefined}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
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

        <section className="space-y-2">
          <p className="lbl-mono text-muted-foreground">{t('share.scene.layersTitle')}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[...scene.layers]
              .sort((a, b) => a.order - b.order)
              .map((layer) => {
                const mine = taskId ? layer.taskIds.includes(taskId) : false
                const count = scene.items.filter((i) => i.layerId === layer.id).length
                return (
                  <li
                    key={layer.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
                      mine
                        ? 'border-primary bg-brand-pineLight text-brand-pine'
                        : 'border-border bg-card text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      {layer.name}
                      {mine && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {t('share.scene.myTaskBadge')}
                        </span>
                      )}
                    </span>
                    <span className="tabular text-xs text-muted-foreground">
                      {t('share.scene.itemCount', { n: count })}
                    </span>
                  </li>
                )
              })}
          </ul>
        </section>

        <p className="pb-6 text-[11px] text-muted-foreground">{t('share.scene.footnote')}</p>
      </div>
    </div>
  )
}
