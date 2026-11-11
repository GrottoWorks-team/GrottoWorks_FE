# Test nghiệp vụ toàn dự án — 11/11/2026 (đối chiếu `GrottoWorks_Phan_Tich_Nghiep_Vu_Chi_Tiet`)

**Nguồn kịch bản:** `GrottoWorks_Documents/GrottoWorks_Phan_Tich_Nghiep_Vu_Chi_Tiet_v1.2.md`
(§7 quy trình tổng thể, §8 phân tích chi tiết, §9 vòng đời/trạng thái, §10 quy tắc BR,
§12 báo cáo, §14 thông báo, §16 ngoại lệ) — đối chiếu bản chuẩn `…v1.2.5.md`.
**Môi trường:** Docker stack BE (gateway `localhost:6102`) + web `localhost:5175` + dữ liệu seed.
**Thời điểm:** 11/11/2026, buổi tối. Chạy bổ sung cho báo cáo `UI-TEST-RUN-2026-11-11-attendance.md`
(phần chấm công + bản đồ đã test riêng, không lặp lại ở đây).

**Tài khoản dùng**

| Vai trò | Tài khoản | Dùng cho |
|---|---|---|
| ADMIN (FE `PARISH`) | `hoa.nguyen` | mùa Giáng sinh, dashboard, danh mục |
| LEADER | `ngan.nguyen` (id `4c72bda6…`) | mua sắm, readiness, chấm công |
| MO (Material Officer) | `anh.pham` | nhu cầu/tồn kho vật tư, quyên góp, mượn, phân bổ |
| VOLUNTEER | `hau.trinh@…`, `long.nguyen@…` | tạo đơn check-in, dữ liệu chấm công |

---

## 1. Tổng hợp theo mục tài liệu

