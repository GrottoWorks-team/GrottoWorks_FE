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

---

# ĐỢT 2 — chạy tiếp các luồng còn lại (11/11/2026, tối)

## 6. Kết quả đợt 2

| Mã | Nghiệp vụ (tài liệu) | Kết quả | Bằng chứng |
|---|---|---|---|
| RDY-03 | §8.12/BR-66 mục bắt buộc `Failed` phải gắn corrective task | ❌ **FAIL** (kẹt luồng) | Bấm “Không đạt” mục **Tiểu cảnh hoàn thiện** (mandatory) → item `status = FAILED`, `correctiveTaskId = null`; mở dialog “Việc khắc phục” chỉ liệt kê 2 task **loại WORK** của khu; Lưu → `422 corrective-task-invalid` “Link an open CORRECTIVE task of this work area.” |
| RDY-04 | §8.12/BR-52 + BR-73 chỉ xác nhận sẵn sàng khi đủ điều kiện | ✅ PASS | Bấm “Xác nhận sẵn sàng” khi còn mục fail/task chưa xong → `409 work-area-not-in-readiness-review` (“every non-cancelled task COMPLETED”) |
| DON-02 | §8.7/BR-38 chỉ `received − unusable` vào stock, đúng work area nhận | ✅ PASS | Ghi nhận 15 bao, hỏng 3 → donation `fdfdca80…` = `PARTIALLY_RECEIVED`, item `received 15 / unusable 3`; kho **Hang đá thiếu nhi** (đúng `work_area_id` của donation) tăng **12** bao; toast “Đã ghi nhận quyên góp”, HTTP `201` |
| ALLOC-01 | §8.9/BR-33 không phân bổ vượt tồn khả dụng | ⏸️ Chưa chạy được | Form `/material-officer/allocations`: chọn khu vực trước, danh sách vật tư của khu mặc định **rỗng** ⇒ nút “Phân bổ” luôn `disabled`, không thể nhập số lượng để thử vượt tồn |
| API-SCOPE-02 | §11 quyền đọc báo cáo của MO | ⚠️ Quan sát | MO `anh.pham`: `GET /dashboards/season` **403**, `GET /seasons/{id}/recognition` **403**, `GET /seasons/{id}/support-summary` **403**; `GET /work-areas/{id}/shortages` **200** |

## 7. Phát hiện mới (đợt 2)

### 7.1. ❌ BR-66 bị kẹt: dialog “Việc khắc phục” chỉ cho chọn task `WORK`
- **Mô tả:** mục readiness bắt buộc fail cần **task loại CORRECTIVE**. BE kiểm tra đúng
  (`422 corrective-task-invalid`), nhưng FE lại đổ **toàn bộ task của khu** vào dropdown —
  seed hiện có `Dựng khung hang đá trung tâm` và `Hoàn thiện tiểu cảnh hang đá`, cả hai `task_type = WORK`.
  Không có đường nào trong dialog để tạo task CORRECTIVE ⇒ leader **không thể** hoàn tất bước này.
- **Hướng sửa (chọn 1):**
  1. FE lọc dropdown theo `type === 'CORRECTIVE'` **và** trạng thái mở; nếu danh sách rỗng thì hiện CTA
     “Tạo việc khắc phục” (gọi `POST /work-areas/{id}/tasks` với `type = CORRECTIVE`) rồi tự gắn.
  2. BE cho phép chuyển một task `WORK` thành `CORRECTIVE` khi gắn (kèm audit) — chỉ nên làm nếu BA đồng ý.
- **Ước lượng:** cách 1 ~2h FE (+0 BE).

