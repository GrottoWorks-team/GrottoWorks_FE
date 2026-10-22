// Catalog asset của 3D Builder.
//
// TÌNH TRẠNG THẬT: repository KHÔNG có file `.glb` nào (đã kiểm tra — không có
// `*.glb` trong repo, `public/` chỉ có ảnh). Vì vậy:
//   1. Catalog mặc định chỉ gồm PRIMITIVE của three.js, gắn nhãn rõ là DEMO
//      (`source: 'DEMO_PRIMITIVE'`) để không ai nhầm là model thật.
//   2. Cơ chế manifest để bổ sung model thật: thả file vào `public/models/*.glb`
//      rồi khai báo trong `public/models/manifest.json` (xem `GlbManifestEntry`).
//      File manifest LUÔN tồn tại (mặc định `[]`) để không sinh 404 mỗi lần mở
//      Builder; manifest rỗng → catalog chỉ còn demo.
// Không tạo file .glb giả và không gọi nguồn ngoài.
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { AssetDefinition } from './types'

export const MANIFEST_URL = '/models/manifest.json'

export interface GlbManifestEntry {
  id: string
  name: string
  /** Đường dẫn trong `public/`, ví dụ `/models/hang-da.glb`. */
  url: string
  category?: string
  thumbnailUrl?: string
}

function isEntry(value: unknown): value is GlbManifestEntry {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return typeof e.id === 'string' && typeof e.name === 'string' && typeof e.url === 'string'
}

/** Đọc manifest `.glb`; không có file / lỗi mạng → mảng rỗng (không bịa asset). */
export async function fetchGlbAssets(): Promise<AssetDefinition[]> {
  try {
    const res = await fetch(MANIFEST_URL, { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const body: unknown = await res.json()
    if (!Array.isArray(body)) return []
    return body.filter(isEntry).map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category ?? 'glb',
      source: 'GLB' as const,
      url: e.url,
      thumbnailUrl: e.thumbnailUrl,
    }))
  } catch {
    return []
  }
}

/**
 * Asset demo — hình khối three.js mô phỏng các bộ phận thi công để dựng thử
 * luồng đặt/transform/layer khi chưa có model thật.
 */
export const DEMO_ASSETS: AssetDefinition[] = [
  {
    id: 'demo-block',
    name: 'builder.asset.block',
    category: 'builder.category.structure',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'BOX', size: [2, 1, 2], color: '#8d99ae' },
  },
  {
    id: 'demo-pillar',
    name: 'builder.asset.pillar',
    category: 'builder.category.structure',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'CYLINDER', size: [0.6, 3, 0.6], color: '#b08968' },
  },
  {
    id: 'demo-beam',
    name: 'builder.asset.beam',
    category: 'builder.category.structure',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'BOX', size: [4, 0.3, 0.3], color: '#6c757d' },
  },
  {
    id: 'demo-roof',
    name: 'builder.asset.roof',
    category: 'builder.category.cover',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'CONE', size: [3, 2, 3], color: '#c1121f' },
  },
  {
    id: 'demo-plank',
    name: 'builder.asset.plank',
    category: 'builder.category.cover',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'BOX', size: [3, 0.15, 1.2], color: '#a47148' },
  },
  {
    id: 'demo-lamp',
    name: 'builder.asset.lamp',
    category: 'builder.category.decor',
    source: 'DEMO_PRIMITIVE',
    primitive: { kind: 'SPHERE', size: [0.5, 0.5, 0.5], color: '#ffd166' },
  },
]

export const assetCatalogKey = ['builder', 'assets'] as const

/** Ghép asset demo + asset từ manifest `.glb` (nếu có). */
export function useAssetCatalog(): {
  assets: AssetDefinition[]
  byId: Map<string, AssetDefinition>
  isPending: boolean
} {
  const { data: glbAssets = [], isPending } = useQuery({
    queryKey: assetCatalogKey,
    queryFn: fetchGlbAssets,
    staleTime: 5 * 60_000,
  })

  const assets = useMemo(() => [...glbAssets, ...DEMO_ASSETS], [glbAssets])
  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])

  return { assets, byId, isPending }
}
