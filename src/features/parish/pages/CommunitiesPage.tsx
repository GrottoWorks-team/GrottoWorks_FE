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
  Pencil,
  Plus,
  Church,
  MapPin,
  Info,
  Check,
  ShieldCheck,
  Map as MapIcon,
  ListChecks,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
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
  name: z.string().trim().min(1, 'Tên giáo xứ không được để trống'),
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
            placeholder="Ví dụ: Giáo xứ Thánh Giuse"
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
            placeholder="Ví dụ: 123 Đường Hai Bà Trưng, Quận 1"
          />
        </div>
        <div>
          <Label htmlFor="create-parish-desc">
            {t('features.parish.parishDescription', { defaultValue: 'Mô tả' })}
          </Label>
          <Input
            id="create-parish-desc"
            {...register('description')}
            placeholder="Ví dụ: Giáo phận Sài Gòn"
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
    <Card className="overflow-hidden border border-border p-5 shadow-card transition-shadow hover:shadow-hover">
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
                defaultValue: 'Cơ sở điều phối chính thức của Giáo xứ',
              })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Tab Cộng đoàn — bảng giáo khu + CRUD.
function CommunitiesPanel({ parishId, canEdit }: { parishId: string; canEdit: boolean }) {
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

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.parish.communityName'),
        render: (c: Community) => (
          <span className="font-semibold text-foreground hover:text-primary transition-colors">
            {c.name}
          </span>
        ),
      },
      {
        key: 'description',
        header: t('features.parish.communityDescription'),
        render: (c: Community) => (
          <span className="text-xs text-muted-foreground" title={c.description}>
            {c.description ? (c.description.length > 40 ? `${c.description.slice(0, 40)}…` : c.description) : '—'}
          </span>
        ),
      },
      {
        key: 'members',
        header: t('features.parish.members'),
        align: 'right' as const,
        render: (c: Community) => (
          <span className="tabular">{users.filter((u) => u.communityId === c.id).length}</span>
        ),
      },
      {
        key: 'areas',
        header: t('features.areas.title'),
        align: 'right' as const,
        render: (c: Community) => (
          <span className="tabular">{areas.filter((a) => a.communityId === c.id).length}</span>
        ),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (c: Community) => <StatusTag status={c.status} />,
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (c: Community) =>
          canEdit ? (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.edit')}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditing(c)
                  setFormOpen(true)
                }}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          ) : null,
      },
    ],
    [t, users, areas, canEdit],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('features.parish.communitiesSub')}</p>
        {canEdit && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4 mr-1.5" />
            {t('features.parish.createCommunity')}
          </Button>
        )}
      </div>

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={communities}
          columns={columns}
          searchKeys={['name']}
          emptyText={t('features.parish.empty')}
          onRowClick={
            canEdit
              ? (c) => {
                  setEditing(c)
                  setFormOpen(true)
                }
              : undefined
          }
        />
      )}

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
const areaLabel = (a: WorkArea) => a.name?.trim() || `Khu vực #${a.id.slice(0, 8)}`

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
] as const
type TabKey = (typeof TABS)[number]['key']

export default function CommunitiesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const scope = useParishScope()
  const { parishId, canPickParish } = scope
  const { user } = useAuth()
  const canEdit = user?.role === 'PARISH'
  const [parishCreateOpen, setParishCreateOpen] = useState(false)

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

  const mapHref = `/parish/communities/map${parishId ? `?parish=${encodeURIComponent(parishId)}` : ''}`

  return (
    <div>
      <PageHeader
        title={t('features.parish.hubTitle')}
        sub={t('features.parish.hubSub')}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ParishSwitcher scope={scope} />
            <Button variant="outline" onClick={() => navigate(mapHref)}>
              <MapIcon className="size-4 mr-1.5" />
              {t('features.parish.openMap')}
            </Button>
            {canPickParish && (
              <Button
                variant="outline"
                onClick={() => setParishCreateOpen(true)}
                className="border-brand-pine/30 text-brand-pine hover:bg-brand-pine/10"
              >
                <Church className="size-4 mr-1.5" />
                {t('features.parish.createParish', { defaultValue: 'Tạo giáo xứ mới' })}
              </Button>
            )}
          </div>
        }
      />

      {/* Sub-tabs: Giáo xứ / Cộng đoàn / Khu vực công tác */}
      <div
        role="tablist"
        aria-label={t('features.parish.hubTitle')}
        className="mb-5 flex flex-wrap gap-1 border-b border-border"
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
                '-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(item.labelKey)}
            </button>
          )
        })}
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
          <CommunitiesPanel parishId={parishId} canEdit={canEdit} />
        ) : null
      ) : tab === 'seasons' ? (
        <SeasonListPage embedded />
      ) : parishId ? (
        <AreasPanel parishId={parishId} />
      ) : null}

      {parishCreateOpen && <ParishCreateDialog onClose={() => setParishCreateOpen(false)} />}
    </div>
  )
}