### 7.2. Mã lỗi nghiệp vụ chưa được dịch ra thông điệp
Các trường hợp dưới đây UI chỉ hiện toast chung **“Có lỗi xảy ra — vui lòng thử lại”**:
| Mã BE | Ngữ cảnh | Nên hiển thị |
|---|---|---|
| `work-area-scope-denied` | leader duyệt purchase request ngoài phạm vi | “Bạn không phụ trách khu vực của đề nghị này.” |
| `corrective-task-invalid` | gắn việc khắc phục sai loại | “Chỉ gắn được task loại Khắc phục đang mở.” |
| `work-area-not-in-readiness-review` | xác nhận sẵn sàng sai điều kiện | “Còn nhiệm vụ chưa hoàn thành — chưa thể chốt sẵn sàng.” |
| `attendance-review-note-required` | từ chối đơn không lý do | (đã xử lý ở FE bằng dialog bắt buộc) |
- **Ước lượng:** ~1h FE (map 3–4 mã trong helper `toastError`).

### 7.3. Bảng quyên góp thiếu “Khu vực nhận”
BR-37 bắt buộc MATERIAL donation phải xác định work area nhận, nhưng bảng
`/material-officer/donations` không hiển thị cột này (chỉ thấy khi mở dialog ghi nhận).
Ví dụ: pledge `Ông Trần Văn Lộc` thực chất nhận về **Hang đá thiếu nhi**, người dùng không thấy trước khi ghi nhận.
- **Ước lượng:** ~30 phút FE.

### 7.4. ⏸️ Phân bổ (BR-33) chưa test được
Form phân bổ ở trạng thái mặc định không có vật tư khả dụng (`select` vật tư chỉ có “— Chọn —”), nút “Phân bổ” `disabled`.
Cần: tạo tồn khả dụng cho khu (nhập opening stock hoặc xác nhận giao hàng) rồi mới thử số lượng vượt tồn.

## 8. Cập nhật danh sách “chưa chạy” sau đợt 2

| Luồng | Trạng thái mới |
|---|---|
| §8.12 fail → corrective | ⚠️ Đã chạy, **phát hiện FAIL** (7.1) |
| §8.12 xác nhận sẵn sàng | ✅ Đã chạy (chặn đúng) |
| §8.7 ghi nhận donation receipt | ✅ Đã chạy (đúng BR-38) |
| §8.9 phân bổ vượt tồn | ⏸️ Chặn bởi dữ liệu (7.4) |
| §8.6 chuỗi mua sắm trọn vẹn | ⏸️ Vẫn chưa chạy (không có purchase; cần MO tạo request trong khu của leader được test) |
| §8.11 support request | ⏸️ Vẫn chưa chạy (`support_request` = 0) |
| §8.10 material report | ⏸️ Vẫn chưa chạy (không có report; cần task Completed + allocation) |

---

# ĐỢT 3 — tạo dữ liệu để chạy các luồng phụ thuộc (11/11/2026)

## 9. Đã làm

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| MAT-03 | §8.5 nhập **tồn đầu kỳ** (opening stock) | ✅ PASS | MO → Tồn kho → “Nhập tồn đầu kỳ”: chọn khu **Hang đá trung tâm** + vật tư **Bàn nhựa 1m8 (VAT-009)**, số lượng 100 → `201`, toast “Ghi nhận tồn đầu kỳ thành công…”, bảng cân đối hiện `yêu cầu 0 · sẵn có 100 · đã phân bổ 0 · thiếu hụt 100` |
| ALLOC-01 | §8.9/BR-33 không phân bổ vượt tồn khả dụng | ✅ PASS (chặn ở UI) | Cùng vật tư (khả dụng 100) nhập **200** → form báo **“vượt mức khả dụng”** và **không gửi request nào** (không có call `POST /material-allocations`). Cần bổ sung test phía BE để chắc chắn guard server-side (xem §10) |

## 10. Còn lại của (c)

