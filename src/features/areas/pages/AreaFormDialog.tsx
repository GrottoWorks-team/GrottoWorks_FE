// Dialog tạo/sửa khu vực — RHF + zod: seasonId, name, type, level (PARISH/COMMUNITY +
// communityId khi COMMUNITY), leaderId (LEADER), officerId (OFFICER), deadline, description.
// Select dùng <select> native — style trùng Input (không thêm dependency).
//
// GHIM VỊ TRÍ: tạo và ghim nằm chung một form (không phải mở trang Bản đồ riêng).
// Pin chỉ là tuỳ chọn — chưa có ảnh sơ đồ vẫn tạo được khu vực (form-first, xem
// docs/specs/2026-11-03-clone-season-and-parish-map.md §2.2).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { viDate } from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { MAX_PAGE_SIZE } from '@/lib/paging'
import { getFileDownloadUrl } from '@/features/files/api'
import { useCommunities, useCreateArea, useSeasons, useUpdateArea, useUsers } from '../api'
import { useWorkAreaCategories } from '@/features/parish/api'
import { useCreateReadinessCheck } from '@/features/checklist/api'
import {
  ReadinessItemsEditor,
  type ReadinessItemDraft,
} from '@/features/checklist/components/ReadinessItemsEditor'
import { useParishMap } from '@/features/map/api'
import { MapPinPicker } from '@/features/map/components/MapPinPicker'
import {
  useCreateMaterialRequirement,
  useMaterialCatalog,
  useUpdateMaterialRequirement,
  useWorkAreaRequirements,
} from '@/features/materials/api'
import type { NormalizedPoint } from '@/features/designs/coords'
import type { Season, WorkArea } from '@/types'

/** Một dòng "ước lượng vật tư cần cho khu vực" (26/11/2026). */
interface EstimateRow {
  materialId: string
  quantity: string
}

const AREA_TYPES = ['GROTTO', 'TREE', 'LIGHTING', 'YARD', 'STAGE'] as const
const LEVELS = ['PARISH', 'COMMUNITY'] as const

const createSchema = (seasons: Season[]) =>
  z
    .object({
      seasonId: z.string().min(1, 'features.areas.seasonRequired'),
      name: z.string().trim().min(1, 'features.areas.nameRequired'),
      type: z.enum(AREA_TYPES),
      level: z.enum(LEVELS),
      communityId: z.string(),
      categoryId: z.string().optional(),
      leaderId: z.string().min(1, 'features.areas.leaderRequired'),
      officerId: z.string().min(1, 'features.areas.officerRequired'),
      startDate: z.string().optional(),
      deadline: z.string().optional(),
      description: z.string().max(300, 'features.areas.descriptionMax').optional(),
    })
    .superRefine((data, ctx) => {
      if (data.level === 'COMMUNITY' && !data.communityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['communityId'],
          message: 'features.areas.communityRequired',
        })
      }
      if (data.startDate && data.deadline && data.startDate > data.deadline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'features.areas.startDateInvalid',
        })
      }
      if (data.deadline && data.seasonId) {
        const season = seasons.find((s) => s.id === data.seasonId)
        if (season?.startDate && data.deadline < season.startDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['deadline'],
            message: 'features.areas.deadlineInvalid',
          })
        }
      }
    })

type FormData = z.infer<ReturnType<typeof createSchema>>

// ponytail: dialog hẹp — native select đủ dùng; component select riêng khi
// cần search/tích hợp nhiều option (users > 30). Export để dialog khác
// (AreaAssignDialog) dùng chung style.
export const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60'

export const TEXTAREA_CLS =
  'flex min-h-[72px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50'

