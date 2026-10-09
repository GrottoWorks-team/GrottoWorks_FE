import type { Community, Parish, User } from '../../types';

export const parish: Parish = { id: 'p1', name: 'Tân Định' };

export const communities: Community[] = [
  { id: 'c1', name: 'Giáo khu Thánh Tâm', parishId: 'p1' },
  { id: 'c2', name: 'Giáo khu Mẹ Thiên Chúa', parishId: 'p1' },
  { id: 'c3', name: 'Giáo khu Thánh Giuse', parishId: 'p1' },
];

const S = {
  dien: ['Điện'], moc: ['Mộc'], han: ['Hàn'], tri: ['Trang trí'],
  van: ['Vận chuyển'], log: ['Logistics'], son: ['Sơn'],
};

// 30 người: u1–u4 là 4 tài khoản demo, u5–u30 là giáo dân.
export const users: User[] = [
  { id: 'u1', name: 'LM. Phaolô Nguyễn Văn Hạnh', email: 'admin@grottoworks.vn', role: 'PARISH', skills: [], points: 0, avatarHue: 20 },
  { id: 'u2', name: 'Giuse Trần Văn Bình', email: 'committee@grottoworks.vn', role: 'COMMUNITY', communityId: 'c1', skills: ['Logistics'], points: 40, avatarHue: 156 },
  { id: 'u3', name: 'Đaminh Hoàng Văn Tùng', email: 'leader@grottoworks.vn', role: 'LEADER', communityId: 'c1', skills: S.moc, points: 85, avatarHue: 33 },
  { id: 'u4', name: 'Anna Trần Thị Mai', email: 'officer@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.log, points: 65, avatarHue: 341 },
  { id: 'u5', name: 'Maria Vũ Thị Nga', email: 'u5@grottoworks.vn', role: 'LEADER', communityId: 'c1', skills: S.tri, points: 120, avatarHue: 12 },
  { id: 'u6', name: 'Giuse Lê Minh', email: 'u6@grottoworks.vn', role: 'LEADER', communityId: 'c1', skills: S.han, points: 90, avatarHue: 220 },
  { id: 'u7', name: 'Đaminh Hoàng', email: 'u7@grottoworks.vn', role: 'LEADER', communityId: 'c2', skills: S.dien, points: 110, avatarHue: 275 },
  { id: 'u8', name: 'Phêrô Quang', email: 'u8@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.dien, points: 55, avatarHue: 55 },
  { id: 'u9', name: 'Anna Trần Thị Lan', email: 'u9@grottoworks.vn', role: 'LEADER', communityId: 'c1', skills: S.tri, points: 75, avatarHue: 300 },
  { id: 'u10', name: 'Têresa Ngô Thanh Hằng', email: 'u10@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.log, points: 48, avatarHue: 190 },
  { id: 'u11', name: 'Antôn Nguyễn Đức Long', email: 'u11@grottoworks.vn', role: 'LEADER', communityId: 'c2', skills: ['Mộc', 'Sơn'], points: 130, avatarHue: 100 },
  { id: 'u12', name: 'Cêcilia Phạm Thu Hà', email: 'u12@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.tri, points: 70, avatarHue: 350 },
  { id: 'u13', name: 'Gioan Bùi Văn Hùng', email: 'u13@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.moc, points: 95, avatarHue: 30 },
  { id: 'u14', name: 'Marta Đỗ Thị Lan', email: 'u14@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.tri, points: 60, avatarHue: 200 },
  { id: 'u15', name: 'Phanxicô Lê Văn Tú', email: 'u15@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.van, points: 50, avatarHue: 45 },
  { id: 'u16', name: 'Agnês Trần Ngọc Anh', email: 'u16@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.tri, points: 80, avatarHue: 330 },
  { id: 'u17', name: 'Giuse Trịnh Quốc Bảo', email: 'u17@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.dien, points: 88, avatarHue: 260 },
  { id: 'u18', name: 'Maria Hoàng Thị Hoa', email: 'u18@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.tri, points: 42, avatarHue: 15 },
  { id: 'u19', name: 'Vinhsơn Phạm Văn Dũng', email: 'u19@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: ['Vận chuyển', 'Hàn'], points: 105, avatarHue: 210 },
  { id: 'u20', name: 'Lucia Chung Mỹ Dung', email: 'u20@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.son, points: 78, avatarHue: 320 },
  { id: 'u21', name: 'Tôma Đinh Tiến Cường', email: 'u21@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.van, points: 92, avatarHue: 85 },
  { id: 'u22', name: 'Anna Võ Kim Ngân', email: 'u22@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.son, points: 58, avatarHue: 340 },
  { id: 'u23', name: 'Phêrô Hồ Văn Thọ', email: 'u23@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.dien, points: 112, avatarHue: 285 },
  { id: 'u24', name: 'Đaminh Nguyễn Thị Oanh', email: 'u24@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.log, points: 36, avatarHue: 185 },
  { id: 'u25', name: 'Gioan Lý Tuấn Kiệt', email: 'u25@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.moc, points: 66, avatarHue: 95 },
  { id: 'u26', name: 'Têresa Dương Thùy Linh', email: 'u26@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.tri, points: 54, avatarHue: 310 },
  { id: 'u27', name: 'Antôn Trương Minh Nhật', email: 'u27@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.han, points: 100, avatarHue: 225 },
  { id: 'u28', name: 'Rosa Lương Thị Bích', email: 'u28@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c3', skills: S.tri, points: 44, avatarHue: 5 },
  { id: 'u29', name: 'Giuse Ngô Đức Thịnh', email: 'u29@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c1', skills: S.van, points: 72, avatarHue: 140 },
  { id: 'u30', name: 'Phaolô Vũ Thành Đạt', email: 'u30@grottoworks.vn', role: 'MATERIAL_OFFICER', communityId: 'c2', skills: S.log, locked: true, points: 20, avatarHue: 165 },
];