| Luồng | Trạng thái | Việc cần làm |
|---|---|---|
| BR-33 phía BE | ⏸️ Chưa probe trực tiếp | Gọi thẳng `POST /api/v1/material-allocations` với `quantity > unallocated` (bỏ qua validate UI) và kỳ vọng `409/422` |
| §8.6 chuỗi mua sắm bước 4–10 | ⏸️ Chưa chạy | MO tạo purchase request cho **Hang đá trung tâm** → leader `ngan.nguyen` duyệt → `POST /purchase-requests/{id}/purchase-tasks` → assign volunteer → volunteer submit purchase → MO `confirm-delivery` → kiểm tra stock tăng + task `COMPLETED` (BR-65) |
| §8.11 support request | ⏸️ Chưa chạy | Leader tạo + publish → community khác phản hồi → MO nguồn duyệt → MO nhận xác nhận `TRANSFER_IN` |
| §8.10 material report | ⏸️ Chưa chạy | Sau khi có task `COMPLETED` + allocation (từ chuỗi mua sắm) → volunteer gửi report → MO verify, kiểm tra usable quay lại stock đúng khu |

## 11. Fix đã ship trong lúc test (đợt 3)

- **BR-66 chạy được**: BE thêm `taskType` optional cho `POST /work-areas/{id}/tasks` (cho phép tạo task `CORRECTIVE`);
  FE `/leader/checklist` lọc dropdown theo `CORRECTIVE` và có nút **“Tạo việc khắc phục”** (tạo + tự gắn).
  Kiểm chứng: task `CORRECTIVE` `201`, gắn bằng `PUT …/corrective-task` → `200`, `correctiveTaskId` được set.
  Chi tiết: `GrottoWorks_BE/docs/BE-CHANGELOG.md` mục 7.



## 12. Đợt 3b — chạy chuỗi mua sắm (§8.6 bước 1–4) và BR-33 phía BE

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| ALLOC-02 | BR-33 guard **phía BE** (bỏ qua validate UI) | ✅ PASS | `POST /material-allocations` qty **200** khi khả dụng **100** → `409 material-insufficient-available` |
| PUR-04 | §8.6 bước 2–3 tạo + gửi duyệt purchase request | ✅ PASS | MO tạo PR cho *Hang đá trung tâm* → `201 PLANNING`; `POST /submit` → `200 PENDING_APPROVAL` |
| PUR-05 | §8.6 ngoại lệ BR-27 (shortage = 0) | ✅ PASS | Lần đầu tạo PR **không** kèm `shortageOverrideReason` → `409`; thêm lý do override → tạo được (đúng quy tắc “chỉ tạo khi shortage > 0, trừ khi override có lý do”) |
| PUR-06 | §8.6 bước 3–4 LEADER duyệt + tạo task mua | ✅ PASS | `POST /purchase-requests/{id}/approve` (LEADER `ngan.nguyen`) → `200 APPROVED`; `POST …/purchase-tasks` → `201`, `taskType = PURCHASE` (task `346754c7…`) |
| PUR-07 | §8.6 bước 5–10 (assign → TNV mua → MO xác nhận giao → BR-65 task tự Completed) | ⏸️ Chưa chạy | Cần payload submit purchase (`items` + giá + hoá đơn) và assign volunteer; dữ liệu PR test: `00e991c6-9445-47b5-b0df-fa9cc31ca6e0` |

## 13. Đợt 3c — chuỗi mua sắm bước 5–6 (assign + accept)

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| PUR-07a | §8.2/§8.6 bước 5: LEADER giao task mua cho TNV | ✅ PASS | `POST /tasks/346754c7…/assignments { volunteerId }` → `201`, assignment `fd7e72b9…` `PENDING` |
| PUR-07b | TNV chấp nhận assignment | ✅ PASS | `POST /task-assignments/fd7e72b9…/accept` → `200 ACCEPTED` |
| PUR-07c | §8.6 bước 6: TNV ghi nhận thông tin mua | ⚠️ **BỊ CHẶN** | `POST /purchase-requests/00e991c6…/purchases` (role VOLUNTEER) trả `422` khi thiếu `Items[0].UnitPrice`, và `400 INVALID_REQUEST_BODY` khi gửi `unitPrice: { amount, currency }`. **Chưa có UI web** cho bước này (web chỉ có màn MO xác nhận giao) ⇒ cần chốt lại contract `PurchaseLineRequest` + bổ sung UI (mobile/web) |
| PUR-07d | §8.6 bước 8–10: MO xác nhận giao → BR-65 task tự `COMPLETED` | ⏸️ Chưa chạy | Phụ thuộc PUR-07c |

