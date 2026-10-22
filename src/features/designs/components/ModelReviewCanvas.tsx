// Khung xem mô hình 3D (GLB) cho Design Review — L3.
//
// Dùng three.js (không có thư viện/AI tạo mô hình nào): GLTFLoader để đọc .glb,
// OrbitControls cho xoay/pan/zoom, Raycaster để ghim vị trí lên bề mặt model.
// Marker lưu theo toạ độ 3D (ModelPoint) — KHÔNG dùng toạ độ màn hình.
//
// Cleanup: dispose renderer + mọi geometry/material/texture khi đổi model hoặc
// unmount để tránh rò rỉ GPU memory. Lỗi file/WebGL chỉ hiển thị thông báo,
// không làm sập trang.
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, X } from 'lucide-react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ModelPoint } from '../position'

export interface ModelMarker extends ModelPoint {
  id: string
  /** Số hiển thị trên marker (thứ tự trong danh sách). */
  label: number
  active?: boolean
}

interface SceneRefs {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  renderer: THREE.WebGLRenderer
  markerGroup: THREE.Group
  grid: THREE.GridHelper
  pickTargets: THREE.Mesh[]
  fit: () => void
}

const DISPOSABLE_COLOR = 0x2f6b4f
const ACTIVE_COLOR = 0xdc2626
const GRID_UNIT = 10

function disposeMaterial(mat: THREE.Material | THREE.Material[] | undefined): void {
  if (!mat) return
  const list = Array.isArray(mat) ? mat : [mat]
  for (const m of list) {
    const withMap = m as THREE.Material & { map?: THREE.Texture | null }
    withMap.map?.dispose()
    m.dispose()
  }
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    mesh.geometry?.dispose?.()
    disposeMaterial((o as THREE.Mesh).material)
  })
}

/** Sprite số thứ tự marker (luôn hướng camera, không bị che bởi model). */
function makeLabelSprite(label: number, color: string): THREE.Sprite {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 34px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(label), size / 2, size / 2 + 1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.renderOrder = 20
  return sprite
}

