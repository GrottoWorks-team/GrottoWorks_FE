// Trình dựng công trình 3D theo lớp — GIAI ĐOẠN A (lưu cục bộ).
//
// Phạm vi trung thực:
// - Scene lưu trong localStorage CỦA TRÌNH DUYỆT NÀY (xem `repository.ts`).
//   Không chia sẻ giữa các tài khoản/thiết bị, chưa có phân quyền backend.
// - Liên kết nhiệm vụ chỉ lưu ID; trạng thái/priority/deadline đọc từ
//   TaskExecution (`useAreaTasks`). Assignee/tiến độ/nghiệm thu CHƯA có API.
// - Asset: repository chưa có file `.glb` → dùng primitive demo; cơ chế
//   manifest đã sẵn sàng (xem `assets.ts`).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Copy, Expand, Move, RotateCw, Save, Trash2, X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  buttonBase,
  buttonSizes,
  buttonVariants,
  Button,
} from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { useArea } from '@/features/areas/api'
import { useAuth } from '@/lib/auth'
import { useTasks } from '@/features/tasks/api'
import { useAssetCatalog } from '../assets'
import { syncSceneDesign } from '../designLink'
import { AssetLibrary } from '../components/AssetLibrary'
import { BuilderCanvas } from '../components/BuilderCanvas'
import type { CanvasTransform } from '../components/BuilderCanvas'
import { LayerPanel } from '../components/LayerPanel'
import { itemsOfLayer, sortedLayers } from '../scene'
import { useBuilderScene } from '../useBuilderScene'
import type { PlaceMode, TransformMode } from '../types'

const MODE_BUTTONS: { mode: TransformMode; icon: typeof Move; key: string }[] = [
  { mode: 'translate', icon: Move, key: 'builder.move' },
  { mode: 'rotate', icon: RotateCw, key: 'builder.rotate' },
  { mode: 'scale', icon: Expand, key: 'builder.scale' },
]

