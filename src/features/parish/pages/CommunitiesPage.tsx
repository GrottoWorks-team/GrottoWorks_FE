// Trang giáo xứ & cộng đoàn (route /parish/communities): chỉnh tên giáo xứ
// (parish object đơn — PATCH /api/parish) + CRUD giáo khu (communities) qua
// bảng + dialog. Xoá giáo khu bị chặn khi còn user/area tham chiếu (client
// check trước khi gọi API → toast alert, không mutate).
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { useAreas } from '@/features/areas/api'
import { useUsers } from '@/features/users/api'
import {
  useCommunities,
  useCreateCommunity,
  useDeleteCommunity,
  useParish,
  useRenameParish,
  useUpdateCommunity,
} from '../api'
import type { Community } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'features.parish.communityNameRequired'),
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
  const create = useCreateCommunity()
  const update = useUpdateCommunity()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: community?.name ?? '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (editing && community) {
        await update.mutateAsync({ id: community.id, name: data.name })
        toast(t('features.parish.updated', { name: data.name }))
      } else {
        // parishId: giáo xứ demo duy nhất 'p1' (seed).
        await create.mutateAsync({ name: data.name, parishId: 'p1' })
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
      </form>
    </Dialog>
  )
}

// Card chỉnh tên giáo xứ — inline save (Enter/blur), toast xác nhận.
function ParishCard() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: parish } = useParish()
  const rename = useRenameParish()
  const [name, setName] = useState<string | null>(null)
  const value = name ?? parish?.name ?? ''

  const save = async () => {
    const v = value.trim()
    if (!v || v === parish?.name) return
    try {
      await rename.mutateAsync(v)
      toast(t('features.parish.updated', { name: v }))
      setName(null)
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <Card className="mb-5 p-5">
      <p className="lbl-mono">{t('features.parish.parishName')}</p>
      <div className="mt-2 flex max-w-md gap-2">
        <Input
          aria-label={t('features.parish.parishName')}
          value={value}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
          }}
        />
      </div>
    </Card>
  )
}

export default function CommunitiesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: communities = [], isPending } = useCommunities()
  const { data: users = [] } = useUsers()
  const { data: areas = [] } = useAreas()
  const deleteCommunity = useDeleteCommunity()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Community | null>(null)
  const [deleting, setDeleting] = useState<Community | null>(null)

  // Xoá chặn khi còn tham chiếu: user.communityId hoặc area.communityId.
  const onDelete = async (c: Community) => {
    const used =
      users.some((u) => u.communityId === c.id) || areas.some((a) => a.communityId === c.id)
    if (used) {
      toast(t('features.parish.communityInUse', { name: c.name }), 'alert')
      return
    }
    try {
      await deleteCommunity.mutateAsync(c.id)
      toast(t('features.parish.deleted', { name: c.name }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.parish.communityName'),
        render: (c: Community) => <span className="font-semibold">{c.name}</span>,
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
        key: 'actions',
        header: t('common.actions'),
        render: (c: Community) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => {
                setEditing(c)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.delete')}
              onClick={() => setDeleting(c)}
            >
              <Trash2 className="size-4" />
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
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t('features.parish.createCommunity')}
          </Button>
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
        />
      )}

      {formOpen && <CommunityFormDialog community={editing} onClose={() => setFormOpen(false)} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('features.parish.deleteTitle')}
        description={deleting ? t('features.parish.deleteConfirm', { name: deleting.name }) : undefined}
        confirmLabel={t('common.delete')}
        tone="destructive"
        onConfirm={() => deleting && onDelete(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
