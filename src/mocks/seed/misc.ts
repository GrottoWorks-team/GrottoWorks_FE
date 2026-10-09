import type { ActivityLog, Allocation, BorrowedItem, ChecklistItem, SupportReg, SupportRequest, VolunteerReg } from '../../types';

// Phân bổ vật tư đã nhận: tổng alloc mỗi vật tư ≤ received của vật tư đó.
export const allocations: Allocation[] = [
  { id: 'al1', materialId: 'm1', targetTaskId: 't1', qty: 20, date: '2026-10-02', byUserId: 'u4' },
  { id: 'al2', materialId: 'm2', targetTaskId: 't2', qty: 300, date: '2026-10-20', byUserId: 'u4' },
  { id: 'al3', materialId: 'm4', targetTaskId: 't5', qty: 100, date: '2026-10-15', byUserId: 'u4' },
  { id: 'al4', materialId: 'm16', targetTaskId: 't27', qty: 30, date: '2026-11-10', byUserId: 'u10' },
  { id: 'al5', materialId: 'm13', targetAreaId: 'a1', qty: 20, date: '2026-11-08', byUserId: 'u8' },
  { id: 'al6', materialId: 'm7', targetTaskId: 't12', qty: 10, date: '2026-11-05', byUserId: 'u6' },
];

export const borrowedItems: BorrowedItem[] = [
  { id: 'b1', name: 'Máy phát điện 5kVA', owner: 'Ông Vinhsơn Phạm Văn Dũng', expectedReturn: '2026-12-28', areaId: 'a3' },
  { id: 'b2', name: 'Thang nhôm 5m', owner: 'Anh Antôn Trương Minh Nhật', expectedReturn: '2026-12-26', areaId: 'a1' },
  { id: 'b3', name: 'Máy khoan bê tông', owner: 'Xưởng mộc Hồng Phúc', expectedReturn: '2026-11-05', returnedCondition: 'GOOD', areaId: 'a1' },
  { id: 'b4', name: 'Ghế nhựa 200 chiếc', owner: 'Trường Tiểu học Tân Định', expectedReturn: '2026-12-26', areaId: 'a5' },
  { id: 'b5', name: 'Bộ loa kéo + micro', owner: 'Nhóm thanh niên Giáo khu Thánh Tâm', expectedReturn: '2026-12-26', areaId: 'a4' },
  { id: 'b6', name: 'Xe tải nhỏ 1 tấn', owner: 'Chú Phêrô Hồ Văn Thọ', expectedReturn: '2026-11-10', returnedCondition: 'GOOD', areaId: 'a2' },
  { id: 'b7', name: 'Máy hàn điện', owner: 'Xưởng sắt Hòa Bình', expectedReturn: '2026-12-27', areaId: 'a4' },
  { id: 'b8', name: 'Máy cắt cỏ', owner: 'Ông Gioan Bùi Văn Hùng', expectedReturn: '2026-10-20', returnedCondition: 'DAMAGED', areaId: 'a5' },
  { id: 'b9', name: 'Bộ giàn giáo', owner: 'Công ty Xây dựng An Phong', expectedReturn: '2026-12-27', areaId: 'a1' },
  { id: 'b10', name: 'Thang dây 8m', owner: 'Anh Tôma Đinh Tiến Cường', expectedReturn: '2026-12-26', areaId: 'a2' },
  { id: 'b11', name: 'Đèn follow', owner: 'Nhóm giúp việc Đền Thánh', expectedReturn: '2026-12-28', areaId: 'a4' },
  { id: 'b12', name: 'Máy phun sơn', owner: 'Bạn trẻ Giáo khu Mẹ Thiên Chúa', expectedReturn: '2026-10-15', returnedCondition: 'GOOD', areaId: 'a5' },
];