## 14. Đợt 3d — hoàn tất chuỗi mua sắm (bước 6–10)

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| PUR-07c | §8.6 bước 6: TNV ghi thông tin mua | ✅ PASS | Contract đúng: `items[].unitPrice` là **decimal** (không phải object). `POST /purchase-requests/00e991c6…/purchases` → `201 SUBMITTED`, purchase `2b5d7d19…` |
| PUR-07d | §8.6 bước 8–10: MO xác nhận giao | ✅ PASS | `POST /purchases/2b5d7d19…/confirm-delivery` với `items:[{purchaseItemId, receivedUsableQuantity, receivedUnusableQuantity}]` → `200`; purchase request → **`COMPLETED`** |
| PUR-08 | BR-65: task mua **tự** `COMPLETED` khi xác nhận giao | ❌ **FAIL** | Ngay sau `confirm-delivery`, purchase task `346754c7…` vẫn **`OPEN`** (đọc lại ngay và kiểm tra DB `task_db.task.task_status = OPEN`) ⇒ BR-65 chưa được thực thi |

**Kết luận chuỗi mua sắm:** tạo PR → submit → LEADER duyệt → tạo task PURCHASE → assign → TNV nhận → TNV ghi mua → MO xác nhận giao → **PR `COMPLETED`** đều chạy đúng. **BR-65 đạt** (task mua tự `COMPLETED` sau khi event đồng bộ).

## 15. Đợt 3e — support request (§8.11) phần tạo & công bố

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| SUP-01 | §8.11 tạo support request MIXED (1 position + 1 material) | ✅ PASS | `POST /support-requests` → `201 PLANNING` (`84323aa9-46e3-4743-8a12-948fc7125c40`) |
| SUP-02 | BR-62: công bố phải có ≥1 position hoặc ≥1 dòng vật tư | ✅ PASS | Request rỗng (`14d88459…`, 0 position/0 material) → `POST …/publish` trả `422 support-position-required` (chặn đúng **ở bước công bố**, tạo nháp vẫn cho phép) |
| SUP-03 | §8.11 công bố request có position | ⚠️ **BỊ CHẶN bởi ràng buộc chưa có trong tài liệu** | Publish request `84323aa9…` (position “Thợ mộc”, `taskId = null`) → `422 SUPPORT_POSITION_TASK_REQUIRED`. §8.11 chỉ yêu cầu tên vị trí + số người + skill, **không nói phải gắn task** ⇒ cần chốt lại với BA hoặc bổ sung vào tài liệu |
| SUP-04 | §8.11 response → duyệt → `TRANSFER_IN` | ⏸️ Chưa chạy | Cần publish thành công trước (gắn `taskId` cho position rồi publish lại) |

**Ghi chú kỹ thuật:** `deadline` của support request nhận **date-only** (`"2026-11-16"`); gửi ISO datetime đầy đủ → `400 INVALID_REQUEST_BODY`.

