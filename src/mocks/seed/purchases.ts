import type { PurchaseRecord, PurchaseRequest } from '../../types';

// 10 đề nghị mua: 4 APPROVED (kèm purchaseRecords), 3 PENDING, 2 DRAFT, 1 REJECTED.
export const purchaseRequests: PurchaseRequest[] = [
  { id: 'pr1', materialIds: ['m1'], total: 2_760_000, status: 'APPROVED', createdBy: 'u2', note: 'Xi măng cho nền hang đá' },
  { id: 'pr2', materialIds: ['m3'], total: 700_000, status: 'APPROVED', createdBy: 'u2' },
  { id: 'pr3', materialIds: ['m4'], total: 2_700_000, status: 'APPROVED', createdBy: 'u3', note: 'Dây điện trong hang đá' },
  { id: 'pr4', materialIds: ['m2'], total: 600_000, status: 'APPROVED', createdBy: 'u6' },
  { id: 'pr5', materialIds: ['m13', 'm14'], total: 4_500_000, status: 'PENDING', createdBy: 'u4', note: 'Bóng đèn còn thiếu 120 cái' },
  { id: 'pr6', materialIds: ['m16'], total: 2_250_000, status: 'PENDING', createdBy: 'u6', note: 'Khung sắt thiếu 15 cây' },
  { id: 'pr7', materialIds: ['m25'], total: 3_500_000, status: 'PENDING', createdBy: 'u12' },
  { id: 'pr8', materialIds: ['m22'], total: 3_200_000, status: 'DRAFT', createdBy: 'u4' },
  { id: 'pr9', materialIds: ['m19'], total: 250_000, status: 'DRAFT', createdBy: 'u10' },
  { id: 'pr10', materialIds: ['m9'], total: 2_100_000, status: 'REJECTED', createdBy: 'u8', rejectReason: 'Vượt ngân sách, đề nghị dùng lại đèn năm ngoái' },
];

export const purchaseRecords: PurchaseRecord[] = [
  { id: 'pc1', requestId: 'pr1', materialId: 'm1', qty: 30, cost: 2_760_000, supplier: 'VLXD Sài Gòn', date: '2026-10-02', receiptPhoto: 'pc1-bill.jpg', confirmed: true, buyerId: 'u6' },
  { id: 'pc2', requestId: 'pr2', materialId: 'm3', qty: 20, cost: 700_000, supplier: 'Nông sản Bến Lức', date: '2026-10-10', confirmed: true, buyerId: 'u6' },
  { id: 'pc3', requestId: 'pr3', materialId: 'm4', qty: 150, cost: 2_700_000, supplier: 'Điện Lực TP.HCM', date: '2026-10-15', confirmed: true, buyerId: 'u7' },
  { id: 'pc4', requestId: 'pr4', materialId: 'm2', qty: 400, cost: 600_000, supplier: 'Lò gạch Tân Sơn', date: '2026-10-20', confirmed: false, buyerId: 'u6' },
];
