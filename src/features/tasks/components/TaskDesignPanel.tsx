import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Boxes, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ScenePreview } from '@/features/builder/components/ScenePreview'
import { sceneRepository } from '@/features/builder/repository'
import type { ConstructionScene } from '@/features/builder/types'

export function TaskDesignPanel({
  workAreaId,
  taskId,
  builderHref,
  readOnly = false,
}: {
  workAreaId: string
  taskId?: string
  builderHref: string
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  const [scene, setScene] = useState<ConstructionScene | null | 'missing'>(null)

  useEffect(() => {
    let live = true
    void sceneRepository.load(workAreaId).then((loaded) => {
      if (live) setScene(loaded ?? 'missing')
    })
    return () => {
      live = false
    }
  }, [workAreaId])

  const linkedLayers = useMemo(() => {
    if (!scene || scene === 'missing') return []
    return scene.layers.filter((layer) =>
      taskId ? layer.taskIds.includes(taskId) : layer.taskIds.length > 0,
    )
  }, [scene, taskId])

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Boxes className="size-4 text-brand-pine" aria-hidden />
          <p className="lbl-mono text-sm font-semibold text-foreground">
            {t('features.tasks.designPanelTitle')}
          </p>
        </div>
        {!readOnly ? (
          <Link
            to={builderHref}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t('features.tasks.editDesign')}
          </Link>
        ) : null}
      </div>

      {linkedLayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
          <Layers className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs text-muted-foreground">
            {t('features.tasks.linkedDesignLayers')}
          </span>
          {linkedLayers.map((layer) => (
            <span
              key={layer.id}
              className="rounded-md border border-brand-pine/20 bg-brand-pine/10 px-2 py-1 text-xs font-semibold text-brand-pine"
            >
              {layer.name}
            </span>
          ))}
        </div>
      )}

      <div className="p-3">
        <ScenePreview
          workAreaId={workAreaId}
          builderHref={builderHref}
          className="overflow-hidden"
        />
      </div>
    </Card>
  )
}
