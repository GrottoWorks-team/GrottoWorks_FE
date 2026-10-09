// Danh sách TNV (leader + committee). DataTable: tên (avatar initials),
// giáo khu, kỹ năng badges, điểm, tổng giờ công (tính từ timesheets phía
// client). Search theo tên (toolbar DataTable); lọc kỹ năng = chip tự render
// (skills là mảng — chip filter built-in của DataTable so bằng nên không
// dùng được). Row click → /<role>/volunteers/:id.
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useCommunities } from '@/features/communities/api'
import { useTimesheets } from '@/features/timesheets/api'
import { useUsers } from '@/features/users/api'
import { SKILLS } from '@/types'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

export default function VolunteerListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: users = [], isPending } = useUsers()
  const { data: communities = [] } = useCommunities()
  const { data: timesheets = [] } = useTimesheets()
  const [skill, setSkill] = useState('')

  const prefix = pathname.startsWith('/community') ? '/community' : '/leader'
  const communityName = (id?: string) => communities.find((c) => c.id === id)?.name ?? '—'

  // Tổng giờ công theo volunteerId — client-side (≤ vài trăm dòng).
  const hours = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of timesheets) m.set(x.volunteerId, (m.get(x.volunteerId) ?? 0) + x.hours)
    return m
  }, [timesheets])

  // ADMIN/COMMITTEE không phải TNV — loại khỏi danh sách (Role không có
  // VOLUNTEER, giáo dân là user thường).
  const rows = users
    .filter((u) => u.role !== 'PARISH' && u.role !== 'COMMUNITY')
    .filter((u) => !skill || u.skills.includes(skill))

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('features.volunteers.name'),
        render: (u: User) => (
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Avatar name={u.name} hue={u.avatarHue} size="sm" />
            {u.name}
          </span>
        ),
      },
      {
        key: 'community',
        header: t('features.volunteers.community'),
        render: (u: User) => communityName(u.communityId),
      },
      {
        key: 'skills',
        header: t('features.volunteers.skills'),
        render: (u: User) =>
          u.skills.length ? (
            <span className="flex flex-wrap gap-1">
              {u.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        key: 'points',
        header: t('features.volunteers.points'),
        align: 'right' as const,
        render: (u: User) => (
          <span className="tabular inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-200">
            ★ {u.points}
          </span>
        ),
      },
      {
        key: 'hours',
        header: t('features.volunteers.hours'),
        align: 'right' as const,
        render: (u: User) => (
          <span className="tabular font-semibold text-brand-pine">
            {(hours.get(u.id) ?? 0).toFixed(1)} {t('features.volunteers.hourUnit')}
          </span>
        ),
      },
    ],
    [t, communities, hours],
  )

  return (
    <div>
      <PageHeader title={t('features.volunteers.title')} sub={t('features.volunteers.sub')} />

      {isPending ? (
        <p className="lbl-mono">{t('common.loading')}</p>
      ) : (
        <>
          <div
            className="mb-4 flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t('features.volunteers.filterSkill')}
          >
            {[undefined, ...SKILLS].map((s) => {
              const selected = skill === (s ?? '')
              return (
                <button
                  key={s ?? '__all'}
                  type="button"
                  onClick={() => setSkill(s ?? '')}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                  )}
                >
                  {s ?? t('common.all')}
                </button>
              )
            })}
          </div>
          <DataTable
            rows={rows}
            columns={columns}
            searchKeys={['name']}
            emptyText={t('features.volunteers.empty')}
            onRowClick={(u) => navigate(`${prefix}/volunteers/${u.id}`)}
          />
        </>
      )}
    </div>
  )
}
