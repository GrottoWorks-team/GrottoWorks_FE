# Kịch bản & kết quả test luồng nghiệp vụ — 11/11/2026

**Phạm vi:** các luồng vừa thay đổi trong ngày 11/11/2026 — duyệt chấm công (đơn
check-in, phiên mở quá lâu, đóng phiên hộ, thông báo) và phân quyền bản đồ giáo xứ /
khu vực công tác.
**Môi trường:** Docker stack `GrottoWorks_BE` (gateway `http://localhost:6102`), web
`http://localhost:5175`, DB `task_db` / `notify_db` / `identity_db` (port 15435 qua
container). Dữ liệu seed đã sửa ngày 11/11 (xem `GrottoWorks_BE/docs/BE-CHANGELOG.md` mục 5).

**Tài khoản dùng để test**

| Vai trò | Tài khoản | Mật khẩu | Dùng cho |
|---|---|---|---|
| Trưởng khu (LEADER) | `ngan.nguyen` | `GxThanhTam@2026` | duyệt đơn, đóng phiên |
| Quản trị (ADMIN) | `hoa.nguyen` | `GxThanhTam@2026` | hub giáo xứ, bản đồ (chỉ xem) |
| Ban hành giáo (COMMUNITY) | `bao.tran` | `GxThanhTam@2026` | khu vực công tác, ghim bản đồ |
| TNV (VOLUNTEER) | `hau.trinh@giaoxuthanhtam.org.vn` | `GxThanhTam@2026` | tạo đơn check-in qua API (app mobile không chạy trên máy test) |

---

## 1. Tổng hợp kết quả

| Mã | Luồng / kịch bản | Kết quả |
|---|---|---|
| ATT-01 | Danh sách đơn check-in hiển thị **TNV + nhiệm vụ + loại đơn** | ✅ PASS |
| ATT-02 | **Tab trạng thái** (Chờ duyệt / Đã duyệt / Từ chối / Đã huỷ) | ✅ PASS |
| ATT-03 | Nhắc **“Còn N đơn chờ ở khu khác”** | ✅ PASS |
| ATT-04 | **Duyệt** đơn check-in → sang tab “Đã duyệt”, tạo phiên OPEN | ✅ PASS |
| ATT-05 | **Từ chối** đơn với lý do | ✅ PASS |
| ATT-06 | Từ chối **khi để trống lý do** (bug tìm thấy trong test) | ⚠️ FAIL → **đã sửa**, PASS sau khi sửa |
| ATT-07 | **Phiên mở quá lâu** lọc theo khu + hiện TNV/nhiệm vụ | ✅ PASS |
| ATT-08 | **Đóng phiên hộ** (bắt buộc lý do) → chốt giờ công | ✅ PASS |
| ATT-09 | **Thông báo** cho TNV: duyệt / từ chối / bị đóng phiên | ✅ PASS |
| MAP-01 | ADMIN: tải/thay ảnh sơ đồ, **không có nút ghim**, có banner chỉ xem | ✅ PASS |
| MAP-02 | Ban hành giáo: **ghim vị trí** được, không có nút tải ảnh | ✅ PASS |
| AREA-01 | ADMIN: hub khu vực chỉ đọc (không nút tạo/phân công) | ✅ PASS |
| AREA-02 | Ban hành giáo: `/community/areas` có nút “Tạo khu vực” | ✅ PASS |
| MOB-01 | Mobile: thông báo hệ thống ra khay điện thoại | ⏸️ Chưa chạy được (cần thiết bị thật) |

---

## 2. Chi tiết kịch bản

### ATT-01 — Đơn check-in hiển thị người xin và nhiệm vụ
- **Tiền điều kiện:** đăng nhập `ngan.nguyen` → `/leader/timesheets` → khu *Hang đá trung tâm*.
- **Bước:** mở tab “Chờ duyệt”.
- **Mong đợi:** mỗi dòng có cột *Tình nguyện viên*, *Nhiệm vụ*, *Loại đơn* = “Vào ca/Ra ca”.
- **Thực tế (PASS):** header `Tình nguyện viên | Nhiệm vụ | Loại đơn | Thời điểm xin | Ghi chú | Trạng thái | Thao tác`;
  dòng: `Phaolô Trịnh Văn Hậu | Dựng khung hang đá trung tâm | Vào ca | 22:02 11/11/2026 | Test luong duyet don check-in. | Chờ duyệt | Duyệt / Từ chối`.
- **Bằng chứng API:** `GET /api/v1/work-areas/942fe59a…/attendance-requests?status=PENDING` → 200 kèm `volunteerId`, `taskId`, `taskName`.

### ATT-02 — Tab trạng thái
- **Bước:** bấm lần lượt “Đã duyệt”, “Từ chối”, “Đã huỷ”.
- **Mong đợi:** bảng đổi nội dung theo trạng thái; đơn đã duyệt **không còn biến mất**.
- **Thực tế (PASS):** tab “Đã duyệt” khu Hang đá trung tâm trả 5 đơn, có ghi chú duyệt
  (“Đã xác nhận.”) và cột thao tác `—`; tab “Từ chối” hiện lý do từ chối dưới badge trạng thái.
