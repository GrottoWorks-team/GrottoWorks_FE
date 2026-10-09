// Cấu hình sidebar theo role — label là i18n key (phẳng, dạng nav.<role>.<mục>).
// Route con khai báo ở đây được App.tsx sinh tự động thành lazy placeholder;
// Task 4+ thay dần bằng page thật (giữ nguyên `to`).
import type { Role } from '@/types'

export interface NavItem {
  label: string // i18n key
  to: string
  badge?: 'support' | 'purchases'
  icon?: string // key trong ICONS của AppShell
}

export interface NavGroup {
  section: string // i18n key, '' = không có tiêu đề nhóm
  items: NavItem[]
}

export const NAV: Record<Role, NavGroup[]> = {
  COMMUNITY: [
    {
      section: 'nav.section.overview',
      items: [
        { label: 'nav.community.dashboard', to: '/community', icon: 'dashboard' },
        { label: 'nav.community.seasons', to: '/community/seasons', icon: 'calendar' },
        { label: 'nav.community.areas', to: '/community/areas', icon: 'areas' },
      ],
    },
    {
      section: 'nav.section.coordination',
      items: [
        { label: 'nav.community.volunteers', to: '/community/volunteers', icon: 'users' },
        {
          label: 'nav.community.support',
          to: '/community/support',
          icon: 'lifebuoy',
          badge: 'support',
        },
      ],
    },
    {
      section: 'nav.section.wrapup',
      items: [
        { label: 'nav.community.checklist', to: '/community/checklist', icon: 'checklist' },
        { label: 'nav.community.reports', to: '/community/reports', icon: 'reports' },
      ],
    },
  ],
  LEADER: [
    {
      section: '',
      items: [
        { label: 'nav.leader.dashboard', to: '/leader', icon: 'dashboard' },
                { label: 'nav.leader.tasks', to: '/leader/tasks', icon: 'tasks' },
        { label: 'nav.leader.regs', to: '/leader/regs', icon: 'inbox', badge: 'support' },
        { label: 'nav.leader.support', to: '/leader/support', icon: 'lifebuoy' },
        { label: 'nav.leader.volunteers', to: '/leader/volunteers', icon: 'users' },
        { label: 'nav.leader.timesheets', to: '/leader/timesheets', icon: 'clock' },
        { label: 'nav.leader.checklist', to: '/leader/checklist', icon: 'checklist' },
      ],
    },
  ],
  MATERIAL_OFFICER: [
    {
      section: '',
      items: [
        { label: 'nav.material-officer.dashboard', to: '/material-officer', icon: 'dashboard' },
        { label: 'nav.material-officer.materials', to: '/material-officer/materials', icon: 'materials' },
        {
          label: 'nav.material-officer.purchases',
          to: '/material-officer/purchases',
          icon: 'cart',
          badge: 'purchases',
        },
        { label: 'nav.material-officer.purchases-confirm', to: '/material-officer/purchases-confirm', icon: 'confirm' },
        { label: 'nav.material-officer.donations', to: '/material-officer/donations', icon: 'gift' },
        { label: 'nav.material-officer.borrowed', to: '/material-officer/borrowed', icon: 'borrowed' },
        { label: 'nav.material-officer.allocations', to: '/material-officer/allocations', icon: 'boxes' },
      ],
    },
  ],
  PARISH: [
    {
      section: '',
      items: [
        { label: 'nav.parish.dashboard', to: '/parish', icon: 'dashboard' },
        { label: 'nav.parish.seasons', to: '/parish/seasons', icon: 'calendar' },
        { label: 'nav.parish.areas', to: '/parish/areas', icon: 'areas' },
        {
          label: 'nav.parish.purchases',
          to: '/parish/purchases',
          icon: 'cart',
          badge: 'purchases',
        },
        { label: 'nav.parish.accounts', to: '/parish/accounts', icon: 'accounts' },
        { label: 'nav.parish.communities', to: '/parish/communities', icon: 'church' },
        { label: 'nav.parish.categories', to: '/parish/categories', icon: 'tags' },
        { label: 'nav.parish.point-rules', to: '/parish/point-rules', icon: 'star' },
        { label: 'nav.parish.notifications', to: '/parish/notifications', icon: 'bell' },
        { label: 'nav.parish.activity', to: '/parish/activity', icon: 'history' },
        { label: 'nav.parish.backup', to: '/parish/backup', icon: 'backup' },
      ],
    },
  ],
}