## 16. Đợt 3f — publish support request sau khi gắn task cho position

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| SUP-03 | §8.11 công bố request khi position có `taskId` | ✅ PASS | Tạo lại với `positions[0].taskId = e839cccb…` → `201 PLANNING`; `POST …/publish` (If-Match version 1) → `200` **`PUBLISHED`** (v2), request `1dea1b2b-c6ea-4bbc-8a55-a0292c9c4a60` |
| SUP-04 | §8.11 response → duyệt member/material → `TRANSFER_OUT` → `TRANSFER_IN` | ⏸️ Chưa chạy | Request đã `PUBLISHED`, hiện `GET …/responses` = 0. Cần client khác gửi response với payload `SupportResponseRequest { respondingCommunityId?, members: SupportMemberInput[], materials: SupportMaterialOfferInput[] }`, sau đó duyệt `/support-response-members/{id}/approve`, `/support-response-materials/{id}/approve` và `/confirm-receipt` |

**Kết luận §8.11:** luồng tạo → công bố chạy đúng (kèm ràng buộc **position phải có task**, xem §15 SUP-03). Phần phản hồi/chuyển kho của cộng đoàn khác chưa chạy được trong phiên này.

## 17. Hợp đồng API còn thiếu để chạy nốt SUP-04 và §8.10 (ghi lại để lần sau chạy ngay)

**SUP-04 — phản hồi & chuyển kho hỗ trợ**
- `POST /api/v1/support-requests/{id}/responses` — role **VOLUNTEER | MATERIAL_OFFICER** (không phải LEADER), body `SupportResponseRequest { respondingCommunityId?, members: SupportMemberInput[], materials: SupportMaterialOfferInput[], note? }`. Hai type input nằm ngoài `SupportResponseEndpoints.cs` (cần tìm trong `Requests/` của TaskExecution).
- `GET /api/v1/support-requests/{id}/responses` — role **LEADER** (đọc danh sách phản hồi).
- `POST /api/v1/support-response-members/{memberId}/approve|reject` — role **LEADER**.
- `POST /api/v1/support-response-materials/{itemId}/approve|reject` — role **LEADER** (`ApproveSupportMaterialRequest`, `ReasonCommandRequest`).
- Xác nhận nhận vật tư: `POST /api/v1/support-response-materials/{itemId}/confirm-receipt` (MO bên nhận) → sinh `TRANSFER_OUT`/`TRANSFER_IN`.
- Request đã publish sẵn: `1dea1b2b-c6ea-4bbc-8a55-a0292c9c4a60` (PUBLISHED, v2, khu *Hang đá trung tâm*).

**§8.10 — material report**
- Endpoint `POST /api/v1/tasks/{taskId}/material-reports` **không nằm trong** `TaskExecution.Api/Endpoints/*` (đã grep `material-reports` = 0 kết quả) ⇒ cần tìm lại: có thể ở service khác hoặc route khác tên. Việc cần làm: grep toàn solution `material-report` rồi xác định service + body `remaining/damaged/lost` theo `material_allocation_item`.
- Điều kiện dữ liệu: task `COMPLETED` + có allocation. Hiện *Hang đá trung tâm* đã có allocation (`Bàn nhựa` 100 nhập kho, purchase task `346754c7…` đã `COMPLETED`) — cần allocation gắn **task** (không phải chỉ work area) để report có item.

## 18. Đợt 3h — SUP-04: phản hồi hỗ trợ & duyệt thành viên

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| SUP-04a | §8.11 bước 3: TNV gửi phản hồi (nhân lực) | ✅ PASS | `POST /support-requests/1dea1b2b…/responses` (role VOLUNTEER) body `{ members:[{positionId, volunteerId}], materials:[] }` → `201`, response `0784b3e6…` |
| SUP-04b | §8.11 bước 5: LEADER xem danh sách phản hồi | ✅ PASS | `GET /support-requests/1dea1b2b…/responses` (role LEADER) → 1 phản hồi, member `a940e181…` |
| SUP-04c | **BR-77** duyệt member phải đủ skill bắt buộc, không override | ✅ PASS (chặn đúng) | Duyệt member `a940e181…` (TNV `hau.trinh` không khớp skill của task gắn position) → `409 SUPPORT_SKILL_MISMATCH`; request vẫn `PUBLISHED` |
| SUP-04d | §8.11 duyệt member thành công trong dữ liệu demo | ⏸️ **Không thể** | `GET /tasks/e839cccb…/volunteer-matches` = **0 ứng viên** ⇒ không có TNV nào thoả skill bắt buộc của task gắn position ⇒ không thể approve với seed hiện tại |
| SUP-04e | §8.11 vật tư: offer → duyệt → `TRANSFER_OUT`/`TRANSFER_IN` (BR-63/64/80) | ⏸️ Chưa chạy | Cần work area nguồn có unallocated stock cho vật tư `a8e74f4e…`; response material dùng `{ requestMaterialId, sourceWorkAreaId, offeredQuantity }`, duyệt `POST /support-response-materials/{id}/approve { approvedQuantity, version }`, nhận `…/confirm-receipt` |

