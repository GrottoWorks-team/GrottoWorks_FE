import type { Season, WorkArea } from '../../types';

// Mảng mùa: một mùa đã chốt (2025) + mùa đang chạy (2026).
export const seasons: Season[] = [
  {
    id: 's0', year: 2025, startDate: '2025-09-15', endDate: '2025-12-24',
    status: 'CLOSED', budget: 95_000_000,
    description: 'Chuẩn bị Giáng sinh năm 2025 — chủ đề Bình An Cho Người Thiện Tâm',
    communityIds: ['c1', 'c2', 'c3'],
  },
  {
    id: 's1', year: 2026, startDate: '2026-09-15', endDate: '2026-12-24',
    status: 'ACTIVE', budget: 120_000_000,
    description: 'Chuẩn bị Giáng sinh năm 2026 — Hang đá Bê-lem & Cây thông lớn giáo xứ',
    communityIds: ['c1', 'c2', 'c3'],
  },
];

export const areas: WorkArea[] = [
  { id: 'a1', name: 'Hang đá Bê-lem', type: 'GROTTO', level: 'PARISH', leaderId: 'u3', officerId: 'u4', progress: 35, volunteerCount: 12, taskCount: 8, status: 'AT_RISK', seasonId: 's1', deadline: '2026-12-20', description: 'Khu vực hang đá chính tại tiền sảnh nhà thờ' },
  { id: 'a2', name: 'Cây thông lớn', type: 'TREE', level: 'PARISH', leaderId: 'u5', officerId: 'u6', progress: 45, volunteerCount: 10, taskCount: 8, status: 'ON_TRACK', seasonId: 's1', deadline: '2026-12-18', description: 'Cây thông cao 12m phía trước tháp chuông' },
  { id: 'a3', name: 'Ánh sáng & đèn', type: 'LIGHTING', level: 'PARISH', leaderId: 'u7', officerId: 'u8', progress: 60, volunteerCount: 8, taskCount: 8, status: 'ON_TRACK', seasonId: 's1', deadline: '2026-12-22', description: 'Hệ thống chiếu sáng toàn bộ khuôn viên giáo xứ' },
  { id: 'a4', name: 'Sân khấu', type: 'STAGE', level: 'COMMUNITY', communityId: 'c1', leaderId: 'u9', officerId: 'u10', progress: 25, volunteerCount: 6, taskCount: 8, status: 'LATE', seasonId: 's1', deadline: '2026-12-23', description: 'Sân khấu đêm diễn nguyện và canh thức Giáng sinh' },
  { id: 'a5', name: 'Sân nhà thờ', type: 'YARD', level: 'COMMUNITY', communityId: 'c2', leaderId: 'u11', officerId: 'u12', progress: 85, volunteerCount: 9, taskCount: 8, status: 'ON_TRACK', seasonId: 's1', deadline: '2026-12-15', description: 'Dọn dẹp, dựng rạp và trang trí sân đón giáo dân' },
];
