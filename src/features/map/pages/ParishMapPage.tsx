// Bản đồ mặt bằng giáo xứ — TRANG CON của "Giáo xứ & cộng đoàn"
// (`/parish/communities/map?parish=<id>`, cũng mở được ở `/community/map`).
//
// ADMIN (role FE `PARISH`) là người TẢI ảnh mặt bằng/sơ đồ giáo xứ. Quyền GHIM
// vị trí khu vực công tác lên sơ đồ (toạ độ chuẩn hoá 0..1) thuộc Ban hành giáo
// (role FE `COMMUNITY`); ADMIN chỉ XEM, không được ghim (yêu cầu 11/11/2026).
// Trang này KHÔNG liên quan tới bản thiết kế công trình (design review). ADMIN
// xem nhiều giáo xứ nên mỗi giáo xứ có ảnh + ghim riêng (`?parish=`).
//
// Ảnh và metadata bản đồ dùng API; toạ độ ghim còn lưu ở localStorage.
// Khung ảnh tái dùng ImageReviewCanvas (zoom/pan + marker theo %).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Trash2, Upload } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { uploadFileViaGateway, getFileDownloadUrl } from '@/features/files/api'
import { useAuth } from '@/lib/auth'
import { useAreas, useSeasons } from '@/features/areas/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useParishScope } from '@/features/parish/hooks'
import type { ParishScope } from '@/features/parish/hooks'
import { ParishSwitcher } from '@/features/parish/components/ParishSwitcher'
import { AREA_ICONS } from '@/features/areas/components/AreaCard'
import { AreaDetailDialog } from '@/features/areas/components/AreaDetailDialog'
import { ImageReviewCanvas } from '@/features/designs/components/ImageReviewCanvas'
import type { CanvasMarker } from '@/features/designs/components/ImageReviewCanvas'
import type { NormalizedPoint } from '@/features/designs/coords'
import {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_BYTES,
  formatBytes,
  validateImageFile,
} from '@/features/designs/config'
import { useParishMap, pinsOfAreas, useSaveParishMap, useSetMapPin } from '../api'

const FILE_ERROR_KEY: Record<'type' | 'size' | 'empty', string> = {
  type: 'features.map.errType',
  size: 'features.map.errSize',
  empty: 'features.map.errEmpty',
}

interface UploadedMap {
  parishId: string
  id?: string
  fileId: string
  fileName: string
}

export default function ParishMapPage({ embedded = false }: { embedded?: boolean } = {}) {
  const scope = useParishScope()
  // Đổi giáo xứ huỷ trạng thái thử lại và tách các request của giáo xứ cũ.
  return <ParishMapContent key={scope.parishId} scope={scope} embedded={embedded} />
}