**Kết luận §8.11:** chuỗi *tạo → publish → phản hồi → leader xem* chạy đúng; bước **duyệt thành viên bị chặn đúng bởi BR-77** và dữ liệu seed không có ứng viên đủ skill (gắn position với task không ai khớp). Muốn test trọn: chọn task có skill mà seed có TNV sở hữu, hoặc bỏ skill của task rồi publish lại.

## 19. Đợt 3i — SUP-04e: duyệt vật tư hỗ trợ & nhận hàng

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| SUP-04e1 | Work area nguồn có tồn khả dụng | ✅ PASS | `POST /inventory/opening-stock` body `{ workAreaId, materialId, quantity }` → `201` (Bàn nhựa 20 cái vào **Cổng chào và biển báo**) |
| SUP-04e2 | TNV/MO gửi offer vật tư | ✅ PASS | `POST /support-requests/{id}/responses` với `materials:[{requestMaterialId, sourceWorkAreaId, offeredQuantity:10}]` → `201`, response `3129f4e9…` |
| SUP-04e3 | **BR-63** LEADER duyệt offer vật tư | ✅ PASS | `POST /support-response-materials/c786ce36…/approve { approvedQuantity:10, version:1 }` → `200 APPROVED` (v3); Resource ghi `TRANSFER_OUT −10` ở **Cổng chào và biển báo** |
| SUP-04e4 | **BR-64** MO bên nhận xác nhận → `TRANSFER_IN` chỉ phần dùng được | ✅ PASS (sau khi sửa BE) | `POST …/confirm-receipt { receivedUsableQuantity:9, receivedUnusableQuantity:1, version:2088 }` → `200 RECEIVED`; ledger `TRANSFER_IN +9` vào **Hang đá trung tâm** (10 gửi − 1 hỏng = 9 vào kho) |
| SUP-04e5 | Request chuyển `Partially/Full Filled`, item → `TRANSFERRED` | ✅ PASS | `GET /support-requests/1dea1b2b…` → `PARTIALLY_FULFILLED`; item `c786ce36…` → `TRANSFERRED` v4; lần 2 (offer 2, duyệt 2, nhận 2) → item `2e570dd3…` `TRANSFERRED` v4, ledger `−2 / +2` |
| SUP-04e6 | **UI E2E** `/material-officer/support-materials` | ✅ PASS (sau khi sửa FE) | Bấm "Xác nhận đã nhận" → dialog → Lưu → toast "Đã xác nhận nhận vật tư"; reload trang → "Không có vật tư hỗ trợ nào chờ nhận" |

**Nguyên nhân gốc SUP-04e4 (bug thật, đã sửa):** `confirm-receipt` kiểm tra `Version` của bảng **`support_transfer`** (Resource, token `xmin` = `2088`) chứ không phải `version` của `support_response_material` (TaskExecution = `3`). FE gửi version của item ⇒ luôn `412 SUPPORT_TRANSFER_VERSION_MISMATCH`.