// Yêu cầu hỗ trợ nhân lực giữa các cộng đoàn. `communityId` = cộng đoàn của khu
// cần hỗ trợ; TNV thuộc cộng đoàn KHÁC thấy để đăng ký. `fulfill` theo số người
// đã xác nhận + `volunteersNeeded`. kind MATERIAL không huy động TNV.
export const supportRequests: SupportRequest[] = [
  {
    id: 'sr1', areaId: 'a1', kind: 'PEOPLE',
    detail: 'Cần thêm 3 anh em phụ hồ tuần này.', status: 'OPEN',
    volunteersNeeded: 3, supportTime: 'T7 17/11, 8h–12h', taskAreaId: 'a1',
    fulfill: 'OPEN',
  },
  {
    id: 'sr2', areaId: 'a2', communityId: 'c1', kind: 'MATERIAL',
    detail: 'Thiếu 35 dây đèn LED nháy nhiều màu.', status: 'OPEN',
    volunteersNeeded: 0, fulfill: 'FULFILLED',
  },
  {
    id: 'sr3', areaId: 'a3', communityId: 'c2', kind: 'SKILL',
    detail: 'Cần thợ điện có chứng chỉ an toàn điện.', status: 'COORDINATED',
    volunteersNeeded: 1, skills: ['Điện'], supportTime: 'Tối trong tuần, 19h–21h',
    taskAreaId: 'a3', fulfill: 'FULFILLED',
  },
  {
    id: 'sr4', areaId: 'a4', communityId: 'c2', kind: 'PEOPLE',
    detail: 'Cần 5 bạn trẻ phụ dựng sân khấu ngày 18/11.', status: 'COORDINATED',
    volunteersNeeded: 5, supportTime: 'CN 18/11, cả ngày', taskAreaId: 'a4',
    fulfill: 'PARTIAL',
  },
  {
    id: 'sr5', areaId: 'a5', communityId: 'c1', kind: 'MATERIAL',
    detail: 'Cần thêm 40m2 bạt che mưa lối đi chính.', status: 'RESOLVED',
    volunteersNeeded: 0, fulfill: 'FULFILLED',
  },
  {
    id: 'sr6', areaId: 'a1', communityId: 'c3', kind: 'SKILL',
    detail: 'Cần người biết sơn nước trang trí núi đá.', status: 'OPEN',
    volunteersNeeded: 2, skills: ['Sơn'], supportTime: 'Cuối tuần',
    taskAreaId: 'a1', fulfill: 'OPEN',
  },
];

// Đơn TNV đăng ký hỗ trợ. u13 (c3) đăng ký sr4 (khu a4 thuộc c2) → khác cộng đoàn.
// u25/u27 đăng ký sr6 (a1, c3) — 1 chờ duyệt, 1 đã duyệt; u21 bị từ chối ở sr3.
// a1 (Hang đá Bê-lem) do tài khoản demo LEADER u3 lãnh → các đơn PENDING vào
// sr1/sr6 (khu a1) hiện trong card "Đơn đăng ký hỗ trợ chờ duyệt" của leader.
export const supportRegs: SupportReg[] = [
  { id: 'srg1', requestId: 'sr3', volunteerId: 'u21', status: 'APPROVED', at: '2026-11-04T09:00:00' },
  { id: 'srg2', requestId: 'sr4', volunteerId: 'u13', status: 'APPROVED', note: 'Em rảnh cả ngày CN, có sức khoẻ.', at: '2026-11-06T18:30:00' },
  { id: 'srg3', requestId: 'sr4', volunteerId: 'u17', status: 'APPROVED', at: '2026-11-07T10:15:00' },
  { id: 'srg4', requestId: 'sr4', volunteerId: 'u19', status: 'PENDING', note: 'Đến muộn 1 tiếng có được không ạ?', at: '2026-11-08T20:00:00' },
  { id: 'srg5', requestId: 'sr6', volunteerId: 'u25', status: 'PENDING', note: 'Em biết sơn nước, đã làm giáo khu mấy lần.', at: '2026-11-15T14:00:00' },
  { id: 'srg6', requestId: 'sr6', volunteerId: 'u27', status: 'PENDING', at: '2026-11-16T08:30:00' },
  { id: 'srg7', requestId: 'sr3', volunteerId: 'u20', status: 'REJECTED', rejectReason: 'Đã đủ người, cảm ơn em.', at: '2026-11-05T11:00:00' },
  // Khu a1 (u3 lãnh) — đơn liên cộng đoàn về sr1 (PEOPLE) & sr6 (SKILL) chờ duyệt.
  { id: 'srg8', requestId: 'sr1', volunteerId: 'u26', status: 'PENDING', note: 'Em rảnh sáng T6–T7, có thể phụ hồ.', at: '2026-11-12T09:00:00' },
  { id: 'srg9', requestId: 'sr1', volunteerId: 'u18', status: 'PENDING', note: 'Cho em đăng ký 1 buổi sáng thứ Bảy ạ.', at: '2026-11-13T15:30:00' },
  { id: 'srg10', requestId: 'sr1', volunteerId: 'u14', status: 'PENDING', at: '2026-11-14T08:45:00' },
  { id: 'srg11', requestId: 'sr6', volunteerId: 'u22', status: 'PENDING', note: 'Em biết sơn nước, từng làm sân khấu giáo khu.', at: '2026-11-16T10:00:00' },
];

