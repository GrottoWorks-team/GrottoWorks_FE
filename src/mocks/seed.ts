// Seed dữ liệu mẫu giáo xứ Tân Định — hoàn toàn deterministic, không random.
import { communities, parish, users } from './seed/users';
import { areas, seasons } from './seed/areas';
import { materials } from './seed/materials';
import { tasks } from './seed/tasks';
import { donations } from './seed/donations';
import { purchaseRecords, purchaseRequests } from './seed/purchases';
import { timesheets } from './seed/timesheets';
import { activityLogs, allocations, borrowedItems, checklistItems, supportRegs, supportRequests, volunteerRegs } from './seed/misc';
import { SKILLS } from '../types';
import type { Design, DesignComment, DesignVersion, ParishMap, Registration } from '../types';

export const seed = {
  parish,
  communities,
  users,
  seasons,
  areas,
  tasks,
  volunteerRegs,
  materials,
  purchaseRequests,
  purchaseRecords,
  donations,
  borrowedItems,
  allocations,
  timesheets,
  supportRequests,
  supportRegs,
  checklists: checklistItems,
  activityLogs,
  // Đăng ký đồng hành công khai từ landing — khởi tạo rỗng, chỉ ghi khi có
  // người gửi form /register (POST /api/registrations).
  registrations: [] as Registration[],
  // Design Review (2D/3D) — rỗng, người dùng tạo qua UI.
  designs: [] as Design[],
  designVersions: [] as DesignVersion[],
  designComments: [] as DesignComment[],
  // Bản đồ mặt bằng giáo xứ — rỗng, ban hành giáo tải lên qua UI.
  parishMaps: [] as ParishMap[],
  skills: [...SKILLS],
};

export type Seed = typeof seed;