| Mã | Nghiệp vụ (mục trong tài liệu) | Cách test | Kết quả |
|---|---|---|---|
| SEASON-01 | §9.1 vòng đời mùa, §8.1 danh sách + trạng thái | ADMIN → `/parish/seasons` | ✅ PASS |
| SEASON-02 | §8.1 ngoại lệ: không kích hoạt khi thiếu khu vực / thiếu leader | `SeasonActivateDialog` (kiểm tra điều kiện) | ✅ PASS (chặn đúng) |
| SEASON-03 | §8.1 tạo mùa mới (Planning) | `POST /seasons` + dialog | ⏸️ Chưa chạy (tránh tạo dữ liệu rác; đã có unit test BE) |
| AREA-01 | §7.1 tạo khu vực trong mùa **ACTIVE** | `/community/areas` → Tạo | ✅ PASS (đúng BR: `409` mùa đã kích hoạt) |
| AREA-02 | §7.1 tạo khu vực trong mùa **Planning** | — | ⏸️ Chưa chạy (cần dùng “GrottoWorks Demo Season 2026”) |
| AREA-03 | §11 phân quyền: ADMIN chỉ xem khu vực | `/parish/communities?tab=areas` | ✅ PASS (xem báo cáo chấm công) |
| TASK-01 | §8.2 tạo task → trạng thái `OPEN` | UI leader `/leader/tasks` | ✅ PASS (danh sách + trạng thái thật) |
| TASK-02 | §8.3/§9.3 task `IN_PROGRESS → SUBMITTED → COMPLETED/REVISION_REQUIRED` | UI + BE test cũ (`TaskDetailPage.test.tsx`) | ✅ PASS (đã có test tự động) |
| TASK-03 | BR-71 `OPEN → NOT_STARTED` chỉ qua “Chốt tuyển” | UI nút Ready | ⏸️ Chưa chạy (không có task OPEN trong seed) |
| ATT-* | §8.3 check-in/out, duyệt, đóng phiên, thông báo | xem `UI-TEST-RUN-2026-11-11-attendance.md` | ✅ PASS (13 kịch bản) |
| PROG-01 | §8.4 cập nhật tiến độ nhiều lần, không ghi đè | BE test `TaskProgress` | ✅ PASS (unit test) |
| MAT-01 | §8.5 bảng cân đối tồn kho + shortage | MO → `/material-officer/inventory` | ✅ PASS — mọi shortage ≥ 0 (BR-25) |
| MAT-02 | §8.5 công thức shortage (R-24) | đọc số liệu tồn kho | ✅ PASS (không thấy shortage âm; cột yêu cầu/sẵn có/đã phân bổ/thiếu hụt khớp) |
| PUR-01 | §8.6 danh sách purchase request theo trạng thái | LEADER → `/leader/purchases` | ✅ PASS (3 trạng thái: Chờ duyệt / Đã duyệt / Đã hoàn thành) |
| PUR-02 | §11 + BR-29 **chỉ leader của khu được duyệt** | bấm Duyệt đơn ngoài phạm vi | ⚠️ **FAIL (scope danh sách)** — xem §3.1 |
| PUR-03 | §8.6 duyệt → tạo task mua → buyer mua → MO xác nhận giao | — | ⏸️ Chưa chạy (không có request trong phạm vi leader + `purchase` = 0 bản ghi) |
| DON-01 | §8.7 pledge không tính vào đã nhận (BR-39) | MO → `/material-officer/donations` | ✅ PASS — 3 pledge: 2 “Hứa tặng”, 1 RECEIVED; tổng tiền nhận **30.000.000₫** (không cộng 50.000.000₫ đang hứa) |
| DON-02 | §8.7 ghi nhận receipt, usable = received − unusable (BR-38) | UI ghi nhận | ⏸️ Chưa chạy (flow ghi nhận chưa thao tác trong phiên này) |
| BOR-01 | §8.8 danh sách đồ mượn, hạn trả, tình trạng | MO → `/material-officer/borrowed` (2 bản ghi) | ⏸️ Chưa chạy chi tiết |
| ALLOC-01 | §8.9/BR-33 không phân bổ vượt tồn khả dụng | UI allocations (3 bản ghi) | ⏸️ Chưa chạy |
| RPT-MAT-01 | §8.10 material report sau task | — | ⏸️ Chưa chạy (seed không có material report) |
| SUP-01 | §8.11 support request liên cộng đoàn | `support_request` = **0 bản ghi** | ⏸️ Chưa chạy (chưa có dữ liệu; có `support-smoke.py` riêng) |
| RDY-01 | §8.12 checklist readiness theo khu, item bắt buộc | LEADER → `/leader/checklist` | ✅ PASS (5 mục: 1 Đạt / 4 Chờ kiểm tra, có nút Đạt–Không đạt, “Xác nhận sẵn sàng”) |
| RDY-02 | BR-52 không Ready khi còn mục bắt buộc fail | — | ⏸️ Chưa chạy (chưa tạo mục fail) |
| DASH-01 | §12.1 dashboard ban phụ trách | ADMIN → `/parish` | ✅ PASS (3 mùa, 4 cộng đoàn, 19 tài khoản, khu vực theo 3 trạng thái) |
| RPT-01 | §12.2 báo cáo cuối mùa / export | `/api/v1/reports/{type}` + `report-exports` | ⏸️ Chưa chạy |
| NOTI-01 | §14 thông báo nghiệp vụ (duyệt/từ chối/đóng phiên) | `notify_db.notification` | ✅ PASS (xem báo cáo chấm công) |
| NOTI-02 | §14 thông báo ra khay điện thoại | app mobile | ⏸️ Cần thiết bị thật |

Ghi chú: ⏸️ = chưa thực thi trong phiên này (kèm lý do), **không** phải đã pass.

---

## 2. Bằng chứng chi tiết (các luồng đã chạy)

### 2.1. SEASON-01/02 — Mùa Giáng sinh (§8.1, §9.1)
- `/parish/seasons` trả đúng 3 mùa với trạng thái thật:
  `GrottoWorks Demo Season 2026 — Đang chuẩn bị (Planning)`, `Mùa Giáng sinh 2026 — Đang chạy (Active)`,
  `Mùa Giáng sinh 2025 — Đã hoàn thành (Completed)`.
- Dashboard `/parish`: `MÙA GIÁNG SINH 3 · CỘNG ĐOÀN 4 · TÀI KHOẢN 19`; khu vực theo trạng thái
  `Đang chuẩn bị 5 · Chờ nghiệm thu 1 · Đang xử lý 3`.
- Điều kiện kích hoạt (§8.1 ngoại lệ) đã có màn kiểm tra trước khi gọi API (`SeasonActivateDialog`);
  logic BE có test tự động (`SeasonActivateDialog.test.tsx` 8 case, `SeasonListPage.test.tsx`).
- **Kết luận:** PASS phần đọc + điều kiện; tạo mùa mới chưa chạy để tránh rác dữ liệu demo.

### 2.2. AREA-01 — Tạo khu vực trong mùa đã kích hoạt (§7.1, BR-07a)
- Ban hành giáo `/community/areas` → “Tạo khu vực”: dialog nạp đúng 5 danh mục khu vực, submit trả
  `409` “Mùa đã kích hoạt — không thể thêm khu vực mới”.