export function AreaFormDialog({
  onClose,
  area,
  defaultSeasonId,
  parishId,
}: {
  onClose: () => void
  area?: WorkArea | null // null/undefined = create
  defaultSeasonId?: string
  /** Giáo xứ đang quản lý (ADMIN xem nhiều giáo xứ); bỏ trống = giáo xứ trong hồ sơ. */
  parishId?: string
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  // BE chỉ gán cộng đoàn qua hồ sơ TNV; tài khoản ban hành giáo cấp giáo xứ
  // không có communityId → xử lý như cấp giáo xứ (được chọn cộng đoàn tự do).
  const isCommunity = user?.role === 'COMMUNITY' && Boolean(user?.communityId)
  const { data: users = [] } = useUsers()
  const { data: communities = [] } = useCommunities({ parishId })
  const { data: seasons = [] } = useSeasons()
  // Khi SỬA: lấy mọi trạng thái để không mất hạng mục đã gán (BE chặn gán hạng mục
  // INACTIVE nhưng vẫn phải hiển thị giá trị hiện tại); khi TẠO: chỉ lấy ACTIVE.
  const { data: categories = [] } = useWorkAreaCategories(area ? undefined : 'ACTIVE')
  const create = useCreateArea()
  const update = useUpdateArea()
  const createReadiness = useCreateReadinessCheck()
  const editing = Boolean(area)

  // ── Ước lượng vật tư cần cho khu vực (26/11/2026) ────────────────────────
  // Nhập ngay khi tạo khu vực (và sửa được khi mùa còn PLANNING); là mẫu số của
  // "thiếu hụt" cùng với vật tư khai trong task (BE lấy max của hai nguồn).
  const { data: catalogResult } = useMaterialCatalog({ page: 1, size: MAX_PAGE_SIZE, status: 'ACTIVE' })
  const catalog = catalogResult?.data ?? []
  const { data: existingRequirements = [] } = useWorkAreaRequirements(area?.id)
  const createRequirement = useCreateMaterialRequirement()
  const updateRequirement = useUpdateMaterialRequirement()
  const [estimateRows, setEstimateRows] = useState<EstimateRow[]>([])

  useEffect(() => {
    if (!area?.id) return
    const active = existingRequirements.filter((r) => r.status === 'ACTIVE')
    setEstimateRows(active.map((r) => ({ materialId: r.materialId, quantity: String(r.requiredQuantity) })))
  }, [area?.id, existingRequirements])

  // Tiêu chí sẵn sàng do Ban hành giáo đặt NGAY khi tạo khu vực (§8.12): LEADER chỉ nộp
  // minh chứng và đánh dấu đạt, PARISH duyệt khu vực sau cùng.
  const [readinessName, setReadinessName] = useState(t('features.checklist.defaultName'))
  const [readinessItems, setReadinessItems] = useState<ReadinessItemDraft[]>([
    { name: '', mandatory: true },
  ])
  const [readinessError, setReadinessError] = useState<string | null>(null)

  // Mùa mặc định: ưu tiên season của area, defaultSeasonId prop, hoặc mùa ACTIVE/PLANNED đầu tiên
  const initialSeasonId = useMemo(() => {
    if (area?.seasonId) return area.seasonId
    if (defaultSeasonId) return defaultSeasonId
    const activeOrPlanned = seasons.find((s) => s.status === 'ACTIVE' || s.status === 'PLANNING')
    return activeOrPlanned?.id ?? seasons[0]?.id ?? 's1'
  }, [area?.seasonId, defaultSeasonId, seasons])

  // ── Ghim vị trí trên sơ đồ ngay trong form ───────────────────────────────
  // Ảnh sơ đồ do ADMIN (role FE `PARISH`) tải lên; quyền GHIM vị trí thuộc Ban
  // hành giáo (role FE `COMMUNITY`) — 11/11/2026. Pin vẫn lưu ở `features/map`
  // (localStorage) cho tới khi BE có API bản đồ. ADMIN xem nhiều giáo xứ → ghim
  // phải theo giáo xứ của mùa đang chọn.
  const mapParishId =
    seasons.find((s) => s.id === initialSeasonId)?.parishId ?? parishId ?? user?.parishId ?? ''
  const { data: mapRecord } = useParishMap(mapParishId)
  const [pin, setPinValue] = useState<NormalizedPoint | null>(null)
  const [pinTouched, setPinTouched] = useState(false)
  const [mapImageUrl, setMapImageUrl] = useState('')
  const mapHref =
    user?.role === 'PARISH'
      ? '/parish/communities?tab=areas'
      : '/community/areas'

  // Ảnh sơ đồ: blob IndexedDB → object URL (thu hồi khi đóng dialog).
  const urlRef = useRef('')
  useEffect(() => {
    let cancelled = false
    setMapImageUrl('')
    void (async () => {
      if (!mapRecord?.imageKey) return
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mapRecord.imageKey)) {
        if (!cancelled) setMapImageUrl('')
        return
      }
      const download = await getFileDownloadUrl(mapRecord.imageKey).catch(() => null)
      if (cancelled || !download?.downloadUrl) return
      setMapImageUrl(download.downloadUrl)
    })()
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = ''
      }
    }
  }, [mapRecord?.imageKey])

  // Khi SỬA: nạp ghim hiện có (một lần, không ghi đè lựa chọn của người dùng).
  useEffect(() => {
    if (!editing || !area || pinTouched) return
    if (typeof area.mapX === 'number' && typeof area.mapY === 'number') {
      setPinValue({ x: area.mapX, y: area.mapY })
    }
  }, [editing, area, pinTouched])

  const pickPin = (point: NormalizedPoint) => {
    setPinValue(point)
    setPinTouched(true)
  }
  const clearPin = () => {
    setPinValue(null)
    setPinTouched(true)
  }

  // Lead/officer options: lọc theo role VÀ theo giáo xứ của mùa đang chọn —
  // BE chặn gán chéo giáo xứ (`PARISH_ACCESS_DENIED`), nên danh sách phải cùng
  // giáo xứ với khu vực (xem mục 4.1 báo cáo E2E).
  const leaders = users.filter((u) => u.role === 'LEADER')
  const officers = users.filter((u) => u.role === 'MATERIAL_OFFICER')

  const schema = useMemo(() => createSchema(seasons), [seasons])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    // Cha mount dialog có điều kiện → mỗi lần mở là form mới create/edit.
    defaultValues: area
      ? {
          seasonId: area.seasonId ?? initialSeasonId,
          name: area.name,
          type: area.type,
          level: area.level,
          communityId: area.communityId ?? (isCommunity ? (user?.communityId ?? '') : ''),
          categoryId: area.categoryId ?? '',
          leaderId: area.leaderId,
          officerId: area.officerId,
          startDate: area.startDate ?? '',
          deadline: area.deadline ?? '',
          description: area.description ?? '',
        }
      : {
          seasonId: initialSeasonId,
          name: '',
          type: 'GROTTO',
          level: isCommunity ? 'COMMUNITY' : 'PARISH',
          communityId: isCommunity ? (user?.communityId ?? '') : '',
          categoryId: '',
          leaderId: '',
          officerId: '',
          startDate: '',
          deadline: '',
          description: '',
        },
  })
  const level = watch('level')
  const currentSeasonId = watch('seasonId')

  // Ước lượng vật tư chỉ sửa được khi mùa CHƯA kích hoạt (BE chặn ở trạng thái khác).
  const estimateEditable =
    seasons.find((s) => s.id === currentSeasonId)?.status === 'PLANNING' || !editing

  // Chỉ hiện trưởng khu/MO thuộc đúng giáo xứ của mùa đang chọn (BE trả
  // `PARISH_ACCESS_DENIED` nếu lệch). Giữ lại người đang gán khi SỬA để không
  // mất giá trị đã lưu nếu mùa đổi giáo xứ.
  const seasonParishId = seasons.find((s) => s.id === currentSeasonId)?.parishId
  const leaderOptions = useMemo(() => {
    const inParish = (u: { parishId?: string }) =>
      !seasonParishId || !u.parishId || u.parishId === seasonParishId
    const list = leaders.filter(inParish)
    const kept = area?.leaderId ? users.find((u) => u.id === area.leaderId) : undefined
    return kept && !list.some((u) => u.id === kept.id) ? [...list, kept] : list
  }, [leaders, users, seasonParishId, area?.leaderId])
  const officerOptions = useMemo(() => {
    const inParish = (u: { parishId?: string }) =>
      !seasonParishId || !u.parishId || u.parishId === seasonParishId
    const list = officers.filter(inParish)
    const kept = area?.officerId ? users.find((u) => u.id === area.officerId) : undefined
    return kept && !list.some((u) => u.id === kept.id) ? [...list, kept] : list
  }, [officers, users, seasonParishId, area?.officerId])

  // Cập nhật seasonId khi seasons load xong nếu chưa có giá trị
  useEffect(() => {
    if (!currentSeasonId && initialSeasonId) {
      setValue('seasonId', initialSeasonId)
    }
  }, [currentSeasonId, initialSeasonId, setValue])

  useEffect(() => {
    if (isCommunity && user?.communityId) {
      if (!editing) setValue('level', 'COMMUNITY')
      setValue('communityId', user.communityId)
    }
  }, [isCommunity, user?.communityId, editing, setValue, level])

  // Readiness là service riêng, nhận scope khu vực qua event `planning.*` nên ngay sau khi
  // tạo khu vực có thể còn 404 WORK_AREA_NOT_FOUND (~1–2s, đo thực tế 1,6s; mùa mới có thể lâu
  // hơn). Thử lại trong ~11s trước khi bỏ.
  const createReadinessWithRetry = async (
    workAreaId: string,
    name: string,
    items: ReadinessItemDraft[],
  ) => {
    const delays = [0, 600, 1200, 2000, 3000, 4000]
    let lastError: unknown
    for (const delay of delays) {
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
      try {
        return await createReadiness.mutateAsync({ workAreaId, name, items })
      } catch (error) {
        lastError = error
        if (!(error instanceof ApiError && error.code === 'WORK_AREA_NOT_FOUND')) break
      }
    }
    throw lastError
  }

  /**
   * Ghi ước lượng vật tư của khu vực: dòng mới → POST, dòng đổi số lượng → PATCH,
   * dòng bị xoá → PATCH `status = CANCELLED`. Chạy chung một lần bấm Lưu.
   */
  const saveEstimates = async (
    workAreaId: string,
    existing: typeof existingRequirements,
    retryScope = false,
  ) => {
    const rows = estimateRows
      .map((row) => ({ materialId: row.materialId, quantity: Number(row.quantity) }))
      .filter((row) => row.materialId && Number.isFinite(row.quantity) && row.quantity > 0)
    const current = existing.filter((r) => r.status === 'ACTIVE')

    if (rows.length === 0 && current.length === 0) return

    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        for (const row of rows) {
          const found = current.find((r) => r.materialId === row.materialId)
          if (found) {
            if (found.requiredQuantity !== row.quantity) {
              await updateRequirement.mutateAsync({
                requirementId: found.id,
                workAreaId,
                requiredQuantity: row.quantity,
                version: found.version,
              })
            }
          } else {
            await createRequirement.mutateAsync({
              workAreaId,
              materialId: row.materialId,
              requiredQuantity: row.quantity,
            })
          }
        }
        for (const gone of current) {
          if (!rows.some((row) => row.materialId === gone.materialId)) {
            await updateRequirement.mutateAsync({
              requirementId: gone.id,
              workAreaId,
              status: 'CANCELLED',
              version: gone.version,
            })
          }
        }
        return
      } catch (error) {
        lastError = error
        // Khu vực vừa tạo: Resource còn đang đồng bộ scope (~1–2s) → thử lại.
        const syncing = retryScope && error instanceof ApiError && error.code === 'WORK_AREA_NOT_FOUND'
        if (!syncing) break
        await new Promise((resolve) => setTimeout(resolve, 700))
      }
    }
    throw lastError
  }

  const onSubmit = async (data: FormData) => {
    // PARISH: update gửi null để mock PATCH xoá communityId cũ (shallow merge
    // giữ key); create bỏ key (undefined khỏi JSON).
    const rawCommunityId = isCommunity ? (user?.communityId ?? '') : data.communityId
    const communityId = data.level === 'COMMUNITY' ? rawCommunityId : null
    // Tiêu chí sẵn sàng: bắt buộc khi TẠO khu vực — thiếu tiêu chí thì KHÔNG tạo khu vực
    // (tránh khu vực tồn tại mà không có gì để LEADER nộp minh chứng).
    const criteria: ReadinessItemDraft[] = readinessItems
      .map((item) => ({ name: item.name.trim(), mandatory: item.mandatory }))
      .filter((item) => item.name.length > 0)
    if (!editing) {
      if (!readinessName.trim()) {
        setReadinessError(t('features.areas.readinessNameRequired'))
        return
      }
      if (criteria.length === 0) {
        setReadinessError(t('features.areas.readinessItemsRequired'))
        return
      }
      setReadinessError(null)
    }
    try {
      if (editing && area) {
        // BE không nhận leaderId/officerId/communityId trong PATCH — hook
        // useUpdateArea tự gọi PUT /leader, /material-officer, /community.
        await update.mutateAsync({
          id: area.id,
          version: area.version,
          name: data.name,
          description: data.description || undefined,
          startDate: data.startDate || undefined,
          deadline: data.deadline || undefined,
          categoryId: data.categoryId || undefined,
          communityId,
          leaderId: data.leaderId || undefined,
          officerId: data.officerId || undefined,
          // Ghim khu trên sơ đồ (BE lưu trong work area); `null` = bỏ ghim.
          ...(pinTouched
            ? { mapX: pin?.x ?? null, mapY: pin?.y ?? null }
            : {}),
        })
        // Ước lượng vật tư: sửa được khi mùa chưa kích hoạt.
        try {
          await saveEstimates(area.id, existingRequirements)
        } catch {
          toast(t('features.areas.estimateSaveFailed'), 'alert')
        }
        toast(t('features.areas.updated', { name: data.name }))
      } else {
        const created = await create.mutateAsync({
          seasonId: data.seasonId,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId || null,
          communityId: data.level === 'COMMUNITY' ? (communityId ?? null) : null,
          startDate: data.startDate || null,
          deadline: data.deadline || null,
          // Ghim ngay khi tạo (BE nhận `mapX/mapY` trong POST) — cùng một lần lưu.
          ...(pin ? { mapX: pin.x, mapY: pin.y } : {}),
        })
        // BE KHÔNG nhận leaderId/officerId trong POST → phải PUT riêng ngay sau khi tạo
        // (`useUpdateArea` gọi /leader rồi /material-officer, chuyền version qua If-Match).
        if (created?.id) {
          try {
            await update.mutateAsync({
              id: created.id,
              version: created.version,
              leaderId: data.leaderId || undefined,
              officerId: data.officerId || undefined,
            })
          } catch {
            toast(t('features.areas.assignAfterCreateFailed'), 'alert')
          }
          // Tiêu chí sẵn sàng: tạo luôn trong cùng lần lưu (không để PARISH quên).
          try {
            await createReadinessWithRetry(created.id, readinessName.trim(), criteria)
          } catch {
            toast(t('features.areas.readinessCreateFailed'), 'alert')
          }
          // Ước lượng vật tư cần cho khu vực (tạo cùng lần lưu).
          try {
            await saveEstimates(created.id, [], true)
          } catch {
            toast(t('features.areas.estimateSaveFailed'), 'alert')
          }
        }
        toast(t('features.areas.created', { name: data.name }))
      }
      onClose()
    } catch (e) {
      toast(
        e instanceof ApiError && e.code === 'SEASON_INVALID_STATE'
          ? t('features.areas.seasonInvalidState')
          : t('common.error'),
        'alert',
      )
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  const LBL = 'text-[10px] font-semibold text-[#5C7468]'
  const FIELD =
    'h-[34px] w-full rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] text-[10.5px] text-[#0B2E1F] outline-none transition-colors focus:border-[#12805A] disabled:opacity-60'
  const CARD = 'flex w-full flex-col gap-[7px] rounded-[12px] border border-[#E7EEE3] bg-[#FBFCFA] px-3 py-[11px]'
  const CLABEL = 'font-mono text-[8px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'
  const CHINT = 'w-full text-[10px] leading-[15px] text-[#96AAA0]'

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={editing ? t('features.areas.edit') : t('features.areas.create')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[34px] items-center justify-center rounded-[10px] border border-[#E1E9DC] bg-white px-[14px] transition-colors hover:bg-[#F4F8F1]"
          >
            <span className="text-[11.5px] font-semibold text-[#5C7468]">{t('common.cancel')}</span>
          </button>
          <button
            type="submit"
            form="area-form"
            disabled={isSubmitting}
            className="flex h-[34px] items-center justify-center rounded-[10px] bg-[#0A5C36] px-4 transition-colors hover:bg-[#0D7344] disabled:opacity-55"
          >
            <span className="text-[11.5px] font-bold text-white">{t('common.save')}</span>
          </button>
        </>
      }
    >
      <form id="area-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <p className="pb-3 text-[10.5px] text-[#8AA298]">
          {t('features.areas.dialogSub', { defaultValue: 'Mùa Giáng sinh' })}
          {seasons.find((x) => x.id === currentSeasonId)?.year
            ? ` ${seasons.find((x) => x.id === currentSeasonId)?.year}`
            : ''}
          {' · '}
          {(() => {
            const season = seasons.find((x) => x.id === currentSeasonId)
            return season ? `${viDate(season.startDate)} → ${viDate(season.endDate)}` : ''
          })()}
        </p>

        <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          {/* Cột trái — thông tin cơ bản */}
          <div className="flex min-w-0 flex-col gap-[11px]">
            <p className={CLABEL}>{t('features.areas.basicHead', { defaultValue: 'Thông tin cơ bản' })}</p>

            <div className="flex w-full flex-col gap-[5px]">
              <Label htmlFor="area-name" className={LBL}>
                {t('features.areas.name')}
              </Label>
              <Input
                id="area-name"
                className={FIELD}
                placeholder={t('features.areas.namePlaceholder', { defaultValue: 'VD: Phân khu hang đá chính' })}
                {...register('name')}
              />
              {err(errors.name?.message)}
            </div>

            <div className="flex w-full flex-col gap-[5px]">
              <Label htmlFor="area-season" className={LBL}>
                {t('features.areas.season')}
              </Label>
              <select id="area-season" className={FIELD} {...register('seasonId')}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t('features.season.optionLabel', { year: s.year, status: t(`status.${s.status}`, s.status) })}
                  </option>
                ))}
              </select>
              {err(errors.seasonId?.message)}
            </div>

            <div className="flex w-full items-start gap-[10px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-type" className={LBL}>
                  {t('features.areas.type')}
                </Label>
                <select id="area-type" className={FIELD} {...register('type')}>
                  {AREA_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {t(`features.areas.areaType.${v}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-level" className={LBL}>
                  {t('features.areas.level')}
                </Label>
                <select id="area-level" className={FIELD} {...register('level')}>
                  {LEVELS.map((v) => (
                    <option key={v} value={v}>
                      {t(`features.areas.level.${v}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {categories.length > 0 ? (
              <div className="flex w-full flex-col gap-[5px]">
                <Label htmlFor="area-category" className={LBL}>
                  {t('features.areas.category')}
                </Label>
                <select id="area-category" className={FIELD} {...register('categoryId')}>
                  <option value="">{t('features.areas.selectPlaceholder')}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-[10px] leading-4 text-[#96AAA0]">
                {t('features.areas.categoryEmpty')}{' '}
                {user?.role === 'PARISH' && (
                  <a href="/parish/categories" className="font-semibold text-[#0A5C36] hover:underline">
                    {t('features.areas.categoryEmptyAction')}
                  </a>
                )}
              </p>
            )}

            {level === 'COMMUNITY' && (
              <div className="flex w-full flex-col gap-[5px]">
                <Label htmlFor="area-community" className={LBL}>
                  {t('features.areas.community')}
                </Label>
                <select
                  id="area-community"
                  className={FIELD}
                  disabled={isCommunity}
                  {...register('communityId')}
                  value={watch('communityId') || ''}
                >
                  <option value="">{t('features.areas.selectPlaceholder')}</option>
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {err(errors.communityId?.message)}
              </div>
            )}

            <div className="flex w-full items-start gap-[10px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-leader" className={LBL}>
                  {t('features.areas.leader')}
                </Label>
                <select id="area-leader" className={FIELD} {...register('leaderId')}>
                  <option value="">{t('features.areas.selectPlaceholder')}</option>
                  {leaderOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {leaderOptions.length <= 1 && (
                  <p className="text-[10px] text-[#96AAA0]">{t('features.areas.noLeaderInParish')}</p>
                )}
                {err(errors.leaderId?.message)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-officer" className={LBL}>
                  {t('features.areas.officer')}
                </Label>
                <select id="area-officer" className={FIELD} {...register('officerId')}>
                  <option value="">{t('features.areas.selectPlaceholder')}</option>
                  {officerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {err(errors.officerId?.message)}
              </div>
            </div>

            <div className="flex w-full items-start gap-[10px]">
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-start-date" className={LBL}>
                  {t('features.areas.startDate')}
                </Label>
                <Input id="area-start-date" type="date" className={FIELD} {...register('startDate')} />
                {err(errors.startDate?.message)}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <Label htmlFor="area-deadline" className={LBL}>
                  {t('features.areas.deadline')}
                </Label>
                <Input id="area-deadline" type="date" className={FIELD} {...register('deadline')} />
                {err(errors.deadline?.message)}
              </div>
            </div>

            <div className="flex w-full flex-col gap-[5px]">
              <Label htmlFor="area-description" className={LBL}>
                {t('features.areas.description')}
              </Label>
              <textarea
                id="area-description"
                rows={3}
                placeholder={t('features.areas.descriptionPlaceholder')}
                className="min-h-[76px] w-full rounded-[9px] border border-[#DFE7DC] bg-[#FBFCFA] px-[10px] py-[9px] text-[10.5px] leading-4 text-[#0B2E1F] outline-none transition-colors placeholder:text-[#9AAE9F] focus:border-[#12805A]"
                {...register('description')}
              />
              {err(errors.description?.message)}
            </div>
          </div>

          {/* Cột phải — khối phụ */}
          <div className="flex h-fit w-full flex-col gap-[10px]">
            {!editing || estimateEditable ? (
              <div className={CARD}>
                <span className={CLABEL}>{t('features.areas.estimateSection')}</span>
                <p className={CHINT}>{t('features.areas.estimateHint')}</p>
                {estimateRows.length === 0 ? (
                  <p className="text-[10px] text-[#96AAA0]">{t('features.areas.estimateEmpty')}</p>
                ) : (
                  <div className="flex w-full flex-col gap-[6px]">
                    {estimateRows.map((row, index) => (
                      <div key={`${row.materialId}-${index}`} className="flex items-end gap-[6px]">
                        <select
                          aria-label={t('features.areas.estimateMaterial')}
                          className="h-8 min-w-0 flex-1 rounded-[8px] border border-[#DFE7DC] bg-white px-2 text-[10px] text-[#0B2E1F] outline-none focus:border-[#12805A]"
                          value={row.materialId}
                          onChange={(e) =>
                            setEstimateRows((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, materialId: e.target.value } : item,
                              ),
                            )
                          }
                        >
                          <option value="">{t('features.areas.estimateSelectMaterial')}</option>
                          {catalog
                            .filter(
                              (m) =>
                                m.id === row.materialId ||
                                !estimateRows.some((item) => item.materialId === m.id),
                            )
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                [{m.code}] {m.name} ({m.unit})
                              </option>
                            ))}
                        </select>
                        <input
                          aria-label={t('features.areas.estimateQuantity')}
                          type="number"
                          min={0}
                          step="any"
                          value={row.quantity}
                          onChange={(e) =>
                            setEstimateRows((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, quantity: e.target.value } : item,
                              ),
                            )
                          }
                          className="h-8 w-14 shrink-0 rounded-[8px] border border-[#DFE7DC] bg-white px-2 text-right font-mono text-[10px] text-[#0B2E1F] outline-none focus:border-[#12805A]"
                        />
                        <button
                          type="button"
                          onClick={() => setEstimateRows((prev) => prev.filter((_, i) => i !== index))}
                          aria-label={t('common.delete')}
                          className="h-8 shrink-0 rounded-[8px] px-1 text-[10px] font-semibold text-[#B4634F] hover:bg-[#FBEDEA]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setEstimateRows((prev) => [...prev, { materialId: '', quantity: '1' }])}
                  className="w-fit text-[10px] font-bold text-[#0A5C36] hover:underline"
                >
                  {t('features.areas.estimateAdd')}
                </button>
              </div>
            ) : null}

            {!editing && (
              <div className={CARD}>
                <span className={CLABEL}>{t('features.areas.readinessSection')}</span>
                <p className={CHINT}>{t('features.areas.readinessHint')}</p>
                <input
                  id="area-readiness-name"
                  aria-label={t('features.areas.readinessChecklistName')}
                  value={readinessName}
                  onChange={(e) => setReadinessName(e.target.value)}
                  className="h-8 w-full rounded-[8px] border border-[#DFE7DC] bg-white px-[10px] text-[10px] text-[#0B2E1F] outline-none focus:border-[#12805A]"
                />
                <ReadinessItemsEditor
                  items={readinessItems}
                  onChange={setReadinessItems}
                  idPrefix="area-readiness-item"
                />
                {readinessError && (
                  <p className="text-[10px] font-semibold text-[#B42318]">{t(readinessError)}</p>
                )}
              </div>
            )}

            {user?.role === 'COMMUNITY' && (
              <div className={CARD}>
                <span className={CLABEL}>{t('features.map.pinSection')}</span>
                {mapImageUrl ? (
                  <>
                    <MapPinPicker src={mapImageUrl} pin={pin} onPick={pickPin} />
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-[10px] leading-4 text-[#96AAA0]">
                        {pin ? t('features.map.pinPicked') : t('features.map.pinHint')}
                      </p>
                      {pin && (
                        <button
                          type="button"
                          onClick={clearPin}
                          className="shrink-0 rounded-[8px] border border-[#E1E9DC] bg-white px-2 py-1 text-[10px] font-semibold text-[#5C7468]"
                        >
                          {t('features.map.clearPosition')}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className={CHINT}>
                    {t('features.map.pinNoMap')}{' '}
                    <a href={mapHref} className="font-semibold text-[#0A5C36] hover:underline">
                      {t('features.map.pinNoMapAction')}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="pt-3 text-[10px] text-[#A3B4A9]">
          {t('features.areas.createFoot', { defaultValue: 'Khu được tạo ở trạng thái Đang chuẩn bị' })}
        </p>
      </form>
    </Dialog>
  )
}