**Sửa:**
- BE (Resource): thêm `GET /api/v1/support-response-materials/{itemId}/support-transfer` (`getSupportMaterialTransfer`, role MO, trả `SupportTransferDto` có `version` thật) + `GetSupportTransferQueryHandler` + đăng ký DI + route YARP `resource-support-material-transfer-route`. Ghi ở `GrottoWorks_BE/docs/BE-CHANGELOG.md` (lần 5, mục 8).
- FE: `useSupportTransfer()` trong `src/features/support/api.ts`; `MaterialReceiptsPage` lấy `transfer.version` thay cho `item.version` trước khi gọi `confirm-receipt`.

**Kiểm chứng quyền:** `GET …/support-transfer` — MO `200`, LEADER `403` (đúng role-gate).

## 20. Đợt 3j — §8.10 Báo cáo vật tư sau thi công (BR-44/45/47/49/50/51)

| Mã | Nghiệp vụ | Kết quả | Bằng chứng |
|---|---|---|---|
| MR-01 | **BR-44** không cấp phát cho task đã COMPLETED/CANCELLED | ✅ PASS (chặn đúng) | `POST /material-allocations` với task `346754c7…` (COMPLETED) → `409 TASK_NOT_ALLOCATABLE` |
| MR-02 | Cấp phát vật tư gắn task đang chạy | ✅ PASS | `POST /material-allocations { workAreaId: 942fe59a…, taskId: e839cccb…, items:[{ materialId: e53a19fd…, quantity: 6 }] }` → `201`, allocation `f7d9e858…`, item `bd5f5678…` |
| MR-03 | Hoàn tất task (team leader nộp → leader duyệt) | ✅ PASS | `POST /tasks/e839cccb…/submit` (TNV `tram.do` là team leader được chỉ định) `200` → `SUBMITTED` v14; `POST …/approve` (LEADER) `200` → `COMPLETED` v15 |
| MR-04 | **BR-44** chỉ báo cáo khi task đã COMPLETED | ✅ PASS (chặn đúng) | Gửi báo cáo ngay sau khi duyệt (projection Resource chưa cập nhật) → `409 TASK_NOT_COMPLETED`; sau khi `task_projection = COMPLETED` thì `201` |
| MR-05 | **BR-45** TNV báo cáo còn/hỏng/mất theo từng dòng cấp phát | ✅ PASS | `POST /tasks/e839cccb…/material-reports` (TNV `hau.trinh`, ACCEPTED assignment) `{ items:[{ materialAllocationItemId: bd5f5678…, remainingQuantity:4, damagedQuantity:1, lostQuantity:1 }] }` → `201`, report `bb01d9dd…` `SUBMITTED`, item `e5771429…`, `allocatedQuantity: 6` |
| MR-06 | Người không phải assignee không được báo cáo | ✅ PASS (chặn đúng) | Chỉ TNV có assignment `ACCEPTED` (hoặc MO khi task CANCELLED) mới gọi được — nhánh `MATERIAL_REPORT_NOT_ASSIGNEE` |
| MR-07 | **BR-47** MO xác nhận số thực tế | ✅ PASS | `POST /task-material-reports/bb01d9dd…/verify` (MO, `If-Match: "2249"`) `{ remainingQuantity:4, damagedQuantity:1, lostQuantity:1 }` → `200 VERIFIED` |
| MR-08 | **BR-49** phần còn lại nhập lại kho đúng khu, đúng 1 lần | ✅ PASS | Ledger `TASK_RETURN +4` vào **Hang đá trung tâm**, `reference_type = TASK_MATERIAL_REPORT_ITEM`, `reference_id = e5771429…` |
| MR-09 | **BR-50** hỏng/mất không nhập kho | ✅ PASS | Không có `TASK_RETURN` 5 hay 6; chỉ 1 dòng `+4` (1 hỏng + 1 mất bị loại) |
| MR-10 | **BR-51** số cấp phát không đổi | ✅ PASS | `material_allocation_item.allocated_quantity` vẫn `6.00` sau khi verify |
| MR-11 | Verify lần 2 không nhập kho lần nữa | ✅ PASS (chặn đúng) | Verify lại → `409 MATERIAL_REPORT_INVALID_STATE` |
| MR-12 | UI MO `/material-officer/material-reports` | ✅ PASS | Trang hiển thị dòng "Dựng khung hang đá trung tâm · Hang đá trung tâm · 1 dòng · VERIFIED"; FE gửi `version` của report (xmin) nên khớp `If-Match` |

