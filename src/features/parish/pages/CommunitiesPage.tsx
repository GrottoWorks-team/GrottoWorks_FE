// Trang giáo xứ & cộng đoàn (route /parish/communities): chỉnh tên giáo xứ
// (parish object đơn — PATCH /api/parish) + CRUD giáo khu (communities) qua
// bảng + dialog. Xoá giáo khu bị chặn khi còn user/area tham chiếu (client
// check trước khi gọi API → toast alert, không mutate).
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Church, MapPin, Info, Check, ShieldCheck } from 'lucide-react'
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
import { useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import {
  useCommunities,
  useCreateCommunity,
  useCreateParish,
  useParish,
  useUpdateParish,
  useUpdateCommunity,
} from '../api'
import { useCurrentParishId } from '../hooks'
import type { Community } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'features.parish.communityNameRequired'),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})
type FormData = z.infer<typeof schema>

// Dialog tạo/sửa giáo khu — mount có điều kiện.
function CommunityFormDialog({
  onClose,
  community,
}: {
  onClose: () => void
  community?: Community | null
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const editing = Boolean(community)
  const { parishId } = useCurrentParishId()
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
        await create.mutateAsync({ name: data.name, parishId: parishId! })
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
function ParishCard() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: parish } = useParish()
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
    <Card className="mb-6 overflow-hidden border border-border p-5 shadow-card transition-shadow hover:shadow-hover">
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

export default function CommunitiesPage() {
  const { t } = useTranslation()
  const { data: communities = [], isPending } = useCommunities()
  const { data: users = [] } = useUsers()
  const { data: areas = [] } = useAreas()

  const [formOpen, setFormOpen] = useState(false)
  const [parishCreateOpen, setParishCreateOpen] = useState(false)
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
        render: (c: Community) => (
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
        ),
      },
    ],
    [t, users, areas],
  )

  return (
    <div>
      <PageHeader
        title={t('features.parish.communitiesTitle')}
        sub={t('features.parish.communitiesSub')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setParishCreateOpen(true)}
              className="border-brand-pine/30 text-brand-pine hover:bg-brand-pine/10"
            >
              <Church className="size-4 mr-1.5" />
              {t('features.parish.createParish', { defaultValue: 'Tạo giáo xứ mới' })}
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus className="size-4 mr-1.5" />
              {t('features.parish.createCommunity')}
            </Button>
          </div>
        }
      />

      <ParishCard />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={communities}
          columns={columns}
          searchKeys={['name']}
          emptyText={t('features.parish.empty')}
          onRowClick={(c) => {
            setEditing(c)
            setFormOpen(true)
          }}
        />
      )}

      {parishCreateOpen && <ParishCreateDialog onClose={() => setParishCreateOpen(false)} />}
      {formOpen && <CommunityFormDialog community={editing} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