export function ModelReviewCanvas({
  src,
  markers,
  addMode = false,
  onSelectMarker,
  onAddMarker,
  onLoadError,
  className,
}: {
  src: string
  markers: ModelMarker[]
  /** Bật chế độ chờ click lên model để thêm marker. */
  addMode?: boolean
  onSelectMarker?: (id: string) => void
  onAddMarker?: (point: ModelPoint) => void
  onLoadError?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  const hostRef = useRef<HTMLDivElement>(null)
  const refsRef = useRef<SceneRefs | null>(null)
  const cancelRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'cancelled'>('loading')
  const [progress, setProgress] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [errorKind, setErrorKind] = useState<'model' | 'context'>('model')
  const [markerRadius, setMarkerRadius] = useState(0.05)

  // Giữ callback/addMode mới nhất mà không phải dựng lại scene mỗi lần render.
  const liveRef = useRef({ onSelectMarker, onAddMarker, onLoadError, addMode })
  liveRef.current = { onSelectMarker, onAddMarker, onLoadError, addMode }

  // ── Dựng scene + load model. Dựng lại khi đổi file (src). ──────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host || !src) return
    let disposed = false
    cancelRef.current = false
    setStatus('loading')
    setProgress(null)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setErrorKind('model')
      setStatus('error')
      liveRef.current.onLoadError?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const canvas = renderer.domElement
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    canvas.style.touchAction = 'none'
    host.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000)
    camera.position.set(3, 3, 4)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.4))
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.6)
    dirLight.position.set(4, 8, 6)
    scene.add(dirLight)

    const grid = new THREE.GridHelper(GRID_UNIT, 20, 0x9aa5b1, 0xd0d7de)
    grid.position.y = 0
    const gridMat = grid.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.4
    scene.add(grid)

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    const markerGroup = new THREE.Group()
    scene.add(markerGroup)

    const refs: SceneRefs = {
      scene,
      camera,
      controls,
      renderer,
      markerGroup,
      grid,
      pickTargets: [],
      fit: () => {},
    }

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }

    refs.fit = () => {
      resize()
      const targets = refs.pickTargets
      if (!targets.length) return
      const box = new THREE.Box3()
      for (const mesh of targets) box.expandByObject(mesh)
      if (box.isEmpty()) return
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z) || 1
      grid.scale.setScalar(maxDim / GRID_UNIT || 1)
      grid.position.set(center.x, box.min.y, center.z)
      const fitDist = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 180 / 2))
      const dist = fitDist * 1.8
      camera.near = Math.max(maxDim / 100, 0.001)
      camera.far = maxDim * 100
      camera.updateProjectionMatrix()
      camera.position.set(center.x + dist * 0.45, center.y + dist * 0.5, center.z + dist)
      controls.target.copy(center)
      controls.update()
      setMarkerRadius(maxDim * 0.014)
    }

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(host)
    resize()

    const loader = new GLTFLoader()
    loader.load(
      src,
      (gltf) => {
        if (disposed || cancelRef.current) {
          disposeObject(gltf.scene)
          return
        }
        scene.add(gltf.scene)
        refs.pickTargets = []
        gltf.scene.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.isMesh) refs.pickTargets.push(mesh)
        })
        refs.fit()
        setProgress(null)
        setStatus('ready')
      },
      // onProgress chỉ phần đọc file (blob cục bộ nên rất nhanh); phần parse
      // model nặng hơn xảy ra sau khi đã đạt 100%.
      (e) => {
        if (disposed || cancelRef.current) return
        if (e.lengthComputable && e.total > 0) {
          setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)))
        }
      },
      () => {
        if (disposed || cancelRef.current) return
        setErrorKind('model')
        setStatus('error')
        liveRef.current.onLoadError?.()
      },
    )

    // ── Raycast: chọn marker hoặc ghim vị trí mới ──────────────────────────
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down: { x: number; y: number } | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      down = { x: e.clientX, y: e.clientY }
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!down) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4
      down = null
      if (moved) return
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)

      const markerHit = raycaster.intersectObjects(markerGroup.children, false)[0]
      if (markerHit) {
        const id = markerHit.object.userData.markerId as string | undefined
        if (id) liveRef.current.onSelectMarker?.(id)
        return
      }
      if (!liveRef.current.addMode) return
      const hit = raycaster.intersectObjects(refs.pickTargets, false)[0]
      if (!hit) return
      liveRef.current.onAddMarker?.({ x: hit.point.x, y: hit.point.y, z: hit.point.z })
    }

    // Mất WebGL context (máy yếu / VRAM lớn) — hiện thông báo thay vì canvas trắng.
    const onContextLost = (e: Event) => {
      e.preventDefault()
      if (disposed || cancelRef.current) return
      setErrorKind('context')
      setStatus('error')
      liveRef.current.onLoadError?.()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    refsRef.current = refs

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      disposeObject(scene)
      renderer.dispose()
      canvas.remove()
      refsRef.current = null
    }
  }, [src, reloadKey])

  // ── Đồng bộ marker khi danh sách thay đổi ────────────────────────────────
  useEffect(() => {
    const refs = refsRef.current
    if (!refs || status !== 'ready') return
    for (const child of [...refs.markerGroup.children]) {
      disposeObject(child)
    }
    refs.markerGroup.clear()
    for (const m of markers) {
      const color = m.active ? ACTIVE_COLOR : DISPOSABLE_COLOR
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(markerRadius, 16, 16),
        new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }),
      )
      mesh.position.set(m.x, m.y, m.z)
      mesh.renderOrder = 10
      mesh.userData.markerId = m.id
      refs.markerGroup.add(mesh)

      const sprite = makeLabelSprite(m.label, `#${color.toString(16).padStart(6, '0')}`)
      sprite.position.set(m.x, m.y, m.z)
      sprite.scale.setScalar(markerRadius * 5)
      sprite.userData.markerId = m.id
      refs.markerGroup.add(sprite)
    }
  }, [markers, status, markerRadius])

  const resetCamera = () => refsRef.current?.fit()
  const cancelLoad = () => {
    cancelRef.current = true
    setProgress(null)
    setStatus('cancelled')
  }
  const retry = () => {
    setErrorKind('model')
    setReloadKey((k) => k + 1)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-end gap-2">
        {status === 'loading' && (
          <Button type="button" variant="outline" size="sm" onClick={cancelLoad}>
            <X className="size-4" />
            {t('features.design.cancelLoad')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetCamera}
          disabled={status !== 'ready'}
        >
          <RotateCcw className="size-4" />
          {t('features.design.resetCamera')}
        </Button>
      </div>

      <div
        ref={hostRef}
        className={cn(
          'relative h-[420px] touch-none overflow-hidden rounded-card border border-border bg-muted/30 sm:h-[520px]',
          addMode ? 'cursor-crosshair' : 'cursor-grab',
        )}
      >
        {status === 'loading' && (
          <p className="lbl-mono absolute inset-0 grid place-items-center">
            {progress != null
              ? t('features.design.progress', { n: progress })
              : t('features.design.modelLoading')}
          </p>
        )}
        {status === 'cancelled' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="lbl-mono">{t('features.design.loadCancelled')}</p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              {t('features.design.retry')}
            </Button>
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-semibold text-destructive">
              {errorKind === 'context'
                ? t('features.design.contextLost')
                : t('features.design.modelError')}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              {t('features.design.retry')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