function ParishMapContent({ scope, embedded }: { scope: ParishScope; embedded: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const { parishId, parish, canPickParish } = scope
  // Bản đồ của một mùa: role có khung chọn mùa chỉ lấy khu vực của mùa đó;
  // ADMIN xem mọi khu của giáo xứ đang chọn.
  const { seasonId } = useSeasonContext()
  const { data: seasons = [] } = useSeasons()
  const seasonIds = useMemo(() => {
    if (seasonId) return [seasonId]
    const ids = seasons.filter((s) => s.parishId === parishId).map((s) => s.id)
    return ids.length > 0 ? ids : undefined
  }, [seasonId, seasons, parishId])
  const { data: areas = [] } = useAreas(seasonIds)
  const { data: mapRecord, isPending: mapPending } = useParishMap(parishId)
  const saveMap = useSaveParishMap(parishId)
  const pins = useMemo(() => pinsOfAreas(areas), [areas])
  const setPin = useSetMapPin()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadedMap, setUploadedMap] = useState<UploadedMap | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Ảnh sơ đồ: ADMIN (role FE `PARISH`) tải lên. Ghim vị trí khu vực: Ban hành
  // giáo (role FE `COMMUNITY`) — ADMIN chỉ xem, KHÔNG được ghim (11/11/2026).
  // Quyền thật phải do BE chốt khi có `/parishes/{id}/map` — xem
  // GrottoWorks_BE/docs/BE-TODO-demo-2026-11-10.md.
  const canUpload = user?.role === 'PARISH'
  const canPin = user?.role === 'COMMUNITY'

  // Giữ nguyên thứ tự tạo: khu tạo trước ở trên, tạo sau ở dưới.
  const scopedAreas = useMemo(() => areas, [areas])

  // Số thứ tự 1..n hiển thị đồng bộ giữa marker trên bản đồ và danh sách bên phải.
  const numbered = useMemo(() => scopedAreas.map((area, i) => ({ area, n: i + 1 })), [scopedAreas])

  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [placingId, setPlacingId] = useState<string | null>(null)
  // 26/11/2026: bấm vào khu trên bản đồ mở chi tiết (có tab Hình ảnh).
  const [detailAreaId, setDetailAreaId] = useState<string | null>(null)

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
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mapRecord.imageKey)) {
        // Legacy/mock map metadata was never backed by a NotificationAudit file.
        const { mapStore } = await import('../localStore')
        mapStore.removeMap(parishId)
        if (!cancelled) setImageError(true)
        return
      }
      const download = await getFileDownloadUrl(mapRecord.imageKey).catch(() => null)
      if (cancelled) return
      if (!download?.downloadUrl) {
        setImageError(true)
        return
      }
      setImageUrl(download.downloadUrl)
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

  const submitMap = async (file?: File) => {
    if (submittingRef.current || !canUpload || !parishId) return
    if (file) {
      const check = validateImageFile(file)
      if (!check.ok) {
        toast(t(FILE_ERROR_KEY[check.reason]), 'alert')
        if (fileRef.current) fileRef.current.value = ''
        return
      }
    }
    if (!file && !uploadedMap) return
    submittingRef.current = true
    setIsSubmitting(true)
    if (file) {
      setSaveError(null)
      setUploadedMap(null)
    }
    try {
      let draft = uploadedMap
      if (file) {
        const uploaded = await uploadFileViaGateway(file, 'MAP_IMAGE')
        if (!mountedRef.current) return
        draft = { parishId, id: mapRecord?.id, fileId: uploaded.fileId, fileName: uploaded.fileName }
        setUploadedMap(draft)
      }
      if (!draft || draft.parishId !== parishId) return
      await saveMap.mutateAsync({ id: draft.id, imageKey: draft.fileId, fileName: draft.fileName })
      if (!mountedRef.current) return
      setUploadedMap(null)
      toast(t('features.map.mapSaved'))
    } catch (error) {
      if (!mountedRef.current) return
      // FILE_ATTACHMENT_PENDING (503): BE đã ghi metadata bản đồ nhưng worker chưa chốt tệp.
      // Giữ metadata đã upload để nút "Thử lại" chỉ PUT lại, KHÔNG upload lại ảnh.
      const message =
        error instanceof ApiError && error.status === 503 && error.code === 'FILE_ATTACHMENT_PENDING'
          ? t('features.map.imageProcessing')
          : error instanceof TypeError && /fetch|network/i.test(error.message)
            ? t('features.map.uploadCorsFailed')
            : error instanceof Error ? error.message : t('common.error')
      setSaveError(message)
      toast(message, 'alert')
    } finally {
      if (mountedRef.current) {
        submittingRef.current = false
        setIsSubmitting(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    }
  }

  const placeAt = async (point: NormalizedPoint) => {
    if (!placingId) return
    try {
      await setPin.mutateAsync({
        areaId: placingId,
        version: areas.find((area) => area.id === placingId)?.version,
        pin: { x: point.x, y: point.y },
      })
      toast(t('features.map.positionSaved'))
    } catch {
      toast(t('common.error'), 'alert')
    } finally {
      setPlacingId(null)
    }
  }

  const clearPosition = async (id: string) => {
    try {
      await setPin.mutateAsync({ areaId: id, version: areas.find((area) => area.id === id)?.version, pin: null })
      toast(t('features.map.positionCleared'))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  if (mapPending) return <p className="lbl-mono">{t('common.loading')}</p>

  return (
    <div>
      {canUpload && (
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT_ATTR}
          className="hidden"
          disabled={isSubmitting || !parishId}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void submitMap(file)
          }}
        />
      )}
      {!embedded && canPickParish && (
        <Link
          to={`/parish/communities${parishId ? `?parish=${encodeURIComponent(parishId)}` : ''}`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          {t('features.parish.backToHub')}
        </Link>
      )}
      {!embedded && <PageHeader
        title={parish?.name ? `${t('features.map.title')} — ${parish.name}` : t('features.map.title')}
        sub={t('features.map.sub')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ParishSwitcher scope={scope} />
            {canUpload && (
              <>
                <Button
                  variant={mapRecord ? 'outline' : 'default'}
                  disabled={isSubmitting || !parishId}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {mapRecord ? t('features.map.replace') : t('features.map.upload')}
                </Button>
              </>
            )}
          </div>
        }
      />}

      {embedded && canUpload && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-card border border-border bg-card p-3">
          <span className="text-sm font-semibold text-foreground">{t('features.map.title')}</span>
          <Button
            variant={mapRecord ? 'outline' : 'default'}
            size="sm"
            disabled={isSubmitting || !parishId}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {mapRecord ? t('features.map.replace') : t('features.map.upload')}
          </Button>
          {mapRecord?.fileName ? (
            <span className="text-xs text-muted-foreground">{mapRecord.fileName}</span>
          ) : null}
          <span className="ml-auto text-[11px] text-muted-foreground">{t('features.map.uploadHint')}</span>
        </div>
      )}

      {canUpload && uploadedMap && saveError && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
          <p className="flex-1 text-sm">{saveError}</p>
          <Button variant="outline" disabled={isSubmitting} onClick={() => void submitMap()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {!canPin && mapRecord && (
        <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {t('features.map.readOnlyHint')}
        </p>
      )}

      {!mapRecord ? (
        <Card className="p-8 text-center">
          <EmptyState
            text={t('features.map.noMap')}
            action={
              canUpload ? (
                <Button disabled={isSubmitting || !parishId} onClick={() => fileRef.current?.click()}>
                  <Upload className="size-4" />
                  {t('features.map.upload')}
                </Button>
              ) : undefined
            }
          />
          {canUpload && (
            <p className="text-xs text-muted-foreground">
              {t('features.map.fileHint', {
                types: ACCEPTED_IMAGE_TYPES.map((x) => x.replace('image/', '')).join(', '),
                size: formatBytes(MAX_IMAGE_BYTES),
              })}
            </p>
          )}
          {!canUpload && (
            <p className="text-xs text-muted-foreground">
              {t('features.map.uploadedByAdmin')}
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
                addMode={canPin && !!placingId}
                onSelectMarker={(id) => {
                  setActiveAreaId(id)
                  if (!placingId) setDetailAreaId(id)
                }}
                onAddMarker={canPin ? (point) => void placeAt(point) : undefined}
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
                  const Icon = (area.type && AREA_ICONS[area.type]) || MapPin
                  const placed = Boolean(pins[area.id])
                  const isPlacing = placingId === area.id
                  return (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAreaId(area.id)
                          if (!isPlacing) setDetailAreaId(area.id)
                        }}
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
                            {placed ? t('features.map.positioned') : t('features.map.notPositioned')}
                          </span>
                        </span>
                      </button>

                      {canPin && (
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

      {/* Chi tiết khu vực — mở từ marker/danh sách, có tab Hình ảnh */}
      <AreaDetailDialog areaId={detailAreaId} open={Boolean(detailAreaId)} onClose={() => setDetailAreaId(null)} />
    </div>
  )
}