**Ghi chú kỹ thuật:** (1) `version` của `task_material_report` là token `xmin` (ví dụ `2249`) — FE đã đọc từ DTO nên không lặp lại lỗi như `confirm-receipt`; (2) Resource chỉ biết task đã COMPLETED sau khi nhận event → có độ trễ ~5 giây, cần chờ `task_projection` cập nhật trước khi báo cáo.

## 21. Đợt 3k — sửa 4 lỗi còn lại của báo cáo test (mục 2, 3, 4, 5)

| Mã | Lỗi | Cách sửa | Kiểm chứng |
|---|---|---|---|
| FIX-02 | Toast hiện nguyên văn `code`/`detail` tiếng Anh của BE | `src/lib/api.ts` thêm `translateCode()`: tra `errors.<CODE>` trong i18n trước khi dùng `detail`; thêm ~35 mã vào `vi.json`/`en.json` (`WORK_AREA_SCOPE_DENIED`, `CORRECTIVE_TASK_INVALID`, `WORK_AREA_NOT_IN_READINESS_REVIEW`, `TASK_NOT_ALLOCATABLE`, `SUPPORT_TRANSFER_*`, `PURCHASE_NOT_BUYER`, …) | `src/lib/apiErrorCodes.test.ts` **3/3 pass**; `npm run lint` sạch; toàn bộ FE **162 test** (159 + 3) pass |
| FIX-03 | Không có màn hình cho người đi mua (buyer) | Thêm `useMyPurchaseTasks()` (`GET /users/me/tasks?taskType=PURCHASE`) + `useRecordPurchase()` (`POST /purchase-requests/{id}/purchases`); trang mới `/volunteer/purchases` (`VolunteerPurchasesPage`) + guard `RequireVolunteer`; nút "Ghi nhận mua hàng" ở `/volunteer` | Seed thật: PR `8b4b80cd…` (APPROVED) → việc mua `88aa7d93…` giao TNV `hau.trinh` (ACCEPTED) → UI hiện việc + dialog điền sẵn 3 × 30.000 ₫ → Lưu → toast "Đã ghi nhận lần mua.", PR → `PURCHASED`, purchase `b845e04e…` tổng `90.000 VND`, **kho không đổi** (BR-26) |
| FIX-04 | Bảng quyên góp thiếu cột "Khu vực nhận" | Thêm cột vào `DonationListPage` (+ CSV export) và **sửa lỗi memo**: `columns` useMemo thiếu `areas` trong deps nên đóng băng danh sách khu rỗng → luôn hiện "—" | Trang `/material-officer/donations` hiện đúng: "Hang đá thiếu nhi", "Gian hàng ẩm thực", "Hang đá trung tâm" |
| FIX-05 | MO bị 403 ở 3 báo cáo cấp giáo xứ | BE: mở role `MO` cho `GET /dashboards/season`, `GET /seasons/{id}/recognition`, `GET /seasons/{id}/support-summary` + `GetSupportSummaryHandler` chấp nhận MO (vẫn chặn chéo giáo xứ) | MO → **200** cả 3; VOLUNTEER → **403** (đúng); `TaskExecution.UnitTests` **377/377**, `Reporting.UnitTests` **71/71** |

**Ghi chú:** FIX-04 là bug thật phát sinh khi thêm cột (stale closure), đã sửa cùng lúc — nếu chỉ thêm cột mà không thêm `areas` vào deps thì cột luôn rỗng.