export default function BuilderPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { pathname } = useLocation()
  const { id: areaId = '' } = useParams()
  const { user } = useAuth()

  const { data: area } = useArea(areaId)
  const { assets, byId } = useAssetCatalog()
  const {
    data: tasks = [],
    isPending: tasksPending,
    error: tasksError,
  } = useTasks(areaId)
  const tasksNotFound = tasksError instanceof ApiError && tasksError.status === 404

  const builder = useBuilderScene({
    workAreaId: areaId,
    sceneName: area?.name ?? t('builder.defaultSceneName'),
    defaultLayerNames: [
      t('builder.defaultLayer.foundation'),
      t('builder.defaultLayer.structure'),
      t('builder.defaultLayer.cover'),
      t('builder.defaultLayer.decor'),
    ],
  })

  const {
    scene,
    isLoading,
    dirty,
    hasSaved,
    saveState,
    save,
    selectedItemId,
    setSelectedItemId,
    selectedItem,
    selectedItemLocked,
    activeLayerId,
    setActiveLayerId,
    transformMode,
    setTransformMode,
    placeMode,
    setPlaceMode,
    alignToSurface,
    setAlignToSurface,
    pendingAssetId,
    setPendingAssetId,
    explode,
    setExplode,
    placeAsset,
    transformItem,
    duplicate,
    remove,
  } = builder

  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null)

  // Lưu scene = lưu BẢN THIẾT KẾ của khu vực: đồng bộ thêm hồ sơ Design
  // (designType THREE_D) để trang Bản thiết kế hiển thị/duyệt được.
  const saveAll = useCallback(async () => {
    await save()
    if (!scene || !user) return
    try {
      // Tên hồ sơ thiết kế ưu tiên tên khu vực (scene có thể tạo trước khi tải xong area).
      syncSceneDesign({ areaId, scene, userId: user.id, title: area?.name ?? scene.name })
    } catch {
      toast(t('builder.designSyncError'), 'alert')
    }
  }, [area?.name, areaId, save, scene, t, toast, user])

  // Cảnh báo rời trang khi còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const prefix = pathname.startsWith('/parish') ? '/parish' : '/leader'
  const designHref = `${prefix}/areas/${areaId}/design`

  const onPlace = useCallback(
    (assetId: string, position: [number, number, number], rotation: [number, number, number]) => {
      placeAsset(assetId, position, rotation)
      setPendingAssetId(null)
    },
    [placeAsset, setPendingAssetId],
  )

  const onTransform = useCallback(
    (itemId: string, transform: CanvasTransform) => transformItem(itemId, transform),
    [transformItem],
  )

  const onError = useCallback(
    (kind: 'context' | 'model') => {
      toast(
        kind === 'context' ? t('builder.error.webgl') : t('builder.error.model'),
        'alert',
      )
    },
    [t, toast],
  )

  const stats = useMemo(() => {
    if (!scene) return { layers: 0, items: 0 }
    return { layers: scene.layers.length, items: scene.items.length }
  }, [scene])

  const saveLabel =
    saveState === 'saving'
      ? t('builder.saving')
      : saveState === 'saved'
        ? t('builder.saved')
        : saveState === 'error'
          ? t('builder.saveError')
          : t('builder.save')

  if (isLoading || !scene) {
    return (
      <EmptyState text={t('builder.loading')} />
    )
  }

  const activeLayer = sortedLayers(scene).find((l) => l.id === activeLayerId) ?? null
  const activeItemCount = activeLayer ? itemsOfLayer(scene, activeLayer.id).length : 0

  return (
    <>
      <PageHeader
        title={area ? t('builder.titleWithArea', { area: area.name }) : t('builder.title')}
        sub={t('builder.sub')}
        actions={
          <>
            <Link
              to={designHref}
              className={cn(buttonBase, buttonVariants.secondary, buttonSizes.sm)}
            >
              <ArrowLeft aria-hidden />
              {t('builder.backToDesign')}
            </Link>
            <Button size="sm" onClick={() => void saveAll()} disabled={saveState === 'saving'}>
              <Save aria-hidden />
              {saveLabel}
            </Button>
          </>
        }
      />

      {/* Thanh công cụ */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-card border border-border bg-card px-2.5 py-2">
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {MODE_BUTTONS.map(({ mode, icon: Icon, key }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTransformMode(mode)}
              aria-pressed={transformMode === mode}
              title={t(key)}
              className={cn(
                'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold transition-colors',
                transformMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {t(key)}
            </button>
          ))}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={duplicate}
          disabled={!selectedItemId || selectedItemLocked}
        >
          <Copy aria-hidden />
          {t('builder.duplicate')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={remove}
          disabled={!selectedItemId || selectedItemLocked}
        >
          <Trash2 aria-hidden />
          {t('common.delete')}
        </Button>

        <span className="mx-1 h-6 w-px bg-border" aria-hidden />

        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {t('builder.placeMode')}
          <select
            value={placeMode}
            onChange={(event) => setPlaceMode(event.target.value as PlaceMode)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground focus-visible:border-primary focus-visible:outline-none"
          >
            <option value="ground">{t('builder.placeGround')}</option>
            <option value="surface">{t('builder.placeSurface')}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <input
            type="checkbox"
            checked={alignToSurface}
            onChange={(event) => setAlignToSurface(event.target.checked)}
            className="size-3.5 accent-brand-pine"
          />
          {t('builder.alignSurface')}
        </label>

        <span className="mx-1 h-6 w-px bg-border" aria-hidden />

        <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {t('builder.explode')}
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={explode}
            onChange={(event) => setExplode(Number(event.target.value))}
            className="w-28 accent-brand-pine"
          />
          <span className="w-8 font-mono text-[11px]">{Math.round(explode * 100)}%</span>
        </label>

        <span className="ml-auto text-[11px] text-muted-foreground">
          {dirty
            ? t('builder.unsaved')
            : hasSaved
              ? t('builder.savedHint')
              : t('builder.notSaved')}{' '}
          · {t('builder.counts', { layers: stats.layers, items: stats.items })}
        </span>
      </div>

      {/* 3 cột: asset — canvas — lớp */}
      <div className="grid min-h-[540px] gap-3 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <div className="min-h-0">
          <AssetLibrary
            assets={assets}
            pendingAssetId={pendingAssetId}
            onPick={(assetId) => setPendingAssetId(assetId)}
            onDragStart={setDraggingAssetId}
            onDragEnd={() => setDraggingAssetId(null)}
          />
        </div>

        <div className="relative min-h-[420px] overflow-hidden rounded-card border border-border">
          <BuilderCanvas
            scene={scene}
            assetById={byId}
            selectedItemId={selectedItemId}
            transformMode={transformMode}
            placeMode={placeMode}
            alignToSurface={alignToSurface}
            pendingAssetId={pendingAssetId}
            draggingAssetId={draggingAssetId}
            explode={explode}
            onSelect={(itemId) => {
              setSelectedItemId(itemId)
              if (itemId) {
                const item = scene.items.find((i) => i.id === itemId)
                if (item) setActiveLayerId(item.layerId)
              }
            }}
            onPlace={onPlace}
            onTransform={onTransform}
            onError={onError}
          />

          {pendingAssetId && (
            <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/30 bg-brand-pineLight px-3 py-1.5 text-xs font-semibold text-brand-pine shadow-card">
              {t('builder.placeHint')}
              <button
                type="button"
                onClick={() => setPendingAssetId(null)}
                aria-label={t('common.cancel')}
                className="grid size-5 place-items-center rounded-full hover:bg-white/60"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
          )}

          {selectedItem && (
            <div className="absolute bottom-3 left-3 rounded-md border border-border bg-card/95 px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
              {selectedItem.id} · {selectedItem.assetId} · x{' '}
              {selectedItem.position.map((n) => n.toFixed(2)).join(' / ')}
              {selectedItemLocked && ` · ${t('builder.lockedBadge')}`}
            </div>
          )}
        </div>

        <div className="min-h-0">
          <LayerPanel
            scene={scene}
            activeLayerId={activeLayerId}
            selectedItemId={selectedItemId}
            onSelectLayer={setActiveLayerId}
            onSelectItem={setSelectedItemId}
            onAddLayer={builder.addLayer}
            onRenameLayer={builder.renameLayer}
            onMoveLayer={builder.moveLayer}
            onToggleVisible={builder.toggleLayerVisible}
            onToggleLocked={builder.toggleLayerLocked}
            onDeleteLayer={builder.deleteLayer}
            tasks={tasks}
            tasksPending={tasksPending}
            tasksError={Boolean(tasksError)}
            tasksNotFound={tasksNotFound}
            onLinkTask={builder.linkTask}
            onUnlinkTask={builder.unlinkTask}
          />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t('builder.scopeNote')}</p>
      {activeLayer && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('builder.activeLayerHint', { layer: activeLayer.name, n: activeItemCount })}
        </p>
      )}
    </>
  )
}
