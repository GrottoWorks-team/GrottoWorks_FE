// Trang tài khoản (route /parish/accounts): DataTable users + chip lọc role,
// switch khoá/mở (user bị khoá → login 401), sửa qua dialog.
// BE không có DELETE user → chỉ khoá/mở, không xoá.
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { cn } from '@/lib/utils'
import { useLockUser, useUnlockUser } from '../api'
import { AccountFormDialog } from './AccountFormDialog'
import type { User } from '@/types'

// Switch khoá/mở — kích thước/màu lấy từ Pen (32×18, đỏ #C7503F khi khoá).
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
        'flex h-[18px] w-[32px] shrink-0 items-center rounded-full p-[2px] transition-colors',
        checked ? 'justify-start bg-[#C7503F]' : 'justify-end bg-[#12805A]',
      )}
    >
      <span aria-hidden className="block size-[14px] rounded-full bg-white" />
    </button>
  )
}

export default function AccountsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data: users = [], isPending } = useUsers()
  const { data: communities = [] } = useCommunities()
  const lockUser = useLockUser()
  const unlockUser = useUnlockUser()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const communityName = (id?: string) => communities.find((c) => c.id === id)?.name ?? '—'

  // Khoá/mở qua POST /api/v1/admin/users/{userId}/lock và /unlock
  const toggleLock = async (u: User) => {
    try {
      if (u.locked) {
        await unlockUser.mutateAsync({ id: u.id, reason: t('features.parish.unlockReason') })
        toast(t('features.parish.unlocked', { name: u.name }))
      } else {
        await lockUser.mutateAsync({ id: u.id, reason: t('features.parish.lockReason') })
        toast(t('features.parish.locked', { name: u.name }))
      }
    } catch {
      toast(t('common.error'), 'alert')
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: t('features.parish.name'), render: (u: User) => <span className="font-semibold">{u.name}</span> },
      { key: 'email', header: t('features.parish.email') },
      {
        key: 'role',
        header: t('features.parish.role'),
        render: (u: User) => (
          // Nhãn role dạng viên thuốc — màu lấy đúng từ Pen (KHOA.pen).
          <span
            className={cn(
              'inline-flex whitespace-nowrap rounded-full border px-[9px] py-[4px] text-[10px] font-bold',
              u.role === 'PARISH' || u.role === 'LEADER'
                ? u.role === 'PARISH'
                  ? 'border-[#0A5C36] bg-[#0A5C36] text-white'
                  : 'border-[#EDD9A6] bg-[#FCF3DE] text-[#9A6A0C]'
                : u.role === 'MATERIAL_OFFICER'
                  ? 'border-[#DDE4D9] bg-[#EFF2EE] text-[#5C7468]'
                  : 'border-[#CBE3D2] bg-[#E9F4EC] text-[#1B6B45]',
            )}
          >
            {t(`role.${u.role}`)}
          </span>
        ),
      },
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
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] bg-[#0A5C36] px-[13px] shadow-[0px_6px_14px_#0A5C362E] transition-colors hover:bg-[#0D7344]"
          >
            <Plus className="size-[14px] text-white" aria-hidden />
            <span className="text-[12px] font-bold text-white">{t('features.parish.createAccount')}</span>
          </button>
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
    </div>
  )
}
