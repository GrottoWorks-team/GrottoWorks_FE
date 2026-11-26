import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusTag } from '@/components/shared/StatusTag'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import type { User } from '@/types'

export default function VolunteerListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const prefix = pathname.startsWith('/community') ? '/community' : '/leader'
  const { data: users = [], isPending, isError, refetch } = useUsers()
  const { data: communities = [] } = useCommunities()

  const volunteers = useMemo(
    () => users.filter((user) => user.rawRole?.toUpperCase() === 'VOLUNTEER'),
    [users],
  )

  const communityName = (communityId?: string) =>
    communities.find((community) => community.id === communityId)?.name
    ?? t('features.volunteers.noCommunity')

  const columns = useMemo<Column<User>[]>(() => [
    {
      key: 'name',
      header: t('features.volunteers.name'),
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} hue={user.avatarHue} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'communityId',
      header: t('features.volunteers.community'),
      render: (user) => <span>{communityName(user.communityId)}</span>,
    },
    {
      key: 'skills',
      header: t('features.volunteers.skills'),
      render: (user) => user.skills.length
        ? <div className="flex flex-wrap gap-1">{user.skills.map((skill) => <Badge key={skill} className="text-[11px]">{skill}</Badge>)}</div>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'points',
      header: t('features.volunteers.points'),
      align: 'right',
      render: (user) => <span className="tabular font-semibold">{user.points}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (user) => <StatusTag status={user.locked ? 'LOCKED' : 'ACTIVE'} />,
    },
  ], [t, communities])

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('features.volunteers.title')}
        finding={`${volunteers.length} ${t('features.volunteers.volunteerCount')}`}
        sub={t('features.volunteers.sub')}
      />
      <Card className="p-4">
        <DataTable
          columns={columns}
          rows={volunteers}
          searchKeys={['name', 'email', 'communityId']}
          filters={[{ key: 'locked', options: ['false', 'true'] }]}
          pageSize={10}
          isPending={isPending}
          isError={isError}
          onRetry={() => void refetch()}
          emptyText={t('features.volunteers.empty')}
          onRowClick={(user) => navigate(`${prefix}/volunteers/${user.id}`)}
          keyExtractor={(user) => user.id}
        />
      </Card>
    </div>
  )
}
