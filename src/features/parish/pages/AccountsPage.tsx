// Trang tài khoản (route /parish/accounts): DataTable users + chip lọc role,
// switch khoá/mở (user bị khoá → login 401, xem handlers.ts), sửa/xoá qua dialog.
// Switch pattern ChecklistPage: role="switch" + knob transition-transform.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { cn } from '@/lib/utils'
import { useDeleteUser, useUpdateUser } from '../api'
import { AccountFormDialog } from './AccountFormDialog'
import type { User } from '@/types'

// Switch khoá/mở — pattern trang Checklist (không có primitive switch).
function LockSwitch({
  checked,
  label,
  onToggle,
}: {
  checked: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked ? 'border-destructive bg-destructive' : 'border-border bg-brand-pine',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-3.5 rounded-full bg-card shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

export default function AccountsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [], isPending } = useUsers()
  const { data: communities = [] } = useCommunities()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)

  const communityName = (id?: string) => communities.find((c) => c.id === id)?.name ?? '—'

  // Khoá/mở: PATCH locked — khoá xong user đó login sẽ 401 ngay (mock login
  // lọc !x.locked). Không khoá chính mình (mất quyền vào trang này).
  const toggleLock = async (u: User) => {
    try {
      await updateUser.mutateAsync({ id: u.id, locked: !u.locked })
      toast(t(!u.locked ? 'features.parish.locked' : 'features.parish.unlocked', { name: u.name }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: t('features.parish.name'), render: (u: User) => <span className="font-semibold">{u.name}</span> },
      { key: 'email', header: t('features.parish.email') },
      { key: 'role', header: t('features.parish.role'), render: (u: User) => t(`role.${u.role}`) },
      { key: 'communityId', header: t('features.parish.community'), render: (u: User) => communityName(u.communityId) },
      {
        key: 'skills',
        header: t('features.parish.skills'),
        render: (u: User) => (u.skills.length ? u.skills.join(', ') : '—'),
      },
      { key: 'points', header: t('features.volunteers.points'), align: 'right' as const, render: (u: User) => <span className="tabular">{u.points}</span> },
      {
        key: 'locked',
        header: t('features.parish.lockedCol'),
        align: 'center' as const,
        render: (u: User) => (
          <div className="flex justify-center">
            <LockSwitch
              checked={Boolean(u.locked)}
              label={t('features.parish.lockSwitch', { name: u.name })}
              onToggle={() => void toggleLock(u)}
            />
          </div>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (u: User) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              onClick={() => {
                setEditing(u)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.delete')}
              onClick={() => setDeleting(u)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, communities, updateUser, toast],
  )

  const onDelete = async (u: User) => {
    try {
      await deleteUser.mutateAsync(u.id)
      toast(t('features.parish.deleted', { name: u.name }))
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  return (
    <div>
      <PageHeader
        title={t('features.parish.accountsTitle')}
        sub={t('features.parish.accountsSub')}
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t('features.parish.createAccount')}
          </Button>
        }
      />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <DataTable
          rows={users}
          columns={columns}
          searchKeys={['name', 'email']}
          filters={[{ key: 'role', options: ['PARISH', 'COMMUNITY', 'LEADER', 'MATERIAL_OFFICER'] }]}
          emptyText={t('features.parish.empty')}
        />
      )}

      {formOpen && <AccountFormDialog account={editing} onClose={() => setFormOpen(false)} />}
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
