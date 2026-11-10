// Trang tài khoản (route /parish/accounts): DataTable users + chip lọc role,
// switch khoá/mở (user bị khoá → login 401), sửa/xoá qua dialog.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, UserCog } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { cn } from '@/lib/utils'
import { useAssignUserRole, useLockUser, useRoles, useUnlockUser } from '../api'
import { AccountFormDialog } from './AccountFormDialog'
import type { User } from '@/types'
import { errorMessage } from '@/lib/errorMessage'

// Switch khoá/mở — pattern trang Checklist.
function LockSwitch({
  checked,
  disabled,
  label,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      disabled={disabled}
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled}
      title={disabled ? 'Tài khoản vô hiệu hoá (INACTIVE) không thể khoá/mở khoá' : label}
      onClick={disabled ? undefined : onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40 border-stone-300 bg-stone-200'
          : checked
            ? 'border-destructive bg-destructive'
            : 'border-border bg-brand-pine',
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
  const { data: rolesData } = useRoles()
  const lockUser = useLockUser()
  const unlockUser = useUnlockUser()
  const assignRole = useAssignUserRole()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [newRole, setNewRole] = useState<string>('LEADER')
  const [isChangingRole, setIsChangingRole] = useState(false)

  const availableRoles = useMemo(() => {
    return rolesData?.length
      ? rolesData.map((r) => r.code)
      : ['ADMIN', 'PARISH', 'LEADER', 'MO', 'VOLUNTEER']
  }, [rolesData])

  const communityName = (id?: string) => communities.find((c) => c.id === id)?.name ?? '—'

  // Khoá/mở qua POST /api/v1/admin/users/{userId}/lock và /unlock kèm version (If-Match)
  const toggleLock = async (u: User) => {
    if (u.status?.toUpperCase() === 'INACTIVE') {
      toast('Tài khoản đã vô hiệu hoá (INACTIVE), không thể thao tác khoá/mở khoá', 'alert')
      return
    }
    try {
      if (u.locked) {
        await unlockUser.mutateAsync({ id: u.id, version: u.version, reason: 'Mở khoá tài khoản từ trang quản trị' })
        toast(t('features.parish.unlocked', { name: u.name }))
      } else {
        await lockUser.mutateAsync({ id: u.id, version: u.version, reason: 'Khoá tài khoản từ trang quản trị' })
        toast(t('features.parish.locked', { name: u.name }))
      }
    } catch (err) {
      toast(errorMessage(err), 'alert')
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
        render: (u: User) => {
          const isInactive = u.status?.toUpperCase() === 'INACTIVE'
          return (
            <div className="flex justify-center items-center gap-1.5">
              <LockSwitch
                checked={Boolean(u.locked)}
                disabled={isInactive}
                label={t('features.parish.lockSwitch', { name: u.name })}
                onToggle={() => void toggleLock(u)}
              />
              {isInactive && (
                <span className="text-[10px] font-medium text-stone-500 uppercase">
                  Inactive
                </span>
              )}
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (u: User) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('features.accounts.changeRole')}
              title={t('features.accounts.changeRole')}
              onClick={() => {
                setRoleTarget(u)
                const initialRole = u.rawRole ?? (u.role === 'MATERIAL_OFFICER' ? 'MO' : u.role)
                setNewRole(initialRole)
              }}
            >
              <UserCog className="size-4 text-emerald-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.edit')}
              title={t('common.edit')}
              onClick={() => {
                setEditing(u)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [t, communities, lockUser, unlockUser, toast],
  )

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

      {roleTarget && (
        <Dialog
          open={Boolean(roleTarget)}
          onClose={() => setRoleTarget(null)}
          title={t('features.accounts.changeRoleTitle')}
          footer={
            <>
              <Button variant="outline" onClick={() => setRoleTarget(null)}>
                {t('common.cancel')}
              </Button>
              <Button
                disabled={isChangingRole}
                onClick={async () => {
                  setIsChangingRole(true)
                  try {
                    await assignRole.mutateAsync({
                      id: roleTarget.id,
                      version: roleTarget.version,
                      role: newRole,
                      parishId: newRole === 'ADMIN' ? null : roleTarget.parishId ?? null,
                    })
                    toast(t('features.accounts.changeRoleSuccess'))
                    setRoleTarget(null)
                  } catch (err) {
                    toast(errorMessage(err), 'alert')
                  } finally {
                    setIsChangingRole(false)
                  }
                }}
              >
                {isChangingRole ? t('common.loading') : t('common.confirm')}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Đổi vai trò cho tài khoản <strong>{roleTarget.name}</strong> ({roleTarget.email}).
            </p>
            <div>
              <label htmlFor="select-new-role" className="block text-xs font-medium text-stone-700 mb-1">
                {t('features.accounts.selectRole')}
              </label>
              <select
                id="select-new-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {t(`role.${r}`, { defaultValue: r })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
