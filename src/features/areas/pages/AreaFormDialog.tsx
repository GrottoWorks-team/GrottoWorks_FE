// Dialog tạo/sửa khu vực — RHF + zod: seasonId, name, type, level (PARISH/COMMUNITY +
// communityId khi COMMUNITY), leaderId (LEADER), officerId (OFFICER), deadline, description.
// Select dùng <select> native — style trùng Input (không thêm dependency).
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth'
import { useCommunities, useCreateArea, useSeasons, useUpdateArea, useUsers } from '../api'
import type { Season, WorkArea } from '@/types'

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
      leaderId: z.string().min(1, 'features.areas.leaderRequired'),
      officerId: z.string().min(1, 'features.areas.officerRequired'),
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
}: {
  onClose: () => void
  area?: WorkArea | null // null/undefined = create
  defaultSeasonId?: string
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const isCommunity = user?.role === 'COMMUNITY'
  const { data: users = [] } = useUsers()
  const { data: communities = [] } = useCommunities()
  const { data: seasons = [] } = useSeasons()
  const create = useCreateArea()
  const update = useUpdateArea()
  const editing = Boolean(area)

  // Select options: lọc theo role — leader từ LEADER, officer từ OFFICER.
  const leaders = users.filter((u) => u.role === 'LEADER')
  const officers = users.filter((u) => u.role === 'MATERIAL_OFFICER')

  // Mùa mặc định: ưu tiên season của area, defaultSeasonId prop, hoặc mùa ACTIVE/PLANNED đầu tiên
  const initialSeasonId = useMemo(() => {
    if (area?.seasonId) return area.seasonId
    if (defaultSeasonId) return defaultSeasonId
    const activeOrPlanned = seasons.find((s) => s.status === 'ACTIVE' || s.status === 'PLANNED')
    return activeOrPlanned?.id ?? seasons[0]?.id ?? 's1'
  }, [area?.seasonId, defaultSeasonId, seasons])

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
          leaderId: area.leaderId,
          officerId: area.officerId,
          deadline: area.deadline ?? '',
          description: area.description ?? '',
        }
      : {
          seasonId: initialSeasonId,
          name: '',
          type: 'GROTTO',
          level: isCommunity ? 'COMMUNITY' : 'PARISH',
          communityId: isCommunity ? (user?.communityId ?? '') : '',
          leaderId: '',
          officerId: '',
          deadline: '',
          description: '',
        },
  })
  const level = watch('level')
  const currentSeasonId = watch('seasonId')

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
  }, [isCommunity, user?.communityId, editing, setValue])

  const onSubmit = async (data: FormData) => {
    // PARISH: update gửi null để mock PATCH xoá communityId cũ (shallow merge
    // giữ key); create bỏ key (undefined khỏi JSON).
    const rawCommunityId = isCommunity ? (user?.communityId ?? '') : data.communityId
    const communityId = data.level === 'COMMUNITY' ? rawCommunityId : null
    try {
      if (editing && area) {
        await update.mutateAsync({
          id: area.id,
          ...data,
          communityId,
          deadline: data.deadline || undefined,
          description: data.description || undefined,
        })
        toast(t('features.areas.updated', { name: data.name }))
      } else {
        // Khu mới: tiến độ 0, chưa có TNV/nhiệm vụ, mặc định đúng tiến độ.
        await create.mutateAsync({
          ...data,
          communityId: communityId ?? undefined,
          deadline: data.deadline || undefined,
          description: data.description || undefined,
          progress: 0,
          volunteerCount: 0,
          taskCount: 0,
          status: 'ON_TRACK',
        })
        toast(t('features.areas.created', { name: data.name }))
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
      title={editing ? t('features.areas.edit') : t('features.areas.create')}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="area-form" disabled={isSubmitting}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="area-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="area-season">{t('features.areas.season')}</Label>
          <select id="area-season" className={SELECT_CLS} {...register('seasonId')}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {`Mùa Giáng sinh ${s.year} (${t(`status.${s.status}`, s.status)})`}
              </option>
            ))}
          </select>
          {err(errors.seasonId?.message)}
        </div>

        <div>
          <Label htmlFor="area-name">{t('features.areas.name')}</Label>
          <Input id="area-name" {...register('name')} />
          {err(errors.name?.message)}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="area-type">{t('features.areas.type')}</Label>
            <select id="area-type" className={SELECT_CLS} {...register('type')}>
              {AREA_TYPES.map((v) => (
                <option key={v} value={v}>
                  {t(`features.areas.areaType.${v}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="area-level">{t('features.areas.level')}</Label>
            <select id="area-level" className={SELECT_CLS} {...register('level')}>
              {LEVELS.map((v) => (
                <option key={v} value={v}>
                  {t(`features.areas.level.${v}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {level === 'COMMUNITY' && (
          <div>
            <Label htmlFor="area-community">{t('features.areas.community')}</Label>
            <select
              id="area-community"
              className={SELECT_CLS}
              disabled={isCommunity}
              {...register('communityId')}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="area-leader">{t('features.areas.leader')}</Label>
            <select id="area-leader" className={SELECT_CLS} {...register('leaderId')}>
              <option value="">{t('features.areas.selectPlaceholder')}</option>
              {leaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {err(errors.leaderId?.message)}
          </div>
          <div>
            <Label htmlFor="area-officer">{t('features.areas.officer')}</Label>
            <select id="area-officer" className={SELECT_CLS} {...register('officerId')}>
              <option value="">{t('features.areas.selectPlaceholder')}</option>
              {officers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {err(errors.officerId?.message)}
          </div>
        </div>

        <div>
          <Label htmlFor="area-deadline">{t('features.areas.deadline')}</Label>
          <Input id="area-deadline" type="date" {...register('deadline')} />
          {err(errors.deadline?.message)}
        </div>

        <div>
          <Label htmlFor="area-description">{t('features.areas.description')}</Label>
          <textarea
            id="area-description"
            rows={2}
            placeholder={t('features.areas.descriptionPlaceholder')}
            className={TEXTAREA_CLS}
            {...register('description')}
          />
          {err(errors.description?.message)}
        </div>
      </form>
    </Dialog>
  )
}
