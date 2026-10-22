import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GrottoAssetDef, GrottoCanvasItem, GrottoDesignDraft } from './types'

const MAX_HISTORY = 30
const STORAGE_PREFIX = 'grotto-design-'

function createInstanceId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function useDesignerState(areaId: string, initialTitle = 'Bản phác thảo Hang đá 2D') {
  const storageKey = `${STORAGE_PREFIX}${areaId}`

  // Nạp dữ liệu ban đầu từ localStorage nếu có
  const initialItems = useMemo<GrottoCanvasItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as GrottoDesignDraft
        if (Array.isArray(parsed.items)) {
          return parsed.items
        }
      }
    } catch {
      // fallback
    }
    return []
  }, [storageKey])

  const [items, setItems] = useState<GrottoCanvasItem[]>(initialItems)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [history, setHistory] = useState<GrottoCanvasItem[][]>([initialItems])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Zoom, Pan & Grid Snap state
  const [zoom, setZoom] = useState(1.0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [gridSnap, setGridSnap] = useState(true)

  // Lưu tự động vào localStorage khi items thay đổi
  useEffect(() => {
    try {
      const draft: GrottoDesignDraft = {
        areaId,
        title: initialTitle,
        canvasWidth: 1200,
        canvasHeight: 800,
        items,
        updatedAt: new Date().toISOString(),
        version: 1,
      }
      localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch {
      // ignore storage error
    }
  }, [items, areaId, initialTitle, storageKey])

  // Cập nhật state dạng functional an toàn
  const commitNewState = useCallback(
    (updater: GrottoCanvasItem[] | ((prev: GrottoCanvasItem[]) => GrottoCanvasItem[])) => {
      setItems((prev) => {
        const nextItems = typeof updater === 'function' ? updater(prev) : updater
        setHistory((hist) => {
          const sliced = hist.slice(0, historyIndex + 1)
          const updated = [...sliced, nextItems]
          if (updated.length > MAX_HISTORY) {
            return updated.slice(updated.length - MAX_HISTORY)
          }
          return updated
        })
        setHistoryIndex((idx) => Math.min(idx + 1, MAX_HISTORY - 1))
        return nextItems
      })
    },
    [historyIndex],
  )

  const addItem = useCallback(
    (asset: GrottoAssetDef, pos?: { x: number; y: number }) => {
      const newId = createInstanceId()
      commitNewState((currentItems) => {
        const maxZ = currentItems.reduce((max, i) => Math.max(max, i.zIndex), 0)
        const newItem: GrottoCanvasItem = {
          instanceId: newId,
          assetId: asset.assetId,
          name: asset.name,
          category: asset.category,
          x: pos?.x ?? 400,
          y: pos?.y ?? 250,
          width: asset.defaultWidth,
          height: asset.defaultHeight,
          rotation: 0,
          zIndex: maxZ + 1,
          opacity: 1,
          materialReq: {
            materialName: asset.materialReq.materialName,
            quantity: asset.materialReq.defaultQty,
            unit: asset.materialReq.unit,
          },
        }
        return [...currentItems, newItem]
      })
      setSelectedId(newId)
    },
    [commitNewState],
  )

  const updateItem = useCallback(
    (id: string, patch: Partial<GrottoCanvasItem>) => {
      commitNewState((currentItems) =>
        currentItems.map((item) =>
          item.instanceId === id ? { ...item, ...patch } : item,
        ),
      )
    },
    [commitNewState],
  )

  const removeItem = useCallback(
    (id: string) => {
      commitNewState((currentItems) => currentItems.filter((item) => item.instanceId !== id))
      setSelectedId((prev) => (prev === id ? null : prev))
    },
    [commitNewState],
  )

  const duplicateItem = useCallback(
    (id: string) => {
      const newId = createInstanceId()
      commitNewState((currentItems) => {
        const target = currentItems.find((i) => i.instanceId === id)
        if (!target) return currentItems

        const maxZ = currentItems.reduce((max, i) => Math.max(max, i.zIndex), 0)
        const cloned: GrottoCanvasItem = {
          ...target,
          instanceId: newId,
          x: target.x + 20,
          y: target.y + 20,
          zIndex: maxZ + 1,
        }
        return [...currentItems, cloned]
      })
      setSelectedId(newId)
    },
    [commitNewState],
  )

  const bringToFront = useCallback(
    (id: string) => {
      commitNewState((currentItems) => {
        const maxZ = currentItems.reduce((max, i) => Math.max(max, i.zIndex), 0)
        return currentItems.map((item) =>
          item.instanceId === id ? { ...item, zIndex: maxZ + 1 } : item,
        )
      })
    },
    [commitNewState],
  )

  const sendToBack = useCallback(
    (id: string) => {
      commitNewState((currentItems) => {
        const minZ = currentItems.reduce((min, i) => Math.min(min, i.zIndex), 1)
        return currentItems.map((item) =>
          item.instanceId === id ? { ...item, zIndex: Math.max(0, minZ - 1) } : item,
        )
      })
    },
    [commitNewState],
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1
      const prevItems = history[targetIndex]
      setItems(prevItems)
      setHistoryIndex(targetIndex)
    }
  }, [historyIndex, history])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1
      const nextItems = history[targetIndex]
      setItems(nextItems)
      setHistoryIndex(targetIndex)
    }
  }, [historyIndex, history])

  const resetDraft = useCallback(() => {
    commitNewState([])
    setSelectedId(null)
  }, [commitNewState])

  return {
    items,
    selectedId,
    selectedItem: items.find((i) => i.instanceId === selectedId) ?? null,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    zoom,
    pan,
    gridSnap,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    bringToFront,
    sendToBack,
    undo,
    redo,
    selectItem: setSelectedId,
    setZoom,
    setPan,
    setGridSnap,
    resetDraft,
  }
}
