import type { Material } from '../../types';

// Quy ước: received = existing + purchased + donatedReceived.
// status: thiếu = 0 → ENOUGH; thiếu ≤ donatedPledged → INCOMING; còn lại → SHORTAGE.
// estUnitPrice: đơn giá dự kiến VNĐ (tính tổng đề nghị mua).
const m = (
  id: string, areaId: string, name: string, unit: string,
  required: number, existing: number, purchased: number,
  donatedPledged: number, donatedReceived: number, estUnitPrice: number, buyerId?: string,
): Material => {
  const received = existing + purchased + donatedReceived;
  const short = required - received;
  return {
    id, areaId, name, unit, required, existing, purchased, donatedPledged,
    donatedReceived, received, buyerId, estUnitPrice,
    status: short <= 0 ? 'ENOUGH' : short <= donatedPledged ? 'INCOMING' : 'SHORTAGE',
  };
};

export const materials: Material[] = [
  // a1 — Hang đá Bê-lem
  m('m1', 'a1', 'Xi măng PCB40', 'bao', 55, 10, 30, 10, 5, 92_000, 'u6'),
  m('m2', 'a1', 'Gạch đỏ', 'viên', 800, 200, 400, 100, 100, 1_500, 'u6'),
  m('m3', 'a1', 'Rơm bó', 'bó', 40, 15, 20, 5, 5, 35_000, 'u6'),
  m('m4', 'a1', 'Dây điện 2 lớp 2.5mm', 'm', 250, 80, 150, 20, 20, 18_000, 'u7'),
  m('m5', 'a1', 'Bạt che mưa', 'm2', 60, 0, 0, 0, 0, 55_000),
  // a2 — Cây thông lớn
  m('m6', 'a2', 'Cây thông tươi 4m', 'cây', 1, 0, 1, 0, 0, 2_500_000, 'u5'),
  m('m7', 'a2', 'Đèn LED vàng 5m', 'dây', 30, 5, 15, 8, 2, 85_000, 'u8'),
  m('m8', 'a2', 'Đinh 3 inch', 'kg', 20, 12, 8, 0, 0, 30_000, 'u5'),
  m('m9', 'a2', 'Đèn LED nháy nhiều màu', 'dây', 50, 10, 0, 5, 5, 70_000),
  m('m10', 'a2', 'Dây thép buộc', 'cuộn', 15, 4, 11, 0, 0, 40_000, 'u5'),
  // a3 — Ánh sáng & đèn
  m('m11', 'a3', 'Dây điện trục 3×2.5mm', 'm', 400, 100, 250, 0, 0, 32_000, 'u23'),
  m('m12', 'a3', 'Đèn LED vàng 5m', 'dây', 60, 20, 20, 20, 0, 85_000, 'u8'),
  m('m13', 'a3', 'Bóng đèn sợi đốt 220V', 'cái', 200, 50, 0, 30, 30, 15_000),
  m('m14', 'a3', 'Bóng LED chiếu sáng 100W', 'cái', 40, 10, 30, 0, 0, 120_000, 'u8'),
  m('m15', 'a3', 'Ống luồn điện PVC 20mm', 'cây', 120, 30, 60, 30, 0, 18_000, 'u23'),
  // a4 — Sân khấu
  m('m16', 'a4', 'Khung sắt hộp 40×40', 'cây', 90, 25, 40, 10, 10, 150_000, 'u27'),
  m('m17', 'a4', 'Sơn trắng ngoại thất', 'thùng', 12, 2, 10, 0, 0, 450_000, 'u20'),
  m('m18', 'a4', 'Ván gỗ ép 18mm', 'tấm', 40, 10, 20, 10, 0, 180_000, 'u10'),
  m('m19', 'a4', 'Keo nến', 'hộp', 25, 8, 12, 0, 0, 25_000, 'u10'),
  m('m20', 'a4', 'Vải nhung đỏ', 'm', 80, 20, 40, 20, 20, 65_000, 'u12'),
  // a5 — Sân nhà thờ
  m('m21', 'a5', 'Sơn trắng ngoại thất', 'thùng', 8, 3, 5, 0, 0, 450_000, 'u22'),
  m('m22', 'a5', 'Bạt che mưa', 'm2', 120, 30, 40, 0, 0, 55_000, 'u12'),
  m('m23', 'a5', 'Rơm bó', 'bó', 60, 20, 0, 25, 0, 35_000),
  m('m24', 'a5', 'Cột tre 4m', 'cây', 50, 25, 25, 0, 0, 90_000, 'u11'),
  m('m25', 'a5', 'Đèn lồng giấy đỏ', 'cái', 100, 0, 0, 50, 0, 70_000),
];
