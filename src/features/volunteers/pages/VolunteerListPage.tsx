// Danh sách tình nguyện viên (/community/volunteers, /leader/volunteers).
//   GET /api/v1/users        — hồ sơ, giáo khu, kỹ năng, điểm, khoá
//   GET /api/v1/communities  — tên giáo khu
//   GET /api/v1/dashboards/season — tổng giờ công đã duyệt của mùa (chỉ role PARISH đọc)
// Bố cục/màu/cỡ chữ theo bản thiết kế Pen "Mùa — Tình Nguyện Viên".
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock3, FileDown, ShieldOff, UserCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { useCommunities } from '@/features/communities/api'
import { useUsers } from '@/features/users/api'
import { useSeasonDashboard } from '@/features/dashboards/api'
import { useSeasonContext } from '@/features/season/season-context'
import { useAuth } from '@/lib/auth'
import { exportCsv } from '@/lib/csv'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

const CARD =
  'w-full overflow-hidden rounded-[16px] border border-[#E3EAE0] bg-white shadow-[0px_1px_2px_#06281B0A]'
const RULE = 'h-px w-full bg-[#ECF1E9]'
const TH = 'font-mono text-[9px] font-semibold uppercase tracking-[1px] text-[#8C9F94]'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

export default function VolunteerListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const prefix = pathname.startsWith('/community') ? '/community' : '/leader'

  const { user: me } = useAuth()
  const { season, seasonId } = useSeasonContext()
  const { data: users = [], isPending, isError, refetch } = useUsers()
  const { data: communities = [] } = useCommunities()
  // Reporting chỉ mở dashboard mùa cho ban hành giáo (BE PARISH → FE COMMUNITY); leader/ADMIN bỏ trống.
  const { data: dashboard } = useSeasonDashboard(me?.role === 'COMMUNITY' ? seasonId : undefined)

  const volunteers = useMemo(
    () => users.filter((user) => user.rawRole?.toUpperCase() === 'VOLUNTEER'),
    [users],
  )

  const active = volunteers.filter((v) => !v.locked)
  const locked = volunteers.length - active.length
  const withSkills = volunteers.filter((v) => v.skills.length > 0).length
  const withoutCommunity = volunteers.filter((v) => !v.communityId).length
  const approvedHours = dashboard?.summary.volunteers.approvedHours ?? 0

  const communityName = (user: User) =>
    communities.find((community) => community.id === user.communityId)?.name
    ?? t('features.volunteers.noCommunity')

  const onExport = () => {
    exportCsv(
      'grottoworks-tinh-nguyen-vien.csv',
      volunteers.map((v) => ({
        [t('features.volunteers.name')]: v.name,
        Email: v.email,
        [t('features.volunteers.community')]: communityName(v),
        [t('features.volunteers.skills')]: v.skills.join(', '),
        [t('features.volunteers.points')]: v.points,
        [t('common.status')]: v.locked
          ? t('features.volunteers.statusLocked', { defaultValue: 'Bị khoá' })
          : t('features.volunteers.statusActive', { defaultValue: 'Đang hoạt động' }),
      })),
    )
  }

  const stats = [
    {
      key: 'total',
      icon: Users,
      label: t('features.volunteers.statTotal', { defaultValue: 'Tổng tình nguyện viên' }),
      value: String(volunteers.length),
      hint: season
        ? t('features.volunteers.statTotalHint', { defaultValue: 'Trong mùa {{season}}', season: season.name })
        : t('features.volunteers.statTotalHintEmpty', { defaultValue: 'Toàn giáo xứ' }),
      warn: false,
    },
    {
      key: 'active',
      icon: UserCheck,
      label: t('features.volunteers.statActive', { defaultValue: 'Đang hoạt động' }),
      value: String(active.length),
      hint: t('features.volunteers.statActiveHint', { defaultValue: 'Tài khoản đang hoạt động' }),
      warn: false,
    },
    {
      key: 'locked',
      icon: ShieldOff,
      label: t('features.volunteers.statusLocked', { defaultValue: 'Bị khoá' }),
      value: String(locked),
      hint: t('features.volunteers.statLockedHint', { defaultValue: 'Tài khoản tạm khoá' }),
      warn: locked > 0,
    },
    {
      key: 'hours',
      icon: Clock3,
      label: t('features.volunteers.statHours', { defaultValue: 'Tổng giờ công' }),
      value: t('features.volunteers.hoursValue', {
        defaultValue: '{{hours}} giờ',
        hours: approvedHours.toLocaleString(i18n.language === 'en' ? 'en-US' : 'vi-VN'),
      }),
      hint: approvedHours > 0
        ? t('features.volunteers.statHoursHint', { defaultValue: 'Giờ công đã duyệt trong mùa' })
        : t('features.volunteers.statHoursNone', { defaultValue: 'Chưa ghi nhận' }),
      warn: false,
    },
  ]

  const overview = [
    { key: 'active', label: stats[1].label, value: active.length, tone: 'text-[#1B6B45]' },
    { key: 'locked', label: stats[2].label, value: locked, tone: 'text-[#A33F37]' },
    {
      key: 'skills',
      label: t('features.volunteers.hasSkills', { defaultValue: 'Có kỹ năng' }),
      value: withSkills,
      tone: 'text-[#0B2E1F]',
    },
    {
      key: 'noCommunity',
      label: t('features.volunteers.noArea', { defaultValue: 'Chưa gán khu' }),
      value: withoutCommunity,
      tone: 'text-[#0B2E1F]',
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('features.volunteers.title')}
        sub={
          <>
            {t('features.volunteers.countInParish', {
              defaultValue: '{{count}} tình nguyện viên trong giáo xứ',
              count: volunteers.length,
            })}
            {' · '}
            {t('features.volunteers.sub')}.
          </>
        }
        actions={
          <button
            type="button"
            onClick={onExport}
            disabled={volunteers.length === 0}
            className="flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#DBE5D6] bg-white px-3 transition-colors hover:bg-[#F4F8F1] disabled:opacity-55"
          >
            <FileDown className="size-[13px] text-[#3F7F5B]" aria-hidden />
            <span className="text-[12px] font-semibold text-[#2C463A]">
              {t('features.volunteers.exportCsv', { defaultValue: 'Xuất CSV' })}
            </span>
          </button>
        }
      />

      <div className="flex w-full flex-col gap-[16px]">
        <div className="grid w-full gap-[14px] sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ key, icon: Icon, label, value, hint, warn }) => (
            <section
              key={key}
              className="flex w-full flex-col gap-[9px] rounded-[16px] border border-[#E3EAE0] bg-white p-[15px] shadow-[0px_1px_2px_#06281B0A]"
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={cn(
                    'grid size-[26px] shrink-0 place-items-center rounded-[8px]',
                    warn ? 'bg-[#F7F4E7]' : 'bg-[#EDF4EA]',
                  )}
                >
                  <Icon
                    className={cn('size-[13px]', warn ? 'text-[#A8830F]' : 'text-[#3F7F5B]')}
                    aria-hidden
                  />
                </span>
                <span className="min-w-0 flex-1 text-right font-mono text-[8.5px] font-semibold uppercase leading-[13px] tracking-[1px] text-[#97AB9E]">
                  {label}
                </span>
              </div>
              <span className="font-mono text-[28px] font-extrabold leading-none tracking-[-1px] text-[#0B2E1F]">
                {value}
              </span>
              <span className="w-full text-[10.5px] leading-[15px] text-[#8AA298]">{hint}</span>
            </section>
          ))}
        </div>

        <div className="flex w-full flex-col items-start gap-[16px] xl:flex-row">
          <div className={cn(CARD, 'min-w-0 flex-1')}>
            <div className="flex w-full items-center justify-between gap-3 px-4 py-[14px]">
              <span className="text-[9.5px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                {t('features.volunteers.listHead', { defaultValue: 'Danh sách tình nguyện viên' })}
              </span>
              <span className="flex w-fit items-center rounded-full bg-[#F1F6EE] px-[9px] py-1 text-[10px] font-bold text-[#4F7A61]">
                {t('features.volunteers.peopleCount', {
                  defaultValue: '{{count}} người',
                  count: volunteers.length,
                })}
              </span>
            </div>
            <div className={RULE} />
            <div className="flex w-full items-center gap-3 bg-[#F7F9F5] px-4 py-[10px]">
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.volunteers.name')}</span>
              <span className={cn(TH, 'min-w-0 flex-1')}>{t('features.volunteers.community')}</span>
              <span className={cn(TH, 'w-[150px] shrink-0')}>{t('features.volunteers.skills')}</span>
              <span className={cn(TH, 'w-[90px] shrink-0')}>{t('features.volunteers.points')}</span>
              <span className={cn(TH, 'w-[130px] shrink-0')}>{t('common.status')}</span>
              <span className={cn(TH, 'w-[80px] shrink-0 text-right')}>{t('common.actions')}</span>
            </div>

            {isPending ? (
              <p className="py-10 text-center font-mono text-xs text-[#8AA298]">{t('common.loading')}</p>
            ) : isError ? (
              <div className="py-8">
                <EmptyState text={t('common.error')} />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="text-[11px] font-semibold text-[#0A5C36] hover:underline"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              </div>
            ) : volunteers.length === 0 ? (
              <div className="py-6">
                <EmptyState text={t('features.volunteers.empty')} />
              </div>
            ) : (
              <ul className="flex w-full flex-col">
                {volunteers.map((volunteer) => (
                  <li key={volunteer.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`${prefix}/volunteers/${volunteer.id}`)}
                      className="flex w-full items-center gap-3 border-b border-[#F0F4EC] px-4 py-[11px] text-left transition-colors hover:bg-[#FAFCF8]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-[9px]">
                        <span
                          className={cn(
                            'grid size-7 shrink-0 place-items-center rounded-[9px] text-[9.5px] font-extrabold',
                            volunteer.locked
                              ? 'bg-[#F1F4EF] text-[#96AAA0]'
                              : 'bg-[#0A5C36] text-[#F2D07A]',
                          )}
                        >
                          {initialsOf(volunteer.name)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-px">
                          <span className="w-full truncate text-[11px] font-bold text-[#0B2E1F]">
                            {volunteer.name}
                          </span>
                          <span
                            className="w-full truncate font-mono text-[9px] text-[#9AAE9F]"
                            title={volunteer.email}
                          >
                            {volunteer.email}
                          </span>
                        </div>
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[10px] text-[#8AA298]">
                        {communityName(volunteer)}
                      </span>
                      <span
                        className={cn(
                          'w-[150px] shrink-0 truncate text-[10.5px]',
                          volunteer.skills.length ? 'text-[#2C463A]' : 'text-[#B9C8BE]',
                        )}
                      >
                        {volunteer.skills.length ? volunteer.skills.join(', ') : '—'}
                      </span>
                      <span className="w-[90px] shrink-0 text-right font-mono text-[10.5px] font-bold text-[#0B2E1F]">
                        {volunteer.points}
                      </span>
                      <span className="w-[130px] shrink-0">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-[3px] text-[9.5px] font-semibold',
                            volunteer.locked
                              ? 'border-[#EFCFC7] bg-[#FBEDEA] text-[#A33F37]'
                              : 'border-[#CBE3D2] bg-[#E9F4EC] text-[#1B6B45]',
                          )}
                        >
                          {volunteer.locked
                            ? t('features.volunteers.statusLocked', { defaultValue: 'Bị khoá' })
                            : t('features.volunteers.statusActive', { defaultValue: 'Đang hoạt động' })}
                        </span>
                      </span>
                      <span className="w-[80px] shrink-0 text-right text-[10px] font-bold text-[#0A5C36]">
                        {t('features.volunteers.detailLink', { defaultValue: 'Chi tiết →' })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {volunteers.length > 0 && (
              <div className="flex w-full items-center justify-between border-t border-[#ECF1E9] px-4 py-[11px]">
                <span className="text-[10.5px] text-[#96AAA0]">
                  {t('features.volunteers.range', {
                    defaultValue: '1–{{total}} / {{total}} tình nguyện viên',
                    total: volunteers.length,
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[14px] xl:w-[300px]">
            <section className={CARD}>
              <div className="flex w-full items-center justify-between px-[15px] py-[13px]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[1.1px] text-[#8C9F94]">
                  {t('features.volunteers.overviewHead', { defaultValue: 'Tổng quan tình nguyện viên' })}
                </span>
              </div>
              <div className={RULE} />
              <div className="flex w-full flex-col px-[15px] pb-[11px] pt-[5px]">
                {overview.map((row) => (
                  <div
                    key={row.key}
                    className="flex w-full items-center justify-between border-b border-[#F0F4EC] py-2 last:border-0"
                  >
                    <span className="text-[10.5px] text-[#6B8175]">{row.label}</span>
                    <span className={cn('font-mono text-[10.5px] font-bold', row.tone)}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative flex w-full flex-col gap-[7px] overflow-hidden rounded-[16px] bg-[#06281B] p-[15px]">
              <div className="absolute left-[170px] top-[-50px] size-[150px] rounded-full bg-[#0E7A4633] blur-[20px]" />
              <span className="relative z-[1] w-fit font-mono text-[8.5px] font-bold tracking-[1.1px] text-[#F2D07A]">
                {t('features.volunteers.permHead', { defaultValue: 'Phân quyền' })}
              </span>
              <p className="relative z-[2] w-full text-[10.5px] leading-[17px] text-[#CFE0D4]">
                {t('features.volunteers.permBody')}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