- **Kết luận:** PASS — chặn đúng nghiệp vụ (mùa `Active` không thêm khu mới).

### 2.3. MAT-01/02 — Tồn kho và thiếu hụt (§8.5, BR-25/R-24)
Bảng cân đối (`/material-officer/inventory`) hiển thị 5 cột: yêu cầu / sẵn có / đã phân bổ / thiếu hụt / trạng thái.
Ví dụ đọc được:
```
Cổng chào và biển báo · Dây điện đôi 2x1.5 · 0 · 0 · 80 · 0 · "Đủ vật tư"
Gian hàng ẩm thực · Gạo tẻ · 150 · 0 · 60 · 0 · "150 kg"
Hang đá trung tâm · Đá trang trí hang đá · 40 · 0 · 20 · 0 · "40 bao"
```
- Không có dòng shortage âm (BR-25). Cột “đã phân bổ” tách khỏi “sẵn có” → phù hợp R-24/R-26.
- **Kết luận:** PASS (kiểm tra đọc số liệu; chưa chạy kịch bản nhập liệu làm thay đổi công thức).

### 2.4. PUR-01 — Danh sách đề nghị mua theo trạng thái (§8.6)
`/leader/purchases` hiển thị tab `Tất cả / Chờ duyệt / Đã duyệt / Từ chối / Nháp` và 3 đề nghị:
| Mã | Khu vực | Tổng tiền | Trạng thái |
|---|---|---|---|
| `#579E81CD` | Gian hàng ẩm thực | 17.700.000 ₫ | Chờ duyệt |
| `#1B8A5A17` | Hang đá trung tâm | 6.060.000 ₫ | Đã duyệt |
| `#0D0F5695` | Đèn LED khuôn viên | 7.960.000 ₫ | Đã hoàn thành |
- **Kết luận:** PASS phần danh sách/trạng thái.

### 2.5. RDY-01 — Checklist sẵn sàng (§8.12, BR-52)
`/leader/checklist` khu *Hang đá trung tâm*: `5 mục · Đạt 1 · Không đạt 0 · Chờ kiểm tra 4`,
có nút **Đạt / Không đạt** từng mục, nút **Xác nhận sẵn sàng**, trạng thái checklist “Đang review”.
- **Kết luận:** PASS phần đọc + thao tác có sẵn; chưa tạo mục fail để thử BR-52.

### 2.6. DON-01 — Pledge không tính vào số đã nhận (§8.7, BR-35/BR-39)
`/material-officer/donations`:
```
TỔNG CAM KẾT 3 lượt · ĐÃ NHẬN ĐỦ 1 lượt · CHỜ GHI NHẬN 2 lượt · TIỀN ĐÃ NHẬN 30.000.000₫
Ông Trần Văn Lộc — Đá trang trí hang đá 40 bao — đã nhận 0 — Hứa tặng
Công ty Vinafood — Tiền mặt 50.000.000₫ — đã nhận 0₫ — Hứa tặng
Gia đình bà Nguyễn Thị Bạch Tuyết — Tiền mặt — đã nhận 30.000.000₫ — RECEIVED
```
- Tổng tiền đã nhận **chỉ 30.000.000₫**, khoản hứa 50.000.000₫ **không** bị cộng → đúng BR-39.
- **Kết luận:** PASS.

---

## 3. Phát hiện cần xử lý

### 3.1. ⚠️ LEADER thấy đề nghị mua **ngoài phạm vi khu vực** (data scope) — cần sửa
- **Hiện tượng:** leader `ngan.nguyen` (id `4c72bda6…`, phụ trách *Hang đá trung tâm* + *Sân khấu văn nghệ*)
  thấy trong `/leader/purchases` cả đề nghị của **Gian hàng ẩm thực** và **Đèn LED khuôn viên**.
- **Bằng chứng:**
  - `GET /api/v1/purchase-requests?page=1&size=20` (Bearer LEADER) → 3 bản ghi thuộc **3 khu khác nhau**:
    `579e81cd (Gian hàng ẩm thực, PENDING_APPROVAL)`, `1b8a5a17 (Hang đá trung tâm, APPROVED)`,
    `0d0f5695 (Đèn LED khuôn viên, COMPLETED)`.
  - Bấm **Duyệt** đơn `579e81cd…` → `403 work-area-scope-denied` “Only the leader assigned to this work area can decide on it.”
