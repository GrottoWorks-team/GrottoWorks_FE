// Canvas 3D của Layer Builder — three.js thuần (không R3F), theo đúng pattern
// `ModelReviewCanvas.tsx`: GLTFLoader + OrbitControls + Raycaster + dispose GPU.
//
// Trách nhiệm: dựng scene, nạp asset, chọn/đặt item, gizmo transform, ghost
// preview khi kéo, tách lớp (chỉ dịch group của layer — KHÔNG ghi vào transform
// item). Mọi thay đổi dữ liệu đều báo ngược lên cha qua callback; canvas không
// tự sửa scene.
//
// Quy ước toạ độ: Y là trục đứng, mặt đất Y = 0, gốc của mỗi item là TÂM ĐÁY
// (đã chuẩn hoá bằng bounding box sau khi nạp — không giả định pivot của model).
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { cn } from '@/lib/utils'
import type {
  AssetDefinition,
  ConstructionScene,
  PlaceMode,
  TransformMode,
  Vec3,
} from '../types'

export interface CanvasTransform {
  position: Vec3
  rotation: Vec3
  scale: Vec3
}

export interface BuilderCanvasProps {
  scene: ConstructionScene
  assetById: Map<string, AssetDefinition>
  selectedItemId: string | null
  transformMode: TransformMode
  placeMode: PlaceMode
  /** Căn item theo pháp tuyến bề mặt khi đặt lên mesh khác. */
  alignToSurface: boolean
  /** Asset đang chờ đặt bằng click (đã chọn trong thư viện). */
  pendingAssetId: string | null
  /** Asset đang bị kéo từ thư viện — dùng để vẽ ghost đúng kích thước. */
  draggingAssetId: string | null
  /** 0..1 — hệ số tách lớp (exploded view). */
  explode: number
  onSelect: (itemId: string | null) => void
  onPlace: (assetId: string, position: Vec3, rotation: Vec3) => void
  onTransform: (itemId: string, transform: CanvasTransform) => void
  /** Lỗi WebGL (không tạo được context) hoặc lỗi tải model. */
  onError?: (kind: 'context' | 'model') => void
  /** Chỉ xem: không gắn gizmo, không đặt/không sửa item (dùng ở trang Bản thiết kế). */
  readOnly?: boolean
  className?: string
}

interface Runtime {
  host: HTMLDivElement
  renderer: THREE.WebGLRenderer
  scene3: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  gizmo: TransformControls
  root: THREE.Group
  layerGroups: Map<string, THREE.Group>
  itemObjects: Map<string, THREE.Object3D>
  materials: Map<string, THREE.Material>
  templates: Map<string, THREE.Object3D>
  ghost: THREE.LineSegments
  selection: THREE.BoxHelper
  ground: THREE.Mesh
  raycaster: THREE.Raycaster
  dispose: () => void
}

const UP = new THREE.Vector3(0, 1, 0)
const EXPLODE_STEP = 2

/** Dịch model để TÂM ĐÁY trùng gốc toạ độ (pivot model rất khác nhau). */
function anchorBottom(group: THREE.Object3D): void {
  group.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(group)
  if (box.isEmpty()) return
  const center = box.getCenter(new THREE.Vector3())
  const dy = Number.isFinite(box.min.y) ? box.min.y : 0
  for (const child of group.children) {
    child.position.x -= center.x
    child.position.z -= center.z
    child.position.y -= dy
  }
  group.updateMatrixWorld(true)
}

function primitiveMesh(def: AssetDefinition, material: THREE.Material): THREE.Mesh {
  const spec = def.primitive!
  const [w, h, d] = spec.size
  let geometry: THREE.BufferGeometry
  switch (spec.kind) {
    case 'CYLINDER':
      geometry = new THREE.CylinderGeometry(w / 2, w / 2, h, 28)
      break
    case 'CONE':
      geometry = new THREE.ConeGeometry(w / 2, h, 28)
      break
    case 'SPHERE':
      geometry = new THREE.SphereGeometry(w / 2, 28, 18)
      break
    default:
      geometry = new THREE.BoxGeometry(w, h, d)
  }
  const mesh = new THREE.Mesh(geometry, material)
  // `ownGeometry` = hình học tạo riêng cho instance này → được dispose khi xoá.
  mesh.userData.ownGeometry = true
  return mesh
}

function disposeItemObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && mesh.userData.ownGeometry) mesh.geometry?.dispose()
  })
}

export function BuilderCanvas(props: BuilderCanvasProps) {
  const {
    scene,
    assetById,
    selectedItemId,
    transformMode,
    placeMode,
    alignToSurface,
    pendingAssetId,
    draggingAssetId,
    explode,
    onSelect,
    onPlace,
    onTransform,
    onError,
    readOnly = false,
    className,
  } = props

  const hostRef = useRef<HTMLDivElement>(null)
  const rtRef = useRef<Runtime | null>(null)
  const [status, setStatus] = useState<'init' | 'ready' | 'error'>('init')

  // Callback/prop mới nhất cho handler gắn một lần lúc mount.
  const liveRef = useRef({ placeMode, alignToSurface, pendingAssetId, onSelect, onPlace, onError, readOnly })
  liveRef.current = { placeMode, alignToSurface, pendingAssetId, onSelect, onPlace, onError, readOnly }

  // Tham chiếu mới nhất của dữ liệu mà handler cần (không gây dựng lại scene).
  const assetByIdRef = useRef(assetById)
  assetByIdRef.current = assetById
  const draggingRef = useRef(draggingAssetId)
  draggingRef.current = draggingAssetId

  // ── 1. Dựng hạ tầng WebGL (một lần) ──────────────────────────────────────
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setStatus('error')
      liveRef.current.onError?.('context')
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)

    const scene3 = new THREE.Scene()
    scene3.background = new THREE.Color('#f4f6f6')

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500)
    camera.position.set(7, 6, 9)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0.6, 0)
    controls.maxPolarAngle = Math.PI / 2 - 0.02
    controls.update()

    scene3.add(new THREE.HemisphereLight(0xffffff, 0x9aa5b1, 1.1))
    const dir = new THREE.DirectionalLight(0xffffff, 1.6)
    dir.position.set(6, 12, 8)
    scene3.add(dir)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 120),
      new THREE.MeshStandardMaterial({ color: '#e9edee', roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.userData.isGround = true
    scene3.add(ground)

    const grid = new THREE.GridHelper(60, 60, 0xc7d2d4, 0xdfe6e8)
    grid.position.y = 0.002
    scene3.add(grid)

    const root = new THREE.Group()
    scene3.add(root)

    const gizmo = new TransformControls(camera, renderer.domElement)
    gizmo.setSize(0.9)
    scene3.add(gizmo.getHelper())

    const ghost = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x0a5c36 }),
    )
    ghost.visible = false
    scene3.add(ghost)

    const selection = new THREE.BoxHelper(new THREE.Object3D(), 0x0a5c36)
    selection.visible = false
    scene3.add(selection)

    const rt: Runtime = {
      host,
      renderer,
      scene3,
      camera,
      controls,
      gizmo,
      root,
      layerGroups: new Map(),
      itemObjects: new Map(),
      materials: new Map(),
      templates: new Map(),
      ghost,
      selection,
      ground,
      raycaster: new THREE.Raycaster(),
      dispose: () => undefined,
    }
    rtRef.current = rt

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    renderer.setAnimationLoop(() => {
      controls.update()
      selection.update()
      renderer.render(scene3, camera)
    })

    // Gizmo kéo ↔ camera: tắt orbit khi đang kéo để không xoay camera oan.
    const onGizmoDown = () => {
      controls.enabled = false
    }
    const onGizmoUp = () => {
      controls.enabled = true
      const object = gizmo.object
      const itemId = object?.userData.itemId as string | undefined
      if (!object || !itemId) return
      onTransform(itemId, {
        position: [object.position.x, object.position.y, object.position.z],
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        scale: [object.scale.x, object.scale.y, object.scale.z],
      })
    }
    gizmo.addEventListener('mouseDown', onGizmoDown)
    gizmo.addEventListener('mouseUp', onGizmoUp)

    // ── Raycast helpers ────────────────────────────────────────────────────
    const toNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    const itemIdAt = (object: THREE.Object3D | null): string | null => {
      let current: THREE.Object3D | null = object
      while (current) {
        const id = current.userData.itemId as string | undefined
        if (id) return id
        current = current.parent
      }
      return null
    }

    /** Điểm đặt + hướng xoay mong muốn theo chế độ đặt hiện tại. */
    const placementAt = (
      clientX: number,
      clientY: number,
    ): { position: Vec3; rotation: Vec3 } | null => {
      const mode = liveRef.current.placeMode
      const ndc = toNdc(clientX, clientY)
      rt.raycaster.setFromCamera(ndc, camera)

      if (mode === 'surface') {
        const hits = rt.raycaster.intersectObjects(rt.root.children, true)
        const hit = hits.find((h) => itemIdAt(h.object) !== null)
        if (hit) {
          const normal = hit.face
            ? hit.face.normal
                .clone()
                .applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld))
                .normalize()
            : UP.clone()
          const rotation: Vec3 = liveRef.current.alignToSurface
            ? (() => {
                const q = new THREE.Quaternion().setFromUnitVectors(UP, normal)
                const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
                return [e.x, e.y, e.z] as Vec3
              })()
            : [0, 0, 0]
          return {
            position: [hit.point.x, hit.point.y, hit.point.z],
            rotation,
          }
        }
        // Không chạm mesh nào → rơi về mặt đất để người dùng vẫn đặt được.
      }

      const groundHits = rt.raycaster.intersectObject(rt.ground, false)
      if (groundHits.length) {
        const p = groundHits[0].point
        return { position: [p.x, 0, p.z], rotation: [0, 0, 0] }
      }
      // Ngoài mặt phẳng nền → giao với mặt phẳng Y=0 để vẫn có điểm hợp lý.
      const plane = new THREE.Plane(UP.clone(), 0)
      const point = new THREE.Vector3()
      if (rt.raycaster.ray.intersectPlane(plane, point)) {
        return { position: [point.x, 0, point.z], rotation: [0, 0, 0] }
      }
      return null
    }

    const showGhost = (clientX: number, clientY: number) => {
      const assetId = liveRef.current.pendingAssetId
      if (!assetId) {
        ghost.visible = false
        return
      }
      const placement = placementAt(clientX, clientY)
      if (!placement) {
        ghost.visible = false
        return
      }
      const def = assetByIdRef.current.get(assetId)
      const size = def?.primitive?.size ?? [1, 1, 1]
      ghost.scale.set(size[0], size[1], size[2])
      ghost.position.set(
        placement.position[0],
        placement.position[1] + size[1] / 2,
        placement.position[2],
      )
      ghost.visible = true
    }

    // ── Chuột: chọn item hoặc đặt asset đang chờ ───────────────────────────
    let downX = 0
    let downY = 0
    const onPointerDown = (event: PointerEvent) => {
      downX = event.clientX
      downY = event.clientY
    }
    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (Math.abs(event.clientX - downX) > 4 || Math.abs(event.clientY - downY) > 4) return
      if (gizmo.dragging) return
      // Chế độ chỉ xem: không đặt item, không gắn gizmo.
      if (liveRef.current.readOnly) return

      const pending = liveRef.current.pendingAssetId
      if (pending) {
        const placement = placementAt(event.clientX, event.clientY)
        if (placement) liveRef.current.onPlace(pending, placement.position, placement.rotation)
        return
      }

      const ndc = toNdc(event.clientX, event.clientY)
      rt.raycaster.setFromCamera(ndc, camera)
      const hits = rt.raycaster.intersectObjects(rt.root.children, true)
      const hit = hits.find((h) => itemIdAt(h.object) !== null)
      liveRef.current.onSelect(hit ? itemIdAt(hit.object) : null)
    }
    const onPointerMove = (event: PointerEvent) => {
      if (liveRef.current.pendingAssetId) showGhost(event.clientX, event.clientY)
    }

    // ── Kéo asset từ thư viện (HTML5 drag & drop) ──────────────────────────
    const onDragOver = (event: DragEvent) => {
      event.preventDefault()
      if (liveRef.current.readOnly) return
      const assetId = draggingRef.current
      if (!assetId) return
      const placement = placementAt(event.clientX, event.clientY)
      if (!placement) {
        ghost.visible = false
        return
      }
      const def = assetByIdRef.current.get(assetId)
      const size = def?.primitive?.size ?? [1, 1, 1]
      ghost.scale.set(size[0], size[1], size[2])
      ghost.position.set(
        placement.position[0],
        placement.position[1] + size[1] / 2,
        placement.position[2],
      )
      ghost.visible = true
    }
    const onDragLeave = () => {
      ghost.visible = false
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      ghost.visible = false
      if (liveRef.current.readOnly) return
      const assetId =
        event.dataTransfer?.getData('text/plain') || draggingRef.current || ''
      if (!assetId) return
      const placement = placementAt(event.clientX, event.clientY)
      if (placement) liveRef.current.onPlace(assetId, placement.position, placement.rotation)
    }

    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)
    host.addEventListener('dragover', onDragOver)
    host.addEventListener('dragleave', onDragLeave)
    host.addEventListener('drop', onDrop)

    rt.dispose = () => {
      observer.disconnect()
      renderer.setAnimationLoop(null)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      host.removeEventListener('dragover', onDragOver)
      host.removeEventListener('dragleave', onDragLeave)
      host.removeEventListener('drop', onDrop)
      gizmo.removeEventListener('mouseDown', onGizmoDown)
      gizmo.removeEventListener('mouseUp', onGizmoUp)
      gizmo.detach()
      // three r169: TransformControls kế thừa `Controls` nên `dispose()` của nó
      // gọi `this.traverse` (chỉ có trên helper) → TypeError. Tự giải phóng
      // helper thay vì gọi dispose().
      gizmo.disconnect()
      const helper = gizmo.getHelper()
      helper.traverse((child) => {
        const mesh = child as THREE.Mesh
        mesh.geometry?.dispose?.()
        const mats = mesh.material
          ? Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          : []
        for (const m of mats) m.dispose()
      })
      scene3.remove(helper)
      controls.dispose()
      for (const object of rt.itemObjects.values()) disposeItemObject(object)
      for (const template of rt.templates.values()) {
        template.traverse((child) => {
          const mesh = child as THREE.Mesh
          if (mesh.isMesh) {
            mesh.geometry?.dispose()
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const m of mats) {
              const map = (m as THREE.Material & { map?: THREE.Texture | null }).map
              map?.dispose()
              m.dispose()
            }
          }
        })
      }
      for (const material of rt.materials.values()) material.dispose()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      ghost.geometry.dispose()
      ;(ghost.material as THREE.Material).dispose()
      selection.geometry.dispose()
      ;(selection.material as THREE.Material).dispose()
      renderer.dispose()
      if (canvas.parentElement === host) host.removeChild(canvas)
    }

    setStatus('ready')
    return () => {
      rt.dispose()
      rtRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ dựng một lần
  }, [])

  // Tham chiếu mới nhất của dữ liệu mà handler cần (không gây dựng lại scene).

  // ── 2. Đồng bộ cấu trúc: layer group + item object ───────────────────────
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return

    // Layer groups
    const layerIds = new Set(scene.layers.map((l) => l.id))
    for (const [id, group] of rt.layerGroups) {
      if (!layerIds.has(id)) {
        rt.root.remove(group)
        rt.layerGroups.delete(id)
      }
    }
    for (const layer of scene.layers) {
      let group = rt.layerGroups.get(layer.id)
      if (!group) {
        group = new THREE.Group()
        group.userData.layerId = layer.id
        rt.root.add(group)
        rt.layerGroups.set(layer.id, group)
      }
      group.visible = layer.visible
      group.position.set(0, layer.order * EXPLODE_STEP * explode, 0)
    }

    // Item objects
    const itemIds = new Set(scene.items.map((i) => i.id))
    for (const [id, object] of rt.itemObjects) {
      if (!itemIds.has(id)) {
        object.parent?.remove(object)
        disposeItemObject(object)
        rt.itemObjects.delete(id)
      }
    }

    for (const item of scene.items) {
      let object = rt.itemObjects.get(item.id)
      if (!object) {
        const def = assetById.get(item.assetId)
        if (!def) continue // asset không còn trong catalog → bỏ qua, giữ dữ liệu
        object = new THREE.Group()
        object.userData.itemId = item.id
        if (def.source === 'DEMO_PRIMITIVE' && def.primitive) {
          let material = rt.materials.get(def.id)
          if (!material) {
            material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(def.primitive.color),
              roughness: 0.75,
              metalness: 0.05,
            })
            rt.materials.set(def.id, material)
          }
          object.add(primitiveMesh(def, material))
          anchorBottom(object)
        } else if (def.source === 'GLB' && def.url) {
          const wrapper = object
          void loadTemplate(rt, def).then((template) => {
            // Item có thể đã bị xoá trong lúc chờ tải.
            if (rt.itemObjects.get(item.id) !== wrapper) return
            if (!template) {
              liveRef.current.onError?.('model')
              return
            }
            wrapper.add(cloneSkeleton(template))
            anchorBottom(wrapper)
          })
        }
        rt.itemObjects.set(item.id, object)
      }

      const group = rt.layerGroups.get(item.layerId)
      if (group && object.parent !== group) group.add(object)

      const dragging = rt.gizmo.dragging && rt.gizmo.object === object
      if (!dragging) {
        object.position.set(...item.position)
        object.rotation.set(...item.rotation)
        object.scale.set(...item.scale)
      }
    }
  }, [scene, assetById, explode])

  // ── 3. Chọn item: gắn/ tháo gizmo + khung chọn ───────────────────────────
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return
    const object = selectedItemId ? rt.itemObjects.get(selectedItemId) : undefined
    const layer = scene.layers.find((l) => l.id === object?.parent?.userData.layerId)
    const editable =
      !readOnly && Boolean(object) && layer?.locked !== true && layer?.visible !== false

    if (object && editable) {
      rt.gizmo.attach(object)
      rt.selection.setFromObject(object)
      rt.selection.visible = true
    } else {
      rt.gizmo.detach()
      rt.selection.visible = false
    }
  }, [selectedItemId, scene, readOnly])

  // ── 4. Chế độ gizmo ──────────────────────────────────────────────────────
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return
    rt.gizmo.setMode(transformMode)
  }, [transformMode])

  // ── 5. Ghost biến mất khi hết asset chờ đặt ──────────────────────────────
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return
    rt.ghost.visible = false
  }, [pendingAssetId, draggingAssetId, placeMode])

  return (
    <div
      ref={hostRef}
      role="application"
      aria-label="3D builder canvas"
      className={cn('relative h-full w-full overflow-hidden rounded-card bg-[#f4f6f6]', className)}
      data-testid="builder-canvas"
    >
      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">
          Trình duyệt không khởi tạo được WebGL — không thể mở trình dựng 3D.
        </div>
      )}
    </div>
  )
}

/** Nạp & cache model GLB theo assetId (nhiều item dùng chung một model). */
async function loadTemplate(
  rt: Runtime,
  def: AssetDefinition,
): Promise<THREE.Object3D | null> {
  const cached = rt.templates.get(def.id)
  if (cached) return cached
  if (!def.url) return null
  try {
    const gltf = await new GLTFLoader().loadAsync(def.url)
    // Clone đầu tiên để anchor không làm lệch template gốc.
    rt.templates.set(def.id, gltf.scene)
    return gltf.scene
  } catch {
    return null
  }
}
