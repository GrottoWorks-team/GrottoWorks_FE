// Bản đồ mặt bằng giáo xứ (route /community/map + /parish/map).
//
// Ban hành giáo (COMMUNITY) tải ảnh mặt bằng/sơ đồ giáo xứ rồi GHIM từng khu
// vực công tác lên đó bằng toạ độ chuẩn hoá 0..1. PARISH (quản trị) xem/duyệt
// được. Trang này KHÔNG liên quan tới bản thiết kế công trình (design review) —
// theo yêu cầu nghiệp vụ committee không đụng design.
//
// ⚠️ TẠM THỜI (FE-only): BE chưa có endpoint `/parishMaps` → metadata bản đồ +
// toạ độ ghim lưu ở localStorage (features/map/localStore), ảnh ở IndexedDB
// (lib/blobStore). Khung ảnh tái dùng ImageReviewCanvas (zoom/pan + marker theo
// %), KHÔNG dùng thư viện bản đồ ngoài.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { getBlob, newBlobKey, putBlob } from '@/lib/blobStore'
import { useAuth } from '@/lib/auth'
import { useAreas } from '@/features/areas/api'
import { useSeasonContext } from '@/features/season/season-context'
import { AREA_ICONS } from '@/features/areas/components/AreaCard'
import { ImageReviewCanvas } from '@/features/designs/components/ImageReviewCanvas'
import type { CanvasMarker } from '@/features/designs/components/ImageReviewCanvas'
import type { NormalizedPoint } from '@/features/designs/coords'
import { errorMessage } from '@/lib/errorMessage'
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_BYTES,
  formatBytes,
  validateImageFile,
} from '@/features/designs/config'
import { useParishMap, useMapPins, useSaveParishMap, useSetMapPin } from '../api'

const FILE_ERROR_KEY: Record<'type' | 'size' | 'empty', string> = {
  type: 'features.map.errType',
  size: 'features.map.errSize',
  empty: 'features.map.errEmpty',
}