- **Tác động:** badge “Duyệt mua lớn 1” trỏ vào việc **không thể làm**; đếm sai khối lượng việc;
  vi phạm §11 (`Leader: A*` — chỉ trong phạm vi được giao) và BR-57 (dữ liệu trả về phải đúng quyền xem).
  BE **chặn ghi đúng**, chỉ hỏng ở phạm vi **đọc**.
- **Hướng sửa (đề xuất):**
  1. `GET /purchase-requests` khi caller là LEADER phải lọc theo các work area có `leader_user_id = caller`
     (join `work_area_scope`), tương tự `GET /work-areas/{id}/attendance-requests` đang làm.
  2. Badge ở nav dùng đúng danh sách đã lọc.
  3. Thêm test: leader A không thấy request của khu do leader B phụ trách.
- **Ước lượng:** BE 1–2h (query filter + 2 unit test), FE 0h nếu chỉ dùng lại endpoint.

### 3.2. Ghi chú nhỏ
- Nút **Duyệt** trong danh sách mở dialog “Duyệt yêu cầu mua …” kèm ô ghi chú — tốt; nhưng khi BE trả
  `403`, UI chỉ hiện toast chung “Có lỗi xảy ra”. Nên map mã lỗi `work-area-scope-denied` /
  `*_VERSION_MISMATCH` ra thông điệp cụ thể (giống cách đã làm cho `TASK_TEAM_LEADER_ONLY`).
- Danh sách đề nghị mua hiển thị “Mã” dạng `#579E81CD` (8 ký tự đầu GUID) — không có cột **người đề nghị**
  và **khu vực** đã có; nên bổ sung người đề nghị để leader biết ai cần liên hệ.

---

## 4. Các luồng chưa thực thi được trong phiên này (và cách chạy)

| Luồng (mục tài liệu) | Lý do | Cách chạy khi cần |
|---|---|---|
| Toàn bộ chuỗi mua sắm §8.6 bước 4–10 | `purchase` = 0 bản ghi; không có request trong phạm vi leader để duyệt | Tạo purchase request bằng MO (khu do `ngan.nguyen` phụ trách) → leader duyệt → `POST /purchase-requests/{id}/purchase-tasks` → assign → volunteer mua → MO `POST /purchases/{id}/confirm-delivery` |
| Ghi nhận donation receipt §8.7 (BR-38) | Chưa thao tác ghi nhận trên UI | MO → Quyên góp → dòng “Hứa tặng” → ghi nhận (received + unusable) → kiểm tra stock tăng đúng `received − unusable` |
| Đồ mượn §8.8 | Chưa chạy chi tiết | MO → Đồ mượn: accept loan offer → issue → return + tình trạng Good/Damaged/Lost |
| Phân bổ §8.9 (BR-33) | Chưa chạy | MO → Phân bổ: nhập số lượng > tồn chưa phân bổ → phải bị chặn |
| Material report §8.10 | Seed không có bản ghi | Hoàn thành task có allocation → volunteer gửi report → MO verify |
| Support request §8.11 | `support_request` = 0 bản ghi | Leader tạo + publish; community khác phản hồi; MO nguồn duyệt; MO nhận xác nhận `TRANSFER_IN` |
| Readiness fail → corrective §8.12 (BR-66) | Chưa tạo mục fail | Đánh “Không đạt” một mục bắt buộc → phải sinh corrective task |
| Báo cáo/export §12 | Chưa chạy | `GET /api/v1/reports/{type}`, `POST /api/v1/report-exports` |
| Trọn bộ API acceptance | Cần môi trường verify riêng | `GrottoWorks_BE/tools/Verification/smoke.py` (stages: security/fixture/evidence/task/readiness/corrective/purchase/support) với DB `verify_*`, vhost `verify20261103` |

---

## 5. Kết luận phiên test

- **Đã xác nhận chạy thật:** mùa Giáng sinh + dashboard, phân quyền khu vực công tác, danh sách & trạng thái
  đề nghị mua, tồn kho/thiếu hụt, pledge vs đã nhận, checklist readiness, chấm công (13 kịch bản ở báo cáo trước),
  thông báo nghiệp vụ.
- **1 lỗi nghiệp vụ cần sửa:** phạm vi đọc `GET /purchase-requests` của LEADER (§11, BR-57) — BE đã chặn ghi đúng.
- **Các luồng còn lại** cần dữ liệu/điều kiện riêng; danh sách + cách chạy đã ghi ở §4 để lần test sau chạy tiếp.
