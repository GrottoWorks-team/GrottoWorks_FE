import type { Donation } from '../../types';

// Tổng pledged/received từng vật tư khớp với Material.donatedPledged/donatedReceived
// (đonation CANCELED/UNUSABLE không tính vào số liệu vật tư).
export const donations: Donation[] = [
  { id: 'd1', materialId: 'm2', donorName: 'Bà Anna Võ Kim Ngân', status: 'RECEIVED_FULL', promisedQty: 100, receivedQty: 100 },
  { id: 'd2', materialId: 'm1', donorName: 'Hội đồng giáo xứ Tân Định', status: 'RECEIVED_PARTIAL', promisedQty: 10, receivedQty: 5 },
  { id: 'd3', materialId: 'm3', donorName: 'Ông Phanxicô Lê Văn Tú', status: 'RECEIVED_FULL', promisedQty: 5, receivedQty: 5 },
  { id: 'd4', materialId: 'm4', donorName: 'Công ty Điện Minh Phúc', status: 'RECEIVED_FULL', promisedQty: 20, receivedQty: 20 },
  { id: 'd5', monetary: 5_000_000, donorName: 'Gia đình ông Tôma Đinh Tiến Cường', status: 'PLEDGED' },
  { id: 'd6', materialId: 'm7', donorName: 'Chị Marta Đỗ Thị Lan', status: 'RECEIVED_PARTIAL', promisedQty: 8, receivedQty: 2 },
  { id: 'd7', materialId: 'm9', donorName: 'Nhóm bạn trẻ Giáo khu Mẹ Thiên Chúa', status: 'RECEIVED_FULL', promisedQty: 5, receivedQty: 5 },
  { id: 'd8', materialId: 'm12', donorName: 'Ông Antôn Nguyễn Đức Long', status: 'PLEDGED', promisedQty: 20 },
  { id: 'd9', materialId: 'm13', donorName: 'Cửa hàng Điện Thái Dương', status: 'RECEIVED_FULL', promisedQty: 30, receivedQty: 30 },
  { id: 'd10', materialId: 'm15', donorName: 'Anh Vinhsơn Phạm Văn Dũng', status: 'PLEDGED', promisedQty: 30 },
  { id: 'd11', materialId: 'm16', donorName: 'Xưởng sắt Hòa Bình', status: 'RECEIVED_FULL', promisedQty: 10, receivedQty: 10 },
  { id: 'd12', materialId: 'm18', donorName: 'Anh Gioan Lý Tuấn Kiệt', status: 'PLEDGED', promisedQty: 10 },
  { id: 'd13', materialId: 'm20', donorName: 'Bà Rosa Lương Thị Bích', status: 'RECEIVED_FULL', promisedQty: 20, receivedQty: 20 },
  { id: 'd14', materialId: 'm21', donorName: 'Ông Trương Văn Lâm', status: 'CANCELED', promisedQty: 4 },
  { id: 'd15', materialId: 'm23', donorName: 'Nông trại Đồng Xanh', status: 'UNUSABLE', promisedQty: 25, receivedQty: 25 },
];