- **Ghi chú:** request URL `...attendance-requests?status=APPROVED|REJECTED|CANCELLED`.

### ATT-03 — Nhắc đơn chờ ở khu khác
- **Tiền điều kiện:** khu đang chọn **không** có đơn chờ, khu còn lại có.
- **Thực tế (PASS):** hiện `Còn 1 đơn chờ ở khu khác — chọn khu ở trên để duyệt.`; khi chọn khu có đơn thì dòng nhắc biến mất.

### ATT-04 — Duyệt đơn check-in
- **Bước:** tab “Chờ duyệt” → nút **Duyệt** trên dòng đơn.
- **Mong đợi:** `200`, đơn rời danh sách chờ, xuất hiện ở “Đã duyệt”, BE tạo phiên OPEN.
- **Thực tế (PASS):** `200` `{"status":"APPROVED", …}`; tab chờ rỗng; “Đã duyệt” = 5 dòng;
  DB `attendance` có phiên OPEN mới cho `task_assignment_id = c86cf0d5…`.

### ATT-05 — Từ chối đơn kèm lý do
- **Bước:** nút **Từ chối** trên dòng đơn → nhập lý do → Xác nhận.
- **Thực tế (PASS):** `200` `{"status":"REJECTED"}`; tab “Từ chối” hiện
  `Từ chối` + `Trùng ca với khu khác, liên hệ trưởng khu`; toast “Đã từ chối đơn check-in”.

### ATT-06 — Từ chối khi để trống lý do  ⚠️ bug tìm thấy trong test
- **Bước:** mở dialog Từ chối → bấm Xác nhận khi ô lý do trống.
- **Mong đợi:** UI chặn lại, không gửi request.
- **Thực tế trước khi sửa (FAIL):** gửi request thật → `422 attendance-review-note-required`
  (“Rejection requires a review note…”), UI chỉ hiện toast chung “Có lỗi xảy ra”, đơn vẫn PENDING.
- **Đã sửa:** dialog từ chối nay dùng nhãn **“Lý do từ chối (bắt buộc)”** và nút Xác nhận bị
  khoá khi ô trống (dùng chung cơ chế `required` của dialog đóng phiên).
- **Test lại (PASS):** nút Xác nhận `disabled = true` khi trống, `false` sau khi nhập, submit → `200` + toast.

### ATT-07 — Cảnh báo “Phiên điểm danh mở quá lâu”
- **Tiền điều kiện:** phiên OPEN có `check_in_at` cách hiện tại > 12h (`Attendance:LongOpenHours=12`).
- **Thực tế (PASS):** card hiện `Phaolô Trịnh Văn Hậu | Dựng khung hang đá trung tâm |
  Check-in lúc 09:03 11/11/2026 | Đã mở 13.0 giờ | [Đóng phiên]`.
- **Kiểm tra lọc theo khu:** chuyển sang khu *Sân khấu văn nghệ* → `Không có phiên nào bỏ ngỏ.`
  (request `GET /attendance/open-sessions?workAreaId=…`).

### ATT-08 — Đóng phiên hộ
- **Bước:** bấm **Đóng phiên** → nhập lý do → Xác nhận.
- **Mong đợi:** `200`, phiên CLOSED, giờ công được chốt, card trống đi.
- **Thực tế (PASS):** `200` `{"status":"CLOSED","approvedMinutes":780,"version":2,"volunteerId":…}`;
  card trống; bảng “Giờ công đã duyệt” tăng `Phaolô Trịnh Văn Hậu 27.48`, tổng 51 giờ;
  toast “Đã đóng phiên điểm danh và chốt giờ công”.
- **Kiểm tra chặn:** bấm Xác nhận khi ô lý do trống → nút bị khoá (không gửi request).

### ATT-09 — Thông báo cho TNV
- **Bước:** sau ATT-04/05/08, đọc bảng `notification` của `notify_db`.
- **Thực tế (PASS):**
  | Thời điểm | Title | Body |
  |---|---|---|
  | sau duyệt | Check-in approved | Your attendance request was approved. |
  | sau từ chối | Check-in rejected | Your attendance request was rejected. |
  | sau đóng phiên | Attendance session closed | The leader closed your open attendance session. Hours recorded: 13. Reason: TNV quen check-out (test luong dong phien) |
- Rule `71000000-…-034` (`attendance.session.closed-by-leader`) có trong `notification_rule`
  với `in_app_enabled = true`.

### MAP-01 — ADMIN chỉ xem bản đồ
- **Bước:** đăng nhập `hoa.nguyen` → `/parish/communities/map` → tải ảnh sơ đồ.
- **Thực tế (PASS):** có nút **Thay bản đồ** (1), **0** nút “Đặt vị trí/Xoá vị trí”,
  hiện banner `Bạn chỉ được xem vị trí khu vực trên sơ đồ. Việc ghim vị trí do Ban hành giáo thực hiện.`
