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
  skills: [...SKILLS],
};

export type Seed = typeof seed;
