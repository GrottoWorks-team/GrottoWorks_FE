// Trang "Giáo xứ & cộng đoàn" (route /parish/communities) — HUB của admin:
//   • Tab Giáo xứ: thông tin + đổi tên giáo xứ (PATCH /api/v1/parishes/{id}).
//   • Tab Cộng đoàn: CRUD giáo khu (communities) qua bảng + dialog.
//   • Tab Khu vực công tác: bảng khu vực của giáo xứ (trước đây là trang riêng
//     `/parish/areas`), tạo/sửa/phân công qua dialog.
// Bản đồ giáo xứ không còn là mục menu riêng mà là TRANG CON
// `/parish/communities/map?parish=<id>` (xem `features/map/pages/ParishMapPage`).
//
// ADMIN không thuộc giáo xứ nào (BR-67) → chọn giáo xứ ở `?parish=` để xem được
// nhiều giáo xứ trên cùng một màn hình (xem `useParishScope`).
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Church,
  Info,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import ParishMapPage from '@/features/map/pages/ParishMapPage'
import { DataTable } from '@/components/shared/DataTable'
import { StatCard } from '@/components/shared/StatCard'
import { StatusTag } from '@/components/shared/StatusTag'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { ApiError } from '@/lib/api'
import { viDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { useAreas, useSeasons, useUsers } from '@/features/areas/api'
import SeasonListPage from '@/features/season/pages/SeasonListPage'
import { SELECT_CLS } from '@/features/areas/pages/AreaFormDialog'
import {
  useCommunities,
  useCreateCommunity,
  useCreateParish,
  useParish,
  useUpdateParish,
  useUpdateCommunity,
} from '../api'
import { useParishScope } from '../hooks'
import { ParishSwitcher } from '../components/ParishSwitcher'
import type { Community, WorkArea } from '@/types'
import i18n from '@/lib/i18n'

const schema = z.object({
  name: z.string().trim().min(1, 'features.parish.communityNameRequired'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})
type FormData = z.infer<typeof schema>

// Dialog tạo/sửa giáo khu — mount có điều kiện.
function CommunityFormDialog({
  parishId,
  onClose,
  community,
}: {
  parishId: string
  onClose: () => void
  community?: Community | null
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const editing = Boolean(community)
  const create = useCreateCommunity()
  const update = useUpdateCommunity()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: community?.name ?? '',
      status: community?.status ?? 'ACTIVE',
    },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (editing && community) {
        await update.mutateAsync({
          id: community.id,
          version: community.version,
          name: data.name,
          status: data.status,
        })
        toast(t('features.parish.updated', { name: data.name }))
      } else {
        await create.mutateAsync({ name: data.name, parishId })
        toast(t('features.parish.created', { name: data.name }))
      }
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const err = (msg?: string) =>
    msg ? <p className="mt-1 text-xs font-semibold text-destructive">{t(msg)}</p> : null

  return (
    <Dialog
      open
      onClose={onClose}
      title={editing ? t('features.parish.editCommunity') : t('features.parish.createCommunity')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="community-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="community-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="community-name">{t('features.parish.communityName')}</Label>
          <Input id="community-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>
        {editing && (
          <div>
            <Label htmlFor="community-status">{t('common.status')}</Label>
            <select
              id="community-status"
              {...register('status')}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ACTIVE">{t('status.ACTIVE')}</option>
              <option value="INACTIVE">{t('status.INACTIVE')}</option>
            </select>
          </div>
        )}
      </form>
    </Dialog>
  )
}

const parishCreateSchema = z.object({
  name: z.string().trim().min(1, i18n.t('features.parish.nameRequired')),
  address: z.string().optional(),
  description: z.string().optional(),
})
type ParishCreateFormData = z.infer<typeof parishCreateSchema>

// Dialog tạo giáo xứ mới (POST /api/v1/parishes)
function ParishCreateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const create = useCreateParish()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParishCreateFormData>({
    resolver: zodResolver(parishCreateSchema),
    defaultValues: { name: '', address: '', description: '' },
  })

  const onSubmit = async (data: ParishCreateFormData) => {
    try {
      await create.mutateAsync({
        name: data.name,
        address: data.address || null,
        description: data.description || null,
      })
      toast(t('features.parish.created', { name: data.name }))
      onClose()
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('features.parish.createParish', { defaultValue: 'Tạo giáo xứ mới' })}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="parish-create-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="parish-create-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="create-parish-name">
            {t('features.parish.parishName', { defaultValue: 'Tên giáo xứ' })} *
          </Label>
          <Input
            id="create-parish-name"
            {...register('name')}
            placeholder={t('features.parish.namePlaceholder')}
          />
          {errors.name?.message && (
            <p className="mt-1 text-xs font-semibold text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="create-parish-address">
            {t('features.parish.address', { defaultValue: 'Địa chỉ' })}
          </Label>
          <Input
            id="create-parish-address"
            {...register('address')}
            placeholder={t('features.parish.addressPlaceholder')}
          />
        </div>
        <div>
          <Label htmlFor="create-parish-desc">
            {t('features.parish.parishDescription', { defaultValue: 'Mô tả' })}
          </Label>
          <Input
            id="create-parish-desc"
            {...register('description')}
            placeholder={t('features.parish.diocesePlaceholder')}
          />
        </div>
      </form>
    </Dialog>
  )
}

// Card thông tin giáo xứ — Layout 2 cột trên desktop (thông tin + tổng quan điều phối)
function ParishCard({ parishId }: { parishId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: parish } = useParish(parishId)
  const updateParish = useUpdateParish()
  const [name, setName] = useState<string | null>(null)
  const isDirty = name !== null && name.trim() !== (parish?.name ?? '')
  const value = name ?? parish?.name ?? ''

  const save = async () => {
    const v = value.trim()
    if (!v || v === parish?.name || !parish) return
    try {
      await updateParish.mutateAsync({ id: parish.id, version: parish.version, name: v })
      toast(t('features.parish.updated', { name: v }))
      setName(null)
    } catch (e) {
      // 412 = ai đó vừa sửa trước; tải lại để lấy version mới.
      toast(
        e instanceof ApiError && e.status === 412
          ? t('features.parish.versionConflict')
          : t('common.error'),
        'alert',
      )
    }
  }

  return (
    <Card className="overflow-hidden border border-border p-5">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        {/* Cột trái: Tên giáo xứ, địa chỉ, mô tả */}
        <div className="space-y-4 md:col-span-7 lg:col-span-8">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-brand-pine/10 text-brand-pine">
              <Church className="size-5" />
            </div>
            <div>
              <p className="lbl-mono">{t('features.parish.parishName')}</p>
              <h2 className="text-base font-bold text-foreground">
                {parish?.name || t('features.parish.title')}
              </h2>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parish-name-input" className="text-xs text-muted-foreground">
              {t('features.parish.editParishName', { defaultValue: 'Cập nhật tên giáo xứ' })}:
            </Label>
            <div className="flex max-w-md gap-2">
              <Input
                id="parish-name-input"
                aria-label={t('features.parish.parishName')}
                value={value}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void save()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save()
                }}
                className="font-medium"
              />
              {isDirty && (
                <Button size="sm" onClick={() => void save()}>
                  <Check className="size-4 mr-1" />
                  {t('common.save')}
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t('features.parish.pressEnterToSave', { defaultValue: 'Nhấn Enter hoặc nhấp ra ngoài để lưu thay đổi.' })}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1 text-xs text-muted-foreground">
            {parish?.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-pine" />
                <span>
                  <strong className="text-foreground">{t('features.parish.address')}:</strong>{' '}
                  {parish.address}
                </span>
              </div>
            )}
            {parish?.description && (
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
                <span>
                  <strong className="text-foreground">{t('features.parish.parishDescription')}:</strong>{' '}
                  {parish.description}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Trạng thái & metadata */}
        <div className="flex flex-col justify-between rounded-lg border border-border/70 bg-gw-canvas/70 p-4 md:col-span-5 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="lbl-mono">{t('common.status')}</span>
              {parish?.status && <StatusTag status={parish.status} />}
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t('features.parish.version', { defaultValue: 'Phiên bản dữ liệu' })}:
                </span>
                <Badge className="tabular text-[11px] font-mono">
                  v{parish?.version ?? 1}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {t('features.parish.code', { defaultValue: 'Mã định danh' })}:
                </span>
                <span className="font-mono text-[11px] text-foreground">
                  {parish?.id ? `#${parish.id.slice(0, 8)}` : 'PARISH-GW'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-md bg-brand-pine/5 px-2.5 py-2 text-[11px] text-brand-pine">
            <ShieldCheck className="size-4 shrink-0" />
            <span className="font-medium">
              {t('features.parish.certifiedCoordination', {
                defaultValue: t('features.parish.defaultDescription'),
              })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Tab Cộng đoàn — bảng giáo khu + CRUD.
function CommunitiesPanel({
  parishId,
  parishName,
  canEdit,
  onGoAreas,
}: {
  parishId: string
  parishName?: string
  canEdit: boolean
  onGoAreas: () => void
}) {
  const { t } = useTranslation()
  const { data: communities = [], isPending } = useCommunities({ parishId })
  const { data: users = [] } = useUsers()
  const { data: seasons = [] } = useSeasons()
  const seasonIds = useMemo(
    () => seasons.filter((s) => s.parishId === parishId).map((s) => s.id),
    [seasons, parishId],
  )
  const { data: areas = [] } = useAreas(seasonIds)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Community | null>(null)

  // Thanh công cụ + phân trang (bản thiết kế Pen: search 250px, chip lọc trạng
  // thái, chọn sắp xếp, chân bảng có bộ đếm và 2 nút chuyển trang).
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all')
  const [sort, setSort] = useState<'newest' | 'nameAsc' | 'nameDesc'>('newest')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 8

  const membersOf = (id: string) => users.filter((u) => u.communityId === id).length
  const areasOf = (id: string) => areas.filter((a) => a.communityId === id).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = communities.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (!q) return true
      return c.name.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q)
    })
    if (sort === 'nameAsc') return [...list].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    if (sort === 'nameDesc') return [...list].sort((a, b) => b.name.localeCompare(a.name, 'vi'))
    return list
  }, [communities, query, statusFilter, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const FILTERS = [
    { key: 'all' as const, label: t('features.parish.filterAll', { defaultValue: 'Tất cả' }) },
    { key: 'ACTIVE' as const, label: t('features.parish.filterActive', { defaultValue: 'Đang chạy' }) },
    { key: 'INACTIVE' as const, label: t('features.parish.filterPaused', { defaultValue: 'Tạm dừng' }) },
  ]

  return (
    <div>
      <div className="mb-[18px] grid gap-[14px] sm:grid-cols-3">
        <StatCard
          label={t('features.parish.tabCommunities')}
          value={communities.length}
          hint={t('features.parish.statCommunitiesSub', { defaultValue: 'Giáo khu trong giáo xứ' })}
          icon={Church}
        />
        <StatCard
          label={t('features.parish.members')}
          value={users.filter((u) => u.communityId).length}
          hint={t('features.parish.statMembersSub', { defaultValue: 'Người đã thuộc giáo khu' })}
          icon={Users}
        />
        <StatCard
          label={t('features.parish.tabAreas')}
          value={areas.length}
          hint={t('features.parish.statAreasSub', { defaultValue: 'Khu vực trong mùa hiện tại' })}
          icon={MapPin}
        />
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
        {/* Bảng giáo khu — một thẻ liền: công cụ, hàng tiêu đề, hàng dữ liệu, chân */}
        <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-[14px]">
            <div className="flex h-9 w-full max-w-[250px] items-center gap-[9px] rounded-[10px] border border-[#E7EEE3] bg-[#F7F9F5] px-[11px]">
              <Search className="size-[14px] shrink-0 text-[#9AAE9F]" aria-hidden />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(0)
                }}
                placeholder={t('features.parish.communitiesSearch', { defaultValue: 'Tìm kiếm giáo khu…' })}
                className="min-w-0 flex-1 bg-transparent text-[11.5px] text-[#0B2E1F] outline-none placeholder:text-[#9AAE9F]"
                aria-label={t('common.search')}
              />
            </div>

            <div className="flex items-center gap-[4px] rounded-[10px] bg-[#EAF0E6] p-[3px]">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(f.key)
                    setPage(0)
                  }}
                  className={cn(
                    'flex h-7 items-center rounded-[8px] px-[10px] text-[11px] transition-colors',
                    statusFilter === f.key
                      ? 'bg-white font-bold text-[#0A5C36]'
                      : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex h-[30px] w-[96px] items-center gap-[6px] rounded-[8px] border border-[#E7EEE3] bg-white px-2">
                <SlidersHorizontal className="size-3 shrink-0 text-[#8AA298]" aria-hidden />
                <span className="sr-only">{t('common.sort')}</span>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as typeof sort)
                    setPage(0)
                  }}
                  className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-[11px] font-semibold text-[#5C7468] outline-none"
                >
                  <option value="newest">{t('features.parish.sortNewest', { defaultValue: 'Mới nhất' })}</option>
                  <option value="nameAsc">{t('features.parish.sortNameAsc', { defaultValue: 'Tên A–Z' })}</option>
                  <option value="nameDesc">{t('features.parish.sortNameDesc', { defaultValue: 'Tên Z–A' })}</option>
                </select>
              </label>
              {canEdit && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex h-[30px] items-center gap-[5px] rounded-[8px] bg-[#0A5C36] px-[10px] transition-colors hover:bg-[#0D7344]"
                >
                  <Plus className="size-3 text-[#F2D07A]" aria-hidden />
                  <span className="text-[11px] font-bold text-white">
                    {t('features.parish.createCommunity')}
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />

          <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[11px]">
            <span className="min-w-0 flex-1 font-mono text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.parish.communityName')}
            </span>
            <span className="w-[86px] shrink-0 text-right font-mono text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.parish.members')}
            </span>
            <span className="w-[76px] shrink-0 text-right font-mono text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('features.parish.areaColumn', { defaultValue: 'Khu vực' })}
            </span>
            <span className="w-[104px] shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
              {t('common.status')}
            </span>
            <span className="w-[56px] shrink-0 text-right font-mono text-[9px] text-[#97AB9E]">
              {t('common.actions')}
            </span>
          </div>

          {isPending ? (
            <p className="px-4 py-6 font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] text-[#A3B4A9]">{t('features.parish.empty')}</p>
          ) : (
            <ul className="w-full">
              {rows.map((c) => {
                const active = c.status === 'ACTIVE'
                return (
                  <li
                    key={c.id}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] last:border-0',
                      canEdit && 'cursor-pointer hover:bg-[#FAFCF7]',
                    )}
                    onClick={
                      canEdit
                        ? () => {
                            setEditing(c)
                            setFormOpen(true)
                          }
                        : undefined
                    }
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-[10px]">
                      <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-[#DDE8D6] bg-[#EDF4EA]">
                        <span className="text-[11px] font-extrabold text-[#3F7F5B]">
                          {c.name.trim().charAt(0).toUpperCase()}
                        </span>
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                        <span className="w-full truncate text-[12.5px] font-bold text-[#0B2E1F]">{c.name}</span>
                        <span className="w-full truncate text-[10.5px] text-[#96AAA0]">
                          {c.description || '—'}
                        </span>
                      </div>
                    </div>
                    <span className="w-[86px] shrink-0 text-right font-mono text-[11.5px] font-semibold text-[#5C7468]">
                      {membersOf(c.id)}
                    </span>
                    <span className="w-[76px] shrink-0 text-right font-mono text-[11.5px] font-semibold text-[#5C7468]">
                      {areasOf(c.id)}
                    </span>
                    <span className="w-[104px] shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-[6px] rounded-full border px-[9px] py-1',
                          active
                            ? 'border-[#CBE3D2] bg-[#E9F4EC]'
                            : 'border-[#E7EEE3] bg-[#F7F9F5]',
                        )}
                      >
                        <span
                          className={cn('size-[5px] rounded-full', active ? 'bg-[#12805A]' : 'bg-[#97AB9E]')}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'text-[10.5px] font-semibold',
                            active ? 'text-[#1B6B45]' : 'text-[#5C7468]',
                          )}
                        >
                          {active
                            ? t('features.parish.filterActive', { defaultValue: 'Đang chạy' })
                            : t('features.parish.filterPaused', { defaultValue: 'Tạm dừng' })}
                        </span>
                      </span>
                    </span>
                    <div className="flex w-[56px] shrink-0 items-center justify-end gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          aria-label={t('common.edit')}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditing(c)
                            setFormOpen(true)
                          }}
                          className="grid size-[26px] place-items-center rounded-[8px] text-[#8AA298] transition-colors hover:bg-[#F1F6EE] hover:text-[#0A5C36]"
                        >
                          <Pencil className="size-[13px]" aria-hidden />
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
            <span className="text-[10.5px] text-[#96AAA0]">
              {t('features.parish.tableCount', {
                defaultValue: 'Hiển thị {{shown}} / {{total}} cộng đoàn',
                shown: filtered.length,
                total: communities.length,
              })}
            </span>
            <div className="flex items-center gap-[4px]">
              <button
                type="button"
                aria-label={t('common.previousPage')}
                disabled={safePage === 0}
                onClick={() => setPage(Math.max(0, safePage - 1))}
                className="grid size-[26px] place-items-center rounded-[8px] border border-[#E7EEE3] text-[#8AA298] transition-colors hover:bg-[#F4F8F1] disabled:opacity-40"
              >
                <ChevronLeft className="size-3" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={t('common.nextPage')}
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
                className="grid size-[26px] place-items-center rounded-[8px] border border-[#E7EEE3] text-[#8AA298] transition-colors hover:bg-[#F4F8F1] disabled:opacity-40"
              >
                <ChevronRight className="size-3" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Cột phụ 300px: tổng quan giáo xứ + gợi ý sang tab khu vực */}
        <aside className="flex w-full shrink-0 flex-col gap-[16px] xl:w-[300px]">
          <section className="flex w-full flex-col overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]">
            <div className="flex items-center justify-between px-4 py-[14px]">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[1.2px] text-[#97AB9E]">
                {t('features.parish.overviewTitle', { defaultValue: 'Tổng quan giáo xứ' })}
              </p>
            </div>
            <div className="h-px w-full bg-[#ECF1E9]" aria-hidden />
            <div className="flex w-full flex-col gap-[14px] px-4 pb-4 pt-[14px]">
              <div className="flex w-full items-center gap-[10px]">
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-[#0A5C36]">
                  <Church className="size-[15px] text-[#F2D07A]" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="w-full truncate text-[12.5px] font-bold text-[#0B2E1F]">
                    {parishName ?? t('app.parish')}
                  </span>
                  <span className="truncate text-[10.5px] text-[#96AAA0]">
                    {t('features.parish.overviewMeta', {
                      defaultValue: 'Niên vụ {{year}}',
                      year: new Date().getFullYear(),
                    })}
                  </span>
                </div>
              </div>
              {[
                { Icon: Users, label: t('features.parish.tabCommunities'), value: communities.length },
                { Icon: Users, label: t('features.parish.members'), value: users.filter((u) => u.communityId).length },
                { Icon: MapPin, label: t('features.parish.tabAreas'), value: areas.length },
              ].map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="flex w-full items-center justify-between border-t border-[#F0F4EC] pt-[10px]"
                >
                  <span className="flex items-center gap-2 text-[11.5px] text-[#5C7468]">
                    <Icon className="size-[13px] text-[#8AA298]" aria-hidden />
                    {label}
                  </span>
                  <span className="font-mono text-[12px] font-bold text-[#0B2E1F]">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex w-full items-start gap-[10px] overflow-hidden rounded-[16px] bg-[#0A5C36] px-[15px] py-[14px]">
            <div
              className="pointer-events-none absolute left-[180px] top-[-80px] z-0 size-[200px] rounded-full bg-[#E9B9492E] blur-[25px]"
              aria-hidden
            />
            <Church className="relative z-[1] mt-px size-[15px] shrink-0 text-[#F2D07A]" aria-hidden />
            <div className="relative z-[2] flex min-w-0 flex-1 flex-col gap-[6px]">
              <span className="w-full text-[12.5px] font-bold text-white">
                {t('features.parish.helpTitle', { defaultValue: 'Giáo khu trong mùa' })}
              </span>
              <p className="w-full text-[10.5px] leading-[16px] text-[#A9D7BF]">
                {t('features.parish.helpBody', { defaultValue: 'Mỗi giáo khu có trưởng khu, danh sách thành viên và khu vực công tác riêng trong mùa.' })}
              </p>
              <button
                type="button"
                onClick={onGoAreas}
                className="flex items-center gap-[5px] pt-0.5 text-[10.5px] font-bold text-[#F6E4B8] hover:underline"
              >
                {t('features.parish.helpLink', { defaultValue: 'Xem khu vực công tác' })}
                <ArrowRight className="size-[11px]" aria-hidden />
              </button>
            </div>
          </section>
        </aside>
      </div>

      {formOpen && (
        <CommunityFormDialog
          parishId={parishId}
          community={editing}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  )
}

// Tab Khu vực công tác — CHỈ XEM với admin (11/11/2026): việc tạo/sửa và phân
// công trưởng khu, trưởng nhóm vật tư thuộc Ban hành giáo (role FE `COMMUNITY`,
// trang /community/areas). Admin dùng tab này để theo dõi toàn bộ giáo xứ.
const areaLabel = (a: WorkArea) =>
    a.name?.trim() || i18n.t('features.areas.fallbackName', { id: a.id.slice(0, 8) })

function AreasPanel({ parishId }: { parishId: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: seasons = [], isPending: seasonsPending } = useSeasons()
  const { data: users = [] } = useUsers()
  const { data: communities = [] } = useCommunities({ parishId })

  const parishSeasons = useMemo(
    () => seasons.filter((s) => s.parishId === parishId),
    [seasons, parishId],
  )
  const [selectedSeason, setSelectedSeason] = useState('all')
  const seasonIds = useMemo(
    () =>
      selectedSeason === 'all'
        ? parishSeasons.map((s) => s.id)
        : [selectedSeason].filter((id) => parishSeasons.some((s) => s.id === id)),
    [selectedSeason, parishSeasons],
  )
  const { data: areas = [], isPending: areasPending } = useAreas(seasonIds)

  const seasonMap = useMemo(() => new Map(parishSeasons.map((s) => [s.id, s])), [parishSeasons])
  const userNameById = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users])
  const communityNameById = useMemo(
    () => new Map(communities.map((c) => [c.id, c.name])),
    [communities],
  )

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.areas.name'),
        render: (a: WorkArea) => (
          <div>
            <span className="font-semibold text-foreground">{areaLabel(a)}</span>
            {a.description ? (
              <p className="line-clamp-1 text-xs text-muted-foreground" title={a.description}>
                {a.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        key: 'season',
        header: t('features.areas.season'),
        render: (a: WorkArea) => {
          const season = seasonMap.get(a.seasonId ?? '')
          return (
            <span className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {season ? t('features.areas.seasonBadge', { year: season.year }) : '—'}
            </span>
          )
        },
      },
      {
        key: 'community',
        header: t('features.parish.community'),
        render: (a: WorkArea) => (
          <span className="text-xs font-medium text-muted-foreground">
            {communityNameById.get(a.communityId ?? '') ?? '—'}
          </span>
        ),
      },
      {
        key: 'leaderId',
        header: t('features.areas.leader'),
        render: (a: WorkArea) => userNameById.get(a.leaderId ?? '') ?? '—',
      },
      {
        key: 'deadline',
        header: t('features.areas.deadline'),
        render: (a: WorkArea) => (
          <span className="tabular text-xs font-medium text-muted-foreground">
            {a.deadline ? viDate(a.deadline) : '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (a: WorkArea) => <StatusTag status={a.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (a: WorkArea) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('features.areas.viewTasks')}
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/parish/areas/${a.id}/tasks`)
              }}
            >
              <ListChecks className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, seasonMap, userNameById, communityNameById, navigate],
  )

  const isPending = seasonsPending || areasPending

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="hub-area-season" className="lbl-mono cursor-pointer">
            {t('features.areas.seasonFilter')}:
          </label>
          <select
            id="hub-area-season"
            aria-label={t('features.areas.seasonFilter')}
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className={cn(SELECT_CLS, 'h-9 w-auto min-w-[200px] text-xs font-medium')}
          >
            <option value="all">{t('features.areas.allSeasons')}</option>
            {parishSeasons.map((s) => (
              <option key={s.id} value={s.id}>
                {t('features.areas.seasonBadge', { year: s.year })} ({t(`status.${s.status}`, s.status)})
              </option>
            ))}
          </select>
          <span className="tabular text-xs font-semibold text-muted-foreground">
            {t('common.total', { n: areas.length })}
          </span>
        </div>
      </div>

      <p className="mb-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t('features.parish.areasReadOnly')}
      </p>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={areas}
          columns={columns}
          searchKeys={['name']}
          emptyText={t('features.parish.emptyAreas')}
          onRowClick={(a) => navigate(`/parish/areas/${a.id}/tasks`)}
        />
      )}
    </div>
  )
}

const TABS = [
  { key: 'parish', labelKey: 'features.parish.tabParish' },
  { key: 'communities', labelKey: 'features.parish.tabCommunities' },
  // 12/11/2026: mùa Giáng sinh gộp vào hub này (ADMIN chỉ xem; ban hành giáo
  // vẫn dùng trang riêng /community/seasons để tạo & tương tác).
  { key: 'seasons', labelKey: 'features.parish.tabSeasons' },
  { key: 'areas', labelKey: 'features.parish.tabAreas' },
  // 26/11/2026: ảnh sơ đồ giáo xứ (chỉ ADMIN tải lên) — tab riêng để không mất
  // chỗ tải ảnh khi tab Bản đồ bị gộp vào UI khu vực.
  { key: 'map', labelKey: 'features.parish.tabMap' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function CommunitiesPage() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const scope = useParishScope()
  const { parishId, canPickParish } = scope
  const { user } = useAuth()
  const canEdit = user?.role === 'PARISH'
  const [parishCreateOpen, setParishCreateOpen] = useState(false)

  // Chip đếm cạnh hàng tab (bản thiết kế Pen): số cộng đoàn + số khu đang chạy.
  // Dùng lại đúng query key của panel nên không phát sinh request thừa.
  const { data: hubCommunities = [] } = useCommunities({ parishId, enabled: Boolean(parishId) })
  const { data: hubSeasons = [] } = useSeasons()
  const hubSeasonIds = useMemo(
    () => hubSeasons.filter((x) => x.parishId === parishId).map((x) => x.id),
    [hubSeasons, parishId],
  )
  const { data: hubAreas = [] } = useAreas(hubSeasonIds)
  const runningAreas = hubAreas.filter((a) => a.status === 'IN_PROGRESS').length

  const tabFromUrl = params.get('tab')
  const tab: TabKey =
    pathname.endsWith('/areas')
      ? 'areas'
      : TABS.some((x) => x.key === tabFromUrl)
        ? (tabFromUrl as TabKey)
        : 'communities'

  const setTab = (next: TabKey) => {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        nextParams.set('tab', next)
        return nextParams
      },
      { replace: true },
    )
  }

  return (
    <div>
      <PageHeader
        title={t('features.parish.hubTitle')}
        sub={t('features.parish.hubSub')}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ParishSwitcher scope={scope} />
            {canPickParish && (
              <button
                type="button"
                onClick={() => setParishCreateOpen(true)}
                className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
              >
                <Church className="size-[15px] text-white" aria-hidden />
                <span className="text-[12px] font-bold text-white">
                  {t('features.parish.createParish', { defaultValue: 'Tạo giáo xứ mới' })}
                </span>
              </button>
            )}
          </div>
        }
      />

      {/* Sub-tabs: Giáo xứ / Cộng đoàn / Khu vực công tác — chip đếm nằm bên phải
          đúng bản thiết kế Pen (Tabs Bar: tabs bên trái, Count Chip bên phải). */}
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-[16px]">
      <div
        role="tablist"
        aria-label={t('features.parish.hubTitle')}
        className="flex w-fit flex-wrap gap-[4px] rounded-[12px] bg-[#EAF0E6] p-[4px]"
      >
        {TABS.map((item) => {
          const active = tab === item.key
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={cn(
                'flex h-[32px] items-center justify-center rounded-[9px] px-[13px] text-[12px] transition-colors',
                active
                  ? 'bg-white font-bold text-[#0A5C36] shadow-[0px_1px_3px_#06281B1A]'
                  : 'font-medium text-[#7C9287] hover:text-[#0B2E1F]',
              )}
            >
              {t(item.labelKey)}
            </button>
          )
        })}
      </div>
        <span className="flex w-fit items-center gap-[6px] rounded-full border border-[#E3EAE0] bg-white px-[10px] py-[5px]">
          <ListChecks className="size-3 text-[#4F7A61]" aria-hidden />
          <span className="text-[10.5px] font-semibold text-[#4F7A61]">
            {t('features.parish.hubCount', { communities: hubCommunities.length, areas: runningAreas })}
          </span>
        </span>
      </div>

      {!parishId && !scope.isPending ? (
        <Card className="p-6 text-sm text-muted-foreground">{t('features.parish.noParish')}</Card>
      ) : tab === 'parish' ? (
        parishId ? (
          <div className="space-y-4">
            <ParishCard parishId={parishId} />
            <p className="text-xs text-muted-foreground">{t('features.parish.hubParishHint')}</p>
          </div>
        ) : null
      ) : tab === 'communities' ? (
        parishId ? (
          <CommunitiesPanel
            parishId={parishId}
            parishName={scope.parishes.find((x) => x.id === parishId)?.name}
            canEdit={canEdit}
            onGoAreas={() => setTab('areas')}
          />
        ) : null
      ) : tab === 'seasons' ? (
        <SeasonListPage embedded />
      ) : tab === 'areas' ? (
        parishId ? <AreasPanel parishId={parishId} /> : null
      ) : tab === 'map' ? (
        parishId ? <ParishMapPage embedded /> : null
      ) : null}

      {parishCreateOpen && <ParishCreateDialog onClose={() => setParishCreateOpen(false)} />}
    </div>
  )
}