export const checklistItems: ChecklistItem[] = [
  // a1 — Hang đá Bê-lem
  { id: 'cl1', areaId: 'a1', label: 'Nền hang đầm chắc, không bị lún', done: true },
  { id: 'cl2', areaId: 'a1', label: 'Dây điện trong hang đã đi âm', done: false },
  { id: 'cl3', areaId: 'a1', label: 'Mái rơm không thấm mưa', done: false },
  { id: 'cl4', areaId: 'a1', label: 'Ngôi sao Bê-lem sáng đúng giờ', done: false },
  { id: 'cl5', areaId: 'a1', label: 'Đã kiểm tra an toàn điện tổng thể', done: true, note: 'Còn chờ đo cách điện lần cuối.' },
  // a2 — Cây thông lớn
  { id: 'cl6', areaId: 'a2', label: 'Cây thông đứng thẳng, chằng 3 hướng', done: true },
  { id: 'cl7', areaId: 'a2', label: 'Giá đỡ ngọn hàn xong', done: false },
  { id: 'cl8', areaId: 'a2', label: 'Đèn LED vàng quấn đủ 2/3 cây', done: true },
  { id: 'cl9', areaId: 'a2', label: 'Đèn nháy thử không lỗi đoạn nào', done: false },
  { id: 'cl10', areaId: 'a2', label: 'Phụ kiện treo đủ theo danh sách', done: false },
  // a3 — Ánh sáng & đèn
  { id: 'cl11', areaId: 'a3', label: 'Dây trục chính đấu vào tủ điện', done: true },
  { id: 'cl12', areaId: 'a3', label: 'Ống PVC luồn dây ven tường rào', done: true },
  { id: 'cl13', areaId: 'a3', label: 'LED hàng rào sáng đều 2 phía', done: false },
  { id: 'cl14', areaId: 'a3', label: 'Bóng lối đi không chỗ nào chập chờn', done: false },
  { id: 'cl15', areaId: 'a3', label: 'Chỗ nối ngoài trời được bọc kín', done: true },
  // a4 — Sân khấu
  { id: 'cl16', areaId: 'a4', label: 'Khung sàn hàn đủ, không cong vênh', done: false },
  { id: 'cl17', areaId: 'a4', label: 'Ván sàn ghép kín, không hở gót', done: false },
  { id: 'cl18', areaId: 'a4', label: 'Khung sắt sơn trắng xong', done: false },
  { id: 'cl19', areaId: 'a4', label: 'Rèm nhung treo phẳng, không nhăn', done: true },
  { id: 'cl20', areaId: 'a4', label: 'Âm thanh thử không hú, không rè', done: true },
  // a5 — Sân nhà thờ
  { id: 'cl21', areaId: 'a5', label: 'Tường rào sơn trắng hết một lượt', done: true },
  { id: 'cl22', areaId: 'a5', label: 'Cỏ vườn hang đã trồng xong', done: true },
  { id: 'cl23', areaId: 'a5', label: 'Bạt lối đi chính căng không đọng nước', done: false },
  { id: 'cl24', areaId: 'a5', label: 'Hàng rào cột tre cắm thẳng hàng', done: true },
  { id: 'cl25', areaId: 'a5', label: 'Đèn lồng cổng treo đúng sơ đồ', done: false },
];

export const volunteerRegs: VolunteerReg[] = [
  { id: 'vr1', taskId: 't3', volunteerId: 'u26', status: 'PENDING' },
  { id: 'vr2', taskId: 't3', volunteerId: 'u28', status: 'APPROVED' },
  { id: 'vr3', taskId: 't12', volunteerId: 'u26', status: 'APPROVED' },
  { id: 'vr4', taskId: 't13', volunteerId: 'u18', status: 'PENDING' },
  { id: 'vr5', taskId: 't21', volunteerId: 'u17', status: 'APPROVED' },
  { id: 'vr6', taskId: 't26', volunteerId: 'u25', status: 'PENDING' },
  { id: 'vr7', taskId: 't27', volunteerId: 'u20', status: 'APPROVED' },
  { id: 'vr8', taskId: 't37', volunteerId: 'u28', status: 'REJECTED' },
];

