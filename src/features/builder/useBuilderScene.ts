// Trạng thái editor: scene + selection + chế độ + lưu trữ.
//
// Toàn bộ thao tác hình học đi qua `scene.ts` (hàm thuần) nên hook này chỉ lo
// giữ state, gọi repository và đánh dấu "chưa lưu". Không chứa logic three.js.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { sceneRepository } from './repository'
import { serializeScene } from './serialize'
import {
  addItem,
  addLayer,
  createScene,
  duplicateItem,
  isItemLocked,
  linkTask,
  moveItemToLayer,
  moveLayer,
  removeItem,
  removeLayer,
  renameLayer,
  setLayerLocked,
  setLayerVisible,
  unlinkTask,
  updateItemTransform,
} from './scene'
import type { ConstructionScene, PlaceMode, TransformMode, Vec3 } from './types'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface UseBuilderSceneArgs {
  workAreaId: string
  sceneName: string
  /** Tên các lớp mặc định khi chưa có scene đã lưu (đã dịch ở tầng UI). */
  defaultLayerNames: string[]
}

export function useBuilderScene({
  workAreaId,
  sceneName,
  defaultLayerNames,
}: UseBuilderSceneArgs) {
  const [scene, setScene] = useState<ConstructionScene | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savedJson, setSavedJson] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [placeMode, setPlaceMode] = useState<PlaceMode>('ground')
  const [alignToSurface, setAlignToSurface] = useState(true)
  const [pendingAssetId, setPendingAssetId] = useState<string | null>(null)
  const [explode, setExplode] = useState(0)

  // ── Nạp scene đã lưu (hoặc tạo mới với các lớp mặc định) ────────────────
  useEffect(() => {
    let live = true
    setIsLoading(true)
    void sceneRepository.load(workAreaId).then((loaded) => {
      if (!live) return
      const next =
        loaded ??
        createScene({
          id: `scene-${workAreaId}`,
          workAreaId,
          name: sceneName,
          layerNames: defaultLayerNames,
        })
      setScene(next)
      setSavedJson(loaded ? serializeScene(loaded) : null)
      setActiveLayerId(next.layers[0]?.id ?? null)
      setSelectedItemId(null)
      setIsLoading(false)
    })
    return () => {
      live = false
    }
    // defaultLayerNames/sceneName chỉ dùng cho lần tạo mới đầu tiên.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workAreaId])

  /** Áp một hàm thuần lên scene; giữ nguyên tham chiếu khi thao tác bị chặn. */
  const update = useCallback(
    (fn: (current: ConstructionScene) => ConstructionScene) => {
      setScene((current) => (current ? fn(current) : current))
      setSaveState('idle')
    },
    [],
  )

  const placeAsset = useCallback(
    (assetId: string, position: Vec3, rotation: Vec3) => {
      setScene((current) => {
        if (!current) return current
        const targetLayer = activeLayerId ?? current.layers[0]?.id
        if (!targetLayer) return current
        const { scene: next } = addItem(current, {
          assetId,
          layerId: targetLayer,
          position,
          rotation,
          scale: [1, 1, 1],
        })
        return next
      })
      setSaveState('idle')
    },
    [activeLayerId],
  )

  const transformItem = useCallback(
    (
      itemId: string,
      transform: { position: Vec3; rotation: Vec3; scale: Vec3 },
    ) => {
      update((current) => updateItemTransform(current, itemId, transform))
    },
    [update],
  )

  const duplicate = useCallback(() => {
    if (!scene || !selectedItemId) return
    const { scene: next, itemId } = duplicateItem(scene, selectedItemId)
    if (next === scene) return
    setScene(next)
    if (itemId) setSelectedItemId(itemId)
    setSaveState('idle')
  }, [scene, selectedItemId])

  const remove = useCallback(() => {
    if (!selectedItemId) return
    setScene((current) => (current ? removeItem(current, selectedItemId) : current))
    setSelectedItemId(null)
    setSaveState('idle')
  }, [selectedItemId])

  const moveToLayer = useCallback(
    (layerId: string) => {
      if (!selectedItemId) return
      update((current) => moveItemToLayer(current, selectedItemId, layerId))
    },
    [selectedItemId, update],
  )

  const save = useCallback(async () => {
    if (!scene) return
    setSaveState('saving')
    try {
      const saved = await sceneRepository.save(scene)
      setScene(saved)
      setSavedJson(serializeScene(saved))
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }, [scene])

  const dirty = Boolean(scene && savedJson !== null && serializeScene(scene) !== savedJson)

  const selectedItem = useMemo(
    () => scene?.items.find((i) => i.id === selectedItemId) ?? null,
    [scene, selectedItemId],
  )

  const selectedItemLocked = useMemo(
    () => (scene && selectedItemId ? isItemLocked(scene, selectedItemId) : false),
    [scene, selectedItemId],
  )

  return {
    scene,
    isLoading,
    dirty,
    /** Đã từng lưu vào repository chưa (phân biệt "đã lưu" và "chưa lưu lần nào"). */
    hasSaved: savedJson !== null,
    saveState,
    save,
    // selection + chế độ
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
    // thao tác
    placeAsset,
    transformItem,
    duplicate,
    remove,
    moveToLayer,
    addLayer: (name: string) => update((s) => addLayer(s, name)),
    renameLayer: (layerId: string, name: string) => update((s) => renameLayer(s, layerId, name)),
    moveLayer: (layerId: string, delta: -1 | 1) => update((s) => moveLayer(s, layerId, delta)),
    toggleLayerVisible: (layerId: string, visible: boolean) =>
      update((s) => setLayerVisible(s, layerId, visible)),
    toggleLayerLocked: (layerId: string, locked: boolean) =>
      update((s) => setLayerLocked(s, layerId, locked)),
    deleteLayer: (layerId: string) => update((s) => removeLayer(s, layerId)),
    linkTask: (layerId: string, taskId: string) => update((s) => linkTask(s, layerId, taskId)),
    unlinkTask: (layerId: string, taskId: string) => update((s) => unlinkTask(s, layerId, taskId)),
  }
}