- **Ghi chú:** banner chỉ hiện khi giáo xứ đã có ảnh sơ đồ (trước khi tải: chỉ có empty state + nút Tải).

### MAP-02 — Ban hành giáo ghim vị trí
- **Bước:** đăng nhập `bao.tran` → `/community/map`.
- **Thực tế (PASS):** **8** nút “Đặt vị trí”, **0** nút tải/thay bản đồ; bấm “Đặt vị trí” rồi
  click lên ảnh → ghim được lưu (`localStorage grotto-parish-map-v1` có mục `pins`), UI báo “Đã ghim khu vực lên bản đồ”.

### AREA-01 / AREA-02 — Phân quyền khu vực công tác
- **AREA-01 (ADMIN, PASS):** `/parish/communities?tab=areas` → **0** nút tạo khu vực, **0** nút phân công,
  có dòng “Chỉ xem — việc tạo, điều chỉnh và phân công trưởng khu / trưởng nhóm vật tư do Ban hành giáo thực hiện…”.
- **AREA-02 (COMMUNITY, PASS):** `/community/areas` có nút **Tạo khu vực** (1).
  Tạo khu vực trong mùa 2026 trả `409` “Mùa đã kích hoạt — không thể thêm khu vực mới” — **đúng nghiệp vụ**, đã ghi ở `UI-TEST-SCENARIO.md` S11.

### MOB-01 — Thông báo ra khay điện thoại  ⏸️
- **Không chạy được trong phiên này:** cần thiết bị/emulator Android hoặc iOS.
- **Đã kiểm được:** `npm run typecheck` + `eslint` sạch cho `src/lib/notificationTray.ts`,
  `src/notifications/NotificationBridge.tsx`, `App.tsx`.
- **Cách chạy tay (khi có máy):**
  1. Cài Expo Go / dev build, đăng nhập TNV.
  2. Cho phép quyền thông báo.
  3. Trên web, leader duyệt hoặc đóng phiên của TNV đó.
  4. Trong ≤ 60s (hoặc khi đưa app về foreground) notification hiện ở khay + badge số chưa đọc.
  5. Mở lại app: không bắn lại thông báo cũ; tắt “push” trong Tuỳ chọn thông báo → không bắn nữa.

---

## 3. Phát hiện thêm trong lúc test (không chặn luồng)

1. **`POST /task-assignments/{id}/attendance/check-in-requests` không trả ngữ cảnh**
   (`volunteerId`/`taskId`/`taskName` = `null`) dù danh sách `GET` có — do `CheckInAsync`
   trả `AttendanceRequestDto.From(...)` không enrich. Không ảnh hưởng UI; nếu muốn đồng bộ
   thì bọc `WithContextAsync` như danh sách.
2. **Tab “Từ chối” trùng nhãn với nút hành động “Từ chối”** trong cùng trang → dễ trúng sai
   phần tử khi test tự động (đã phải scope theo `table`). Cân nhắc đổi nhãn tab thành
   “Đã từ chối”.
3. **`409 ATTENDANCE_ALREADY_OPEN`** khi TNV gửi đơn thứ 2 lúc đơn trước còn PENDING — đúng
   nghiệp vụ, dùng để xác nhận chặn trùng đơn.
4. **`ObjectStorageTests.R2_upload_url_is_path_style_https_and_signs_the_content_type`** fail
   sẵn từ trước (test dùng mốc thời gian cứng `2026-11-06`, presign lấy đồng hồ thật) — không
   liên quan thay đổi hôm nay.

---

## 4. Cách chạy lại

```powershell
# 1. Stack BE (đã có sẵn dữ liệu seed đã sửa)
cd GrottoWorks_BE
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# 2. Web
cd GrottoWorks_FE
npm run dev            # http://localhost:5175

# 3. Tạo đơn check-in để test (thay token/assignment nếu cần)
#    POST /api/v1/auth/login  { email: hau.trinh@giaoxuthanhtam.org.vn, password: GxThanhTam@2026 }
#    POST /api/v1/task-assignments/c86cf0d5-ba5e-4395-9ab5-897cfc5973d8/attendance/check-in-requests
#         headers: Authorization, Idempotency-Key (UUID), body { note }

# 4. Giả lập phiên mở quá lâu (tuỳ chọn)
docker exec grottoworks-postgres psql -U postgres -d task_db -c \
  "update attendance set check_in_at = now() - interval '13 hours' where task_assignment_id='c86cf0d5-ba5e-4395-9ab5-897cfc5973d8' and check_out_at is null;"

# 5. Kiểm thông báo
docker exec grottoworks-postgres psql -U postgres -d notify_db -c \
  "select title, body, created_at from notification order by created_at desc limit 5;"
```
