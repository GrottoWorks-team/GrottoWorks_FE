// Thư viện asset của builder: kéo (HTML5 DnD) hoặc bấm để chọn rồi click lên
// canvas. Asset demo (hình khối three.js) được gắn nhãn "Demo" để không bị hiểu
// nhầm là model `.glb` thật.
import { useTranslation } from 'react-i18next'
import { Box, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssetDefinition } from '../types'

export function AssetLibrary({
  assets,
  pendingAssetId,
  onPick,
  onDragStart,
  onDragEnd,
}: {
  assets: AssetDefinition[]
  pendingAssetId: string | null
  onPick: (assetId: string) => void
  onDragStart: (assetId: string) => void
  onDragEnd: () => void
}) {
  const { t } = useTranslation()

  const groups = new Map<string, AssetDefinition[]>()
  for (const asset of assets) {
    const list = groups.get(asset.category) ?? []
    list.push(asset)
    groups.set(asset.category, list)
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-card border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Box className="size-4 text-primary" aria-hidden />
        <p className="lbl-mono">{t('builder.assets')}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {[...groups.entries()].map(([category, list]) => (
          <div key={category} className="mb-3">
            <p className="lbl-mono mb-1.5 px-1">{t(category, { defaultValue: category })}</p>
            <div className="space-y-1.5">
              {list.map((asset) => {
                const active = pendingAssetId === asset.id
                return (
                  <button
                    key={asset.id}
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', asset.id)
                      event.dataTransfer.effectAllowed = 'copy'
                      onDragStart(asset.id)
                    }}
                    onDragEnd={onDragEnd}
                    onClick={() => onPick(asset.id)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors active:cursor-grabbing',
                      active
                        ? 'border-primary bg-brand-pineLight'
                        : 'border-border hover:bg-background',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-8 shrink-0 place-items-center rounded border border-border"
                      style={{
                        background:
                          asset.primitive?.color ?? 'linear-gradient(135deg,#e9ecef,#ced4da)',
                      }}
                    >
                      {!asset.primitive && <Box className="size-4 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {t(asset.name, { defaultValue: asset.name })}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {asset.source === 'DEMO_PRIMITIVE'
                          ? t('builder.assetDemo')
                          : t('builder.assetGlb')}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="flex items-start gap-1.5 border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        <MousePointerClick className="mt-px size-3.5 shrink-0" aria-hidden />
        {t('builder.assetHint')}
      </p>
    </div>
  )
}
