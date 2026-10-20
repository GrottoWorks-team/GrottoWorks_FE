// Dialog tạo/sửa tài khoản (AccountsPage): name, email, role select, giáo khu
// (bắt buộc khi role ≠ ADMIN), skills multi-checkbox. RHF + zod, message zod =
// i18n key. Cha mount có điều kiện → mỗi lần mở là form mới create/edit.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useCommunities } from '@/features/communities/api'
import { useAdminSkills, useAssignUserRole, useCreateUser, useRoles, useUpdateUser } from '../api'
import { useCurrentParishId } from '../hooks'
import type { User } from '@/types'

export const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

const CHECK_CLS = 'size-4 rounded border border-border bg-card accent-primary'

const FALLBACK_ROLES = ['PARISH', 'COMMUNITY', 'LEADER', 'MATERIAL_OFFICER'] as const

const schema = z
  .object({
    name: z.string().trim().min(1, 'features.parish.nameRequired'),
    email: z
      .string()
      .trim()
      .min(1, 'features.parish.emailRequired')
      .email('features.parish.emailInvalid'),
    role: z.string().min(1),
    communityId: z.string(),
    password: z.string().optional(),
    skills: z.array(z.string()),
  })
  .refine((d) => d.role === 'PARISH' || d.role === 'ADMIN' || d.communityId !== '', {
    path: ['communityId'],
    message: 'features.parish.communityRequired',
  })

type FormData = z.infer<typeof schema>

export function AccountFormDialog({
  onClose,
  account,
}: {
  onClose: () => void
  account?: User | null // null/undefined = create
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const editing = Boolean(account)
  const create = useCreateUser()
  const update = useUpdateUser()
  const assignRole = useAssignUserRole()
  const { data: rolesData } = useRoles()
  const { data: communities = [] } = useCommunities()
  const { data: skills = [] } = useAdminSkills()
  const { parishId } = useCurrentParishId()

  const availableRoles = rolesData?.length
    ? rolesData.map((r) => r.code)
    : FALLBACK_ROLES

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: account
      ? {
          name: account.name,
          email: account.email,
          role: account.role,
          communityId: account.communityId ?? '',
          password: '',
          skills: account.skills,
        }
      : { name: '', email: '', role: 'LEADER', communityId: '', password: '', skills: [] },
  })

  const onSubmit = async (data: FormData) => {
    try {
      if (editing && account) {
        await update.mutateAsync({
          id: account.id,
          displayName: data.name,
          email: data.email,
        })
        if (data.role !== account.role) {
          await assignRole.mutateAsync({
            id: account.id,
            role: data.role,
            parishId: data.role === 'ADMIN' ? null : parishId ?? null,
          })
        }
        toast(t('features.parish.updated', { name: data.name }))
      } else {
        await create.mutateAsync({
          displayName: data.name,
          email: data.email,
          role: data.role,
          parishId: data.role === 'ADMIN' ? null : parishId ?? null,
          password: data.password && data.password.length >= 8 ? data.password : null,
        })
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
      size="md"
      title={editing ? t('features.parish.editAccount') : t('features.parish.createAccount')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="account-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="account-name">{t('features.parish.name')}</Label>
          <Input id="account-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>
        <div>
          <Label htmlFor="account-email">{t('features.parish.email')}</Label>
          <Input id="account-email" type="email" {...register('email')} />
          {err(errors.email?.message)}
        </div>
        {!editing && (
          <div>
            <Label htmlFor="account-password">{t('features.parish.password')}</Label>
            <Input id="account-password" type="password" placeholder="Tối thiểu 8 ký tự (hoặc để trống)" {...register('password')} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="account-role">{t('features.parish.role')}</Label>
            <select id="account-role" className={SELECT_CLS} {...register('role')}>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`, { defaultValue: r })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="account-community">{t('features.parish.community')}</Label>
            <select id="account-community" className={SELECT_CLS} {...register('communityId')}>
              <option value="">{t('features.parish.selectPlaceholder')}</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {err(errors.communityId?.message)}
          </div>
        </div>
        <div>
          <Label>{t('features.parish.skills')}</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {skills.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm text-foreground">
                <input type="checkbox" value={s} className={CHECK_CLS} {...register('skills')} />
                {s}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