export const activityLogs: ActivityLog[] = [
  { id: 'log1', at: '2026-09-15T07:30:00', actor: 'u1', action: 'mở mùa', target: 'Mùa Giáng sinh 2026' },
  { id: 'log2', at: '2026-09-15T08:00:00', actor: 'u2', action: 'phân công trưởng khu', target: 'a1' },
  { id: 'log3', at: '2026-09-15T08:05:00', actor: 'u2', action: 'phân công trưởng khu', target: 'a2' },
  { id: 'log4', at: '2026-09-15T08:10:00', actor: 'u2', action: 'phân công trưởng khu', target: 'a3' },
  { id: 'log5', at: '2026-09-16T09:00:00', actor: 'u3', action: 'tạo nhiệm vụ', target: 't1' },
  { id: 'log6', at: '2026-09-16T09:15:00', actor: 'u3', action: 'tạo nhiệm vụ', target: 't2' },
  { id: 'log7', at: '2026-09-17T10:00:00', actor: 'u7', action: 'tạo nhiệm vụ', target: 't17' },
  { id: 'log8', at: '2026-09-20T15:00:00', actor: 'u2', action: 'duyệt mua', target: 'pr1' },
  { id: 'log9', at: '2026-09-28T17:00:00', actor: 'u13', action: 'hoàn thành', target: 't1' },
  { id: 'log10', at: '2026-10-02T09:00:00', actor: 'u6', action: 'nhận vật tư', target: 'm1 (30 bao xi măng)' },
  { id: 'log11', at: '2026-10-05T16:00:00', actor: 'u7', action: 'hoàn thành', target: 't17' },
  { id: 'log12', at: '2026-10-10T11:00:00', actor: 'u6', action: 'nhận vật tư', target: 'm3 (20 bó rơm)' },
  { id: 'log13', at: '2026-10-15T14:00:00', actor: 'u7', action: 'nhận vật tư', target: 'm4 (150m dây điện)' },
  { id: 'log14', at: '2026-10-15T16:00:00', actor: 'u2', action: 'duyệt mua', target: 'pr3' },
  { id: 'log15', at: '2026-10-20T10:00:00', actor: 'u13', action: 'gửi ảnh hiện trường', target: 't4' },
  { id: 'log16', at: '2026-10-20T15:00:00', actor: 'u6', action: 'nhận vật tư', target: 'm2 (400 viên gạch đỏ)' },
  { id: 'log17', at: '2026-10-22T08:00:00', actor: 'u2', action: 'duyệt mua', target: 'pr4' },
  { id: 'log18', at: '2026-10-25T18:00:00', actor: 'u17', action: 'hoàn thành', target: 't30' },
  { id: 'log19', at: '2026-10-28T17:30:00', actor: 'u18', action: 'hoàn thành', target: 't34' },
  { id: 'log20', at: '2026-11-02T09:00:00', actor: 'u4', action: 'gửi yêu cầu hỗ trợ', target: 'sr1' },
  { id: 'log21', at: '2026-11-03T10:00:00', actor: 'u5', action: 'gửi yêu cầu hỗ trợ', target: 'sr2' },
  { id: 'log22', at: '2026-11-04T14:00:00', actor: 'u13', action: 'điểm danh', target: 'ts1' },
  { id: 'log23', at: '2026-11-05T12:00:00', actor: 'u19', action: 'hoàn thành', target: 't9' },
  { id: 'log24', at: '2026-11-06T09:00:00', actor: 'u8', action: 'từ chối đề nghị mua', target: 'pr10' },
  { id: 'log25', at: '2026-11-07T08:30:00', actor: 'u13', action: 'báo thiếu vật tư', target: 'm2 (thiếu 100 viên)' },
  { id: 'log26', at: '2026-11-08T16:00:00', actor: 'u19', action: 'hoàn thành', target: 't10' },
  { id: 'log27', at: '2026-11-09T10:00:00', actor: 'u18', action: 'gửi ảnh hiện trường', target: 't39' },
  { id: 'log28', at: '2026-11-10T09:00:00', actor: 'u26', action: 'đăng ký tình nguyện', target: 't3' },
  { id: 'log29', at: '2026-11-11T15:00:00', actor: 'u3', action: 'yêu cầu làm lại', target: 't6' },
  { id: 'log30', at: '2026-11-12T11:00:00', actor: 'u20', action: 'yêu cầu sửa chấm công', target: 'ts22' },
  { id: 'log31', at: '2026-11-13T08:00:00', actor: 'u4', action: 'tạo đề nghị mua', target: 'pr8' },
  { id: 'log32', at: '2026-11-14T17:00:00', actor: 'u29', action: 'gửi ảnh hiện trường', target: 't35' },
  { id: 'log33', at: '2026-11-15T10:00:00', actor: 'u12', action: 'gửi yêu cầu hỗ trợ', target: 'sr6' },
  { id: 'log34', at: '2026-11-16T09:00:00', actor: 'u27', action: 'điểm danh', target: 'ts29' },
  { id: 'log35', at: '2026-11-17T14:00:00', actor: 'u9', action: 'gửi yêu cầu hỗ trợ', target: 'sr4' },
  { id: 'log36', at: '2026-11-18T16:30:00', actor: 'u23', action: 'gửi ảnh hiện trường', target: 't19' },
  { id: 'log37', at: '2026-11-19T10:00:00', actor: 'u22', action: 'yêu cầu sửa chấm công', target: 'ts31' },
  { id: 'log38', at: '2026-11-20T08:00:00', actor: 'u5', action: 'duyệt tình nguyện viên', target: 'vr3' },
  { id: 'log39', at: '2026-11-21T15:00:00', actor: 'u7', action: 'yêu cầu làm lại', target: 't23' },
  { id: 'log40', at: '2026-11-23T09:00:00', actor: 'u2', action: 'xác nhận hóa đơn', target: 'pc4' },
];