export default function ParishMapPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  // Bản đồ của một mùa: role có khung chọn mùa chỉ lấy khu vực của mùa đó;
  // role không có picker (PARISH) vẫn xem toàn bộ như trước.
  const { seasonId } = useSeasonContext()
  const { data: areas = [] } = useAreas(seasonId ? [seasonId] : undefined)
  const { data: mapRecord, isPending: mapPending } = useParishMap()
  const saveMap = useSaveParishMap()
  const { data: pins = {} } = useMapPins()
  const setPin = useSetMapPin()
  const fileRef = useRef<HTMLInputElement>(null)

  // Ban hành giáo + quản trị được phân bổ; các vai trò khác (nếu tới được) chỉ xem.
  const canEdit = user?.role === 'COMMUNITY' || user?.role === 'PARISH'

  // Ban hành giáo chỉ phân bổ khu vực mình quản lý — khớp bộ lọc AreaListPage.
  // Giữ nguyên thứ tự tạo: khu tạo trước ở trên, tạo sau ở dưới.
  const scopedAreas = useMemo(() => {
    return user?.role === 'COMMUNITY' && user.communityId
      ? areas.filter((a) => a.communityId === user.communityId)
      : areas
  }, [areas, user])

  // Số thứ tự 1..n hiển thị đồng bộ giữa marker trên bản đồ và danh sách bên phải.
  const numbered = useMemo(() => scopedAreas.map((area, i) => ({ area, n: i + 1 })), [scopedAreas])

  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [placingId, setPlacingId] = useState<string | null>(null)

  // ── Ảnh bản đồ: nạp blob IndexedDB → object URL, thu hồi khi đổi/xoá ──
  const [imageUrl, setImageUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const urlRef = useRef('')
  useEffect(() => {
    let cancelled = false
    setImageError(false)
    setImageUrl('')
    void (async () => {
      if (!mapRecord) return
      const blob = await getBlob(mapRecord.imageKey).catch(() => null)
      if (cancelled) return
      if (!blob) {
        setImageError(true)
        return
      }
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setImageUrl(url)
    })()
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = ''
      }
    }
  }, [mapRecord])

  const markers = useMemo<CanvasMarker[]>(
    () =>
      numbered
        .filter(({ area }) => Boolean(pins[area.id]))
        .map(({ area, n }) => ({
          id: area.id,
          x: pins[area.id].x,
          y: pins[area.id].y,
          label: n,
          active: area.id === activeAreaId,
        })),
    [numbered, pins, activeAreaId],
  )

  const onPickFile = async (file: File | null) => {
    if (!file) return
    const check = validateImageFile(file)
    if (!check.ok) {
      toast(t(FILE_ERROR_KEY[check.reason]), 'alert')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    try {
      const key = newBlobKey('parishmap')
      await putBlob(key, file)
      await saveMap.mutateAsync({ id: mapRecord?.id, imageKey: key, fileName: file.name })
      toast(t('features.map.mapSaved'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const placeAt = async (point: NormalizedPoint) => {
    if (!placingId) return
    try {
      await setPin.mutateAsync({ areaId: placingId, pin: { x: point.x, y: point.y } })
      toast(t('features.map.positionSaved'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    } finally {
      setPlacingId(null)
    }
  }

  const clearPosition = async (id: string) => {
    try {
      await setPin.mutateAsync({ areaId: id, pin: null })
      toast(t('features.map.positionCleared'))
    } catch (err) {
      toast(errorMessage(err), 'alert')
    }
  }

  if (mapPending) return <p className="lbl-mono">{t('common.loading')}</p>

  return (
    <div>
      <PageHeader
        title={t('features.map.title')}
        sub={t('features.map.sub')}
        actions={
          canEdit ? (
            <>
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT_ATTR}
                className="hidden"
                onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
              />
              <Button
                variant={mapRecord ? 'outline' : 'default'}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                {mapRecord ? t('features.map.replace') : t('features.map.upload')}
              </Button>
            </>
          ) : undefined
        }
      />

      {!mapRecord ? (
        <Card className="p-8 text-center">
          <EmptyState
            text={t('features.map.noMap')}
            action={
              canEdit ? (
                <Button onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  {t('features.map.upload')}
                </Button>
              ) : undefined
            }
          />
          {canEdit && (
            <p className="text-xs text-muted-foreground">
              {t('features.map.fileHint', {
                types: ACCEPTED_IMAGE_TYPES.map((x) => x.replace('image/', '')).join(', '),
                size: formatBytes(MAX_IMAGE_BYTES),
              })}
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ── Khung bản đồ ─────────────────────────────────────────── */}
          <Card className="p-4">
            {imageUrl ? (
              <ImageReviewCanvas
                src={imageUrl}
                markers={markers}
                addMode={!!placingId}
                onSelectMarker={(id) => setActiveAreaId(id)}
                onAddMarker={(point) => void placeAt(point)}
                onLoadError={() => setImageError(true)}
              />
            ) : (
              <p
                className={cn(
                  'lbl-mono grid h-[420px] place-items-center px-6 text-center sm:h-[520px]',
                  imageError && 'text-destructive',
                )}
              >
                {imageError ? t('features.map.storageMissing') : t('common.loading')}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {placingId ? t('features.map.clickOnMap') : t('features.map.hint')}
            </p>
          </Card>

          {/* ── Danh sách khu vực để phân bổ ──────────────────────────── */}
          <Card className="h-fit p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="lbl-mono">{t('features.map.areasTitle')}</p>
              <span className="tabular text-xs font-semibold text-muted-foreground">
                {markers.length}/{numbered.length}
              </span>
            </div>

            {numbered.length === 0 ? (
              <EmptyState text={t('features.map.emptyAreas')} />
            ) : (
              <ul className="space-y-3">
                {numbered.map(({ area, n }) => {
                  const Icon = AREA_ICONS[area.type]
                  const placed = Boolean(pins[area.id])
                  const isPlacing = placingId === area.id
                  return (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => setActiveAreaId(area.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                          activeAreaId === area.id
                            ? 'border-primary bg-brand-pineLight'
                            : 'border-border bg-card hover:border-primary/50',
                        )}
                      >
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-pine font-mono text-[11px] font-bold text-white">
                          {n}
                        </span>
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {area.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t(`features.areas.areaType.${area.type}`)} ·{' '}
                            {placed ? t('features.map.positioned') : t('features.map.notPositioned')}
                          </span>
                        </span>
                      </button>

                      {canEdit && (
                        <div className="mt-1 flex gap-2">
                          <Button
                            size="sm"
                            variant={isPlacing ? 'default' : 'outline'}
                            onClick={() => {
                              setActiveAreaId(area.id)
                              setPlacingId(isPlacing ? null : area.id)
                            }}
                          >
                            <MapPin className="size-3.5" />
                            {isPlacing ? t('features.map.placing') : t('features.map.place')}
                          </Button>
                          {placed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void clearPosition(area.id)}
                            >
                              <Trash2 className="size-3.5" />
                              {t('features.map.clearPosition')}
                            </Button>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
