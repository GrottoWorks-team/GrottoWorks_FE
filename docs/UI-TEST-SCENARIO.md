# Kịch bản kiểm thử UI — GrottoWorks FE (chỉ luồng có API thật)

**Mục đích:** kiểm tra **toàn bộ** luồng nghiệp vụ trên FE web có gọi **API thật** của BE
(`docker compose up -d` trong `GrottoWorks_BE`, gateway `http://localhost:6102`, Vite proxy `/api/v1`).

**Phạm vi (cập nhật 23/10/2026):**
- Chỉ giữ các luồng có endpoint thật, đã đối chiếu với BE (`Services/*/*.Api/Endpoints/*.cs`).
- **Bỏ toàn bộ** luồng FE-only (localStorage/IndexedDB) và luồng còn gọi path legacy không có ở BE
  → danh sách đầy đủ ở §5.
- Mỗi kịch bản ghi rõ **role**, **màn hình**, **API thật**, **kết quả mong đợi**.
- Chỉ đánh **PASS** khi dữ liệu hiển thị đến từ BE (không phải mock/local) và console không lỗi.
- Đánh **N/A** khi không chạy được vì thiếu dữ liệu seed hoặc vì phía BE chưa có endpoint tương ứng.

---

## 0. Môi trường & tài khoản

| Mục | Giá trị |
| --- | --- |
| FE dev | `npm run dev` (cổng 5173/5174/5175 tuỳ máy) |
| BE gateway | `http://localhost:6102` |
| Seed dùng cho test | Parish `11111111-1111-1111-1111-111111111111`, Season `44444444-4444-4444-4444-444444444444` (PLANNING, 2026), WorkArea `66666666-6666-6666-6666-666666666666`, WorkArea `4bc72628-3167-4feb-899a-2b6141659e3e` |

| Vai trò BE | Tài khoản | Mật khẩu | Nhánh UI |
| --- | --- | --- | --- |
| `ADMIN` | `admin@grottoworks.vn` | `grotto123` | `/parish/*` |
| `PARISH` | `committee@grottoworks.vn` | `grotto123` | `/community/*` |
| `LEADER` | `leader@grottoworks.vn` | `grotto123` | `/leader/*` |
| `MO` | `officer@grottoworks.vn` | `grotto123` | `/material-officer/*` |
| `VOLUNTEER` | `volunteer@grottoworks.vn` | `grotto123` | không có web UI |

**Chuẩn bị dữ liệu (bắt buộc với S18, S25–S31):** service Resource và TaskExecution giữ bản
projection `work_area_scope` riêng, hiện **không** được đồng bộ tự động. Trước khi chạy các kịch bản
trên phải seed thủ công (`INTERNAL_API_KEY` trong `GrottoWorks_BE/.env`):

```powershell
$key = '<INTERNAL_API_KEY>'
$body = '{"seasonId":"44444444-4444-4444-4444-444444444444","parishId":"11111111-1111-1111-1111-111111111111","name":"Khu vuc demo","status":"PLANNED","seasonStatus":"PLANNING","leaderUserId":"3ff5b262-0e90-4f04-b9cf-0fd84ce4b30f","materialOfficerUserId":"9ac782b7-e1a1-4a8b-b54a-ab6020082fdc","version":1}'
Invoke-RestMethod -Method Put -Uri 'http://localhost:6103/internal/work-area-scopes/66666666-6666-6666-6666-666666666666' -Headers @{ 'X-Internal-Api-Key' = $key } -ContentType 'application/json' -Body $body
```

(đổi cổng `6104` cho TaskExecution, thêm `startDate`/`deadline` nếu cần). Chi tiết lỗi gốc: §4 – L1.

---

## 1. Tổng hợp kịch bản

| # | Kịch bản | Role | Màn hình | API thật |
| --- | --- | --- | --- | --- |
| **S1** | Đăng nhập / đăng xuất đúng vai trò | tất cả | `/login` | `POST /api/v1/auth/login`, `GET /api/v1/users/me`, `POST /api/v1/auth/logout` |
| **S2** | Sai mật khẩu bị chặn | — | `/login` | `POST /api/v1/auth/login` → 401 `AUTH_INVALID_CREDENTIALS` |
| **S3** | Đăng ký tài khoản mới | — | `/register-account` | `POST /api/v1/auth/register` |
| **S4** | Quên mật khẩu | — | `/forgot-password` | `POST /api/v1/auth/password/forgot` |
| **S5** | Đặt lại mật khẩu bằng token | — | `/reset-password?token=` | `POST /api/v1/auth/password/reset` |
| **S6** | Hồ sơ cá nhân | mọi role | `/profile` | `GET/PATCH /api/v1/users/me`, `PUT /users/me/skills`, `PUT /users/me/availability` |
| **S7** | Danh sách mùa | mọi role | `/parish/seasons`, `/community/seasons`, header | `GET /api/v1/seasons`, `GET /api/v1/seasons/{id}` |
| **S8** | Tạo / sửa mùa (`If-Match`) | PARISH | `/parish/seasons` | `POST /api/v1/seasons`, `PATCH /api/v1/seasons/{id}` |
| **S9** | Chuyển trạng thái mùa | PARISH | `/parish/seasons` | `POST /api/v1/seasons/{id}/activate` · `/complete` · `/archive` |
| **S10** | Khu vực theo mùa | mọi role | `/parish/areas`, `/community/areas`, dashboard | `GET /api/v1/seasons/{id}/work-areas`, `GET /api/v1/work-areas/{id}` |
| **S11** | Tạo / sửa khu vực | PARISH/COMMUNITY | `/parish/areas`, `/community/areas` | `POST /api/v1/seasons/{id}/work-areas`, `PATCH /api/v1/work-areas/{id}` |
| **S12** | Phân công khu vực (cộng đoàn/leader/MO) | PARISH/COMMUNITY | `/…/areas` → Phân công | `PATCH /work-areas/{id}`, `PUT /work-areas/{id}/community`, `/leader`, `/material-officer` |
| **S13** | Cộng đoàn: xem / tạo / sửa | PARISH | `/parish/communities` | `GET/POST /api/v1/parishes/{id}/communities`, `PATCH /api/v1/communities/{id}` |
| **S14** | Thông tin giáo xứ + tạo giáo xứ | PARISH | `/parish/communities` | `GET /api/v1/parishes`, `GET/PATCH /api/v1/parishes/{id}`, `POST /api/v1/parishes` |
| **S15** | Danh mục loại khu vực + kỹ năng | PARISH | `/parish/categories` | `GET/POST/PATCH /api/v1/work-area-categories`, `GET/POST/PATCH /api/v1/skills` |
| **S16** | Quản lý tài khoản | PARISH (ADMIN) | `/parish/accounts` | `GET/POST /api/v1/admin/users`, `PATCH /{id}`, `POST /{id}/lock`, `/{id}/unlock`, `PUT /{id}/role`, `GET /api/v1/roles`, `GET /api/v1/users` |
| **S17** | Dashboard 4 role + chọn mùa | cả 4 role | `/parish`, `/community`, `/leader`, `/material-officer` | `GET /seasons`, `GET /seasons/{id}/work-areas`, `GET /users`, `GET /parishes/{id}/communities`, `GET /purchase-requests` |
| **S18** | Danh sách + chi tiết nhiệm vụ | LEADER/COMMUNITY | `/leader/tasks`, `/leader/tasks/{id}`, `/community/areas/{id}/tasks` | `GET /api/v1/work-areas/{id}/tasks`, `GET /api/v1/tasks/{id}` |
| **S19** | Tạo nhiệm vụ | LEADER | `/leader/tasks` → Thêm | `POST /api/v1/work-areas/{id}/tasks` |
| **S20** | Sửa nhiệm vụ | LEADER | `/leader/tasks/{id}` | `PATCH /api/v1/tasks/{id}` (`If-Match`) |
| **S21** | Tiêu chí hoàn thành | LEADER | `/leader/tasks/{id}` | `PUT /api/v1/tasks/{id}/completion-criteria` |
| **S22** | Kỹ năng yêu cầu của nhiệm vụ | LEADER | `/leader/tasks/{id}` | `PUT /api/v1/tasks/{id}/skills` |
| **S23** | Nhóm vật tư | MO | `/material-officer/categories` | `GET/POST/PATCH /api/v1/material-categories` |
| **S24** | Danh mục vật tư + lịch sử cấp phát | MO | `/material-officer/materials` | `GET/POST/PATCH /api/v1/materials`, `GET /materials/{id}/allocation-history` |
| **S25** | Tồn kho theo mùa/khu/vật tư | MO | `/material-officer/inventory` | `GET /api/v1/inventory` |
| **S26** | Ghi tồn đầu kỳ | MO | `/material-officer/inventory` → Tồn đầu kỳ | `POST /api/v1/inventory/opening-stock` |
| **S27** | Nhu cầu vật tư theo khu vực | PARISH/COMMUNITY | chi tiết khu → tab Nhu cầu vật tư | `GET/POST /api/v1/work-areas/{id}/material-requirements`, `PATCH /api/v1/material-requirements/{id}` |
| **S28** | Thiếu hụt vật tư theo khu | MO | form tạo yêu cầu mua | `GET /api/v1/work-areas/{id}/shortages` |
| **S29** | Nhu cầu vật tư theo mùa | MO | `/material-officer/material-needs` | `GET /api/v1/seasons/{id}/material-needs` |
| **S30** | Yêu cầu mua: danh sách + tạo nháp | MO | `/material-officer/purchases` | `GET/POST /api/v1/purchase-requests` |
| **S31** | Sửa nháp + gửi duyệt | MO | `/material-officer/purchases` | `PATCH /api/v1/purchase-requests/{id}`, `POST …/{id}/submit` |
| **S32** | Chi tiết đơn + lịch sử trạng thái | MO/LEADER | `/material-officer/purchases/{id}`, `/leader/purchases/{id}` | `GET /api/v1/purchase-requests/{id}`, `GET …/{id}/history` |
| **S33** | Duyệt / từ chối đơn mua | LEADER | `/leader/purchases` | `POST …/{id}/approve`, `POST …/{id}/reject` |
| **S34** | Sidebar: active state, ghi chú role, badge | LEADER/MO | mọi trang | `GET /api/v1/purchase-requests?status=PENDING_APPROVAL` |
| **S35** | Chuông thông báo + trang thông báo | LEADER/MO/COMMUNITY | header + `/leader/notifications` | `GET /seasons/{id}/work-areas`, `GET /purchase-requests?status=PENDING_APPROVAL` |
| **S36** | Phân quyền route theo role | cả 4 role | `/parish`, `/leader`, `/material-officer` | `GET /api/v1/users/me` + `RequireRole` (FE) |

---

## 2. Chi tiết kịch bản

### A. Xác thực & hồ sơ (Identity)

### S1 — Đăng nhập / đăng xuất đúng vai trò
**API:** `POST /api/v1/auth/login`, `GET /api/v1/users/me`, `POST /api/v1/auth/logout`.
**Bước:**
1. Mở `/login`, nhập email/mật khẩu của từng tài khoản (dùng chip demo để tự điền).
2. Kiểm tra URL sau khi đăng nhập: ADMIN → `/parish`; PARISH → `/community`; LEADER → `/leader`; MO → `/material-officer`.
3. Bấm Đăng xuất → quay về `/login`; `grotto-token` và `grotto-refresh-token` trong `localStorage` bị xoá.

**Mong đợi:** đúng 4 nhánh UI khác nhau; tên + role ở header đúng; đã đăng nhập thì không còn request 401
lặp lại; console không lỗi.

### S2 — Sai mật khẩu bị chặn
**API:** `POST /api/v1/auth/login` → 401 `AUTH_INVALID_CREDENTIALS`.
**Bước:** nhập `leader@grottoworks.vn` + `sai-mat-khau` → Đăng nhập.
**Mong đợi:** ở lại `/login`, hiện lỗi "Email hoặc mật khẩu không đúng", **không** vào app, không có token.

### S3 — Đăng ký tài khoản mới
**API:** `POST /api/v1/auth/register`.
**Bước:** mở `/register-account` (alias `/signup`) → nhập họ tên, email mới, mật khẩu → Gửi.
**Mong đợi:** 201, toast thành công, chuyển về `/login`; đăng nhập được bằng tài khoản vừa tạo với role mặc
định của BE. Email trùng → 409 kèm thông báo.
**Lưu ý:** `/register` + `/join` (đăng ký tình nguyện viên) **không** thuộc kịch bản này — FE còn gọi
`POST /registrations` chưa có ở BE (§5).

### S4 — Quên mật khẩu
**API:** `POST /api/v1/auth/password/forgot`.
**Bước:** `/forgot-password` → nhập email → Gửi.
**Mong đợi:** 200/202 (BE không tiết lộ email có tồn tại hay không) → UI hiện thông báo đã gửi hướng dẫn;
nhập email không tồn tại cũng không lộ thông tin.

### S5 — Đặt lại mật khẩu bằng token
**API:** `POST /api/v1/auth/password/reset`.
**Bước:** lấy token reset từ BE (log/mail ở môi trường dev) → mở `/reset-password?token=<token>` → nhập mật
khẩu mới → Gửi.
**Mong đợi:** 200/204, đăng nhập lại được bằng mật khẩu mới; dùng lại token cũ → 400/401 và UI báo lỗi.

### S6 — Hồ sơ cá nhân
**API:** `GET/PATCH /api/v1/users/me`, `PUT /api/v1/users/me/skills`, `PUT /api/v1/users/me/availability`.
**Bước:** đăng nhập → `/profile` → xem thông tin → đổi tên hiển thị + khung thời gian rảnh → Lưu.
**Mong đợi:** phần **đọc** hiện đúng `displayName`/email/role từ BE; phần **Lưu** phải gọi
`PATCH /users/me` (200) và chỉ `PUT /users/me/skills` với tài khoản VOLUNTEER (BE chặn role khác).
**Hiện trạng:** FE gọi `PATCH /users/{id}` (legacy, 404) **trước** nên lần lưu nào cũng báo lỗi → xem §4 – L3.

### B. Giáo xứ – Mùa – Khu vực – Tài khoản (ParishCoordination / Identity)

### S7 — Danh sách mùa
**API:** `GET /api/v1/seasons?size=100`, `GET /api/v1/seasons/{id}`.
**Bước:** đăng nhập từng role → mở `/parish/seasons` hoặc `/community/seasons` → kiểm tra select mùa ở header.
**Mong đợi:** đúng danh sách mùa của BE (năm, trạng thái `PLANNING/READY/ACTIVE/COMPLETED/ARCHIVED`),
thứ tự ưu tiên ACTIVE → READY → PLANNING → COMPLETED → ARCHIVED rồi mới nhất; đổi mùa thì URL ghi
`?season=<id>` và giữ nguyên khi F5.

### S8 — Tạo / sửa mùa
**API:** `POST /api/v1/seasons`, `PATCH /api/v1/seasons/{id}` (`If-Match: "<version>"`).
**Bước:** PARISH → `/parish/seasons` → "Thêm mùa" (năm, ngày bắt đầu/kết thúc, ngân sách, mô tả) → Lưu;
sau đó Sửa tên mùa vừa tạo.
**Mong đợi:** 201 rồi 200, danh sách refresh có mùa mới. Sửa mùa **không** ở `PLANNING` → BE 409, UI hiện lỗi;
version cũ (mở 2 tab) → 412 và UI báo lỗi phiên bản.

### S9 — Chuyển trạng thái mùa
**API:** `POST /api/v1/seasons/{id}/activate` · `/complete` · `/archive` (body `{ version }`).
**Bước:** `/parish/seasons` → "Kích hoạt" một mùa `PLANNING` đã đủ leader + MO cho mọi khu.
**Mong đợi:** 200, trạng thái đổi `ACTIVE` và header cập nhật; nếu còn khu thiếu leader/MO → BE 409 kèm
thông báo, UI hiện lỗi thay vì im lặng.
**N/A:** không chạy `complete`/`archive` trên dữ liệu demo đang dùng cho các kịch bản khác.

### S10 — Khu vực theo mùa
**API:** `GET /api/v1/seasons/{id}/work-areas?size=100`, `GET /api/v1/work-areas/{id}`.
**Bước:** `/parish/areas` (và `/community/areas`) → đổi select mùa → mở chi tiết 1 khu.
**Mong đợi:** chỉ còn khu của mùa đang chọn, URL có `?season=`; số request = số mùa được chọn (không fan-out
thừa); card/bảng hiện đúng trạng thái + trưởng khu + trưởng nhóm vật tư. Khu chưa có tên hiện
`Khu vực #<8 ký tự id>` (BE không trả `name` — không phải lỗi FE).

### S11 — Tạo / sửa khu vực
**API:** `POST /api/v1/seasons/{id}/work-areas`, `PATCH /api/v1/work-areas/{id}` (`If-Match`).
**Bước:** `/parish/areas` → "Thêm khu vực" (mùa đang chọn, tên, mô tả, ngày bắt đầu/hạn) → Lưu; sau đó Sửa tên.
**Mong đợi:** 201/200, khu xuất hiện trong danh sách của đúng mùa; sửa bằng version cũ → 412.
**Không thuộc kịch bản:** nút **Xoá khu vực** — BE chưa có `DELETE /work-areas/{id}` (§4 – L4).

### S12 — Phân công khu vực (cộng đoàn / trưởng khu / trưởng nhóm vật tư)
**API:** tuần tự `PATCH /api/v1/work-areas/{id}` → `PUT …/community` → `PUT …/leader` → `PUT …/material-officer`.
**Bước:** `/parish/areas` → khu vực → "Phân công" → chọn cộng đoàn + trưởng khu + trưởng nhóm vật tư → Lưu.
**Mong đợi:** cả 3 PUT trả 200; tên người được gán hiện đúng trên card/bảng. Một khu vẫn chỉ có 1 leader +
1 MO (BR-06), nhưng cùng một người có thể lãnh nhiều khu (dòng "Bạn đang phụ trách N khu vực" ở dashboard).

### S13 — Cộng đoàn: xem / tạo / sửa
**API:** `GET/POST /api/v1/parishes/{parishId}/communities`, `PATCH /api/v1/communities/{id}` (`If-Match`).
**Bước:** `/parish/communities` → Thêm cộng đoàn (tên, mô tả) → Lưu → Sửa tên.
**Mong đợi:** 201/200, danh sách + số khu vực tính đúng; trùng tên → BE 409, UI hiện lỗi.
**Không thuộc kịch bản:** nút **Xoá cộng đoàn** — BE chưa có `DELETE /communities/{id}` (§4 – L4).

### S14 — Thông tin giáo xứ + tạo giáo xứ
**API:** `GET /api/v1/parishes?size=100`, `GET/PATCH /api/v1/parishes/{id}`, `POST /api/v1/parishes`.
**Bước:** `/parish/communities` → khối Giáo xứ → sửa tên/địa chỉ/điện thoại → Lưu; nếu là ADMIN cấp hệ thống →
tạo giáo xứ mới.
**Mong đợi:** PARISH chỉ thấy giáo xứ của mình, ADMIN thấy danh sách; PATCH 200 với `If-Match` (thiếu/lệch → 400/412);
POST giáo xứ 201 và dữ liệu mới xuất hiện sau khi refresh.

### S15 — Danh mục: loại khu vực + kỹ năng
**API:** `GET/POST/PATCH /api/v1/work-area-categories`, `GET/POST/PATCH /api/v1/skills`.
**Bước:** `/parish/categories` → tab Loại khu vực: thêm + sửa; tab Kỹ năng: thêm + sửa.
**Mong đợi:** 201/200, danh sách refresh ngay; trùng mã/tên → 409.
**Lưu ý:** FE sửa kỹ năng bằng cách đọc lại mảng `GET /skills` rồi lấy `skills[index].id` → vẫn đúng endpoint
nhưng sai nếu danh sách đổi giữa 2 bước (§4 – L5).

### S16 — Quản lý tài khoản
**API:** `GET /api/v1/admin/users?size=100`, `POST /api/v1/admin/users`, `PATCH /admin/users/{id}`,
`POST /admin/users/{id}/lock`, `POST /admin/users/{id}/unlock`, `PUT /admin/users/{id}/role`,
`GET /api/v1/roles`, `GET /api/v1/users?size=100`.
**Bước:**
1. ADMIN → `/parish/accounts`: danh sách tài khoản (ADMIN không đọc được `/users` → FE gọi thẳng `/admin/users`).
2. Tạo tài khoản (email, tên, role, cộng đoàn) → Lưu.
3. Sửa tên/điện thoại → Lưu; Khoá → Mở khoá; Đổi role.
4. Đăng nhập thử tài khoản vừa tạo → đúng nhánh UI của role.
**Mong đợi:** danh sách đúng tài khoản của giáo xứ; tạo/khoá/mở/đổi role đều 200 và refresh ngay; tài khoản bị
khoá đăng nhập → 401/403 kèm thông báo.
**Không thuộc kịch bản:** nút **Xoá tài khoản** — FE gọi `DELETE /users/{id}` (legacy), BE không có (§4 – L4).

### S17 — Dashboard 4 role + chọn mùa
**API:** `GET /api/v1/seasons`, `GET /seasons/{id}/work-areas`, `GET /api/v1/users`,
`GET /api/v1/parishes/{id}/communities` (COMMUNITY/PARISH), `GET /api/v1/purchase-requests` (LEADER/MO).
**Bước:** đăng nhập lần lượt 4 role → mở dashboard tương ứng → đổi mùa ở header.
**Mong đợi:**
- LEADER: "Bạn đang phụ trách N khu vực" + bảng khu của mình; MO: khu mình phụ trách vật tư;
  COMMUNITY: độ phủ leader/MO theo cộng đoàn; PARISH: chọn 1 mùa rồi xem toàn giáo xứ.
- Đổi mùa → số liệu + danh sách đổi theo, không phát sinh request tới mùa khác.
- Chỉ số chưa có API (giờ công, đơn mua theo mùa, checklist) hiện "Chưa có API thống kê…" — **không** hiện số giả.

### C. Nhiệm vụ (TaskExecution)

### S18 — Danh sách + chi tiết nhiệm vụ
**API:** `GET /api/v1/work-areas/{id}/tasks?size=100`, `GET /api/v1/tasks/{id}`.
**Bước:** LEADER → `/leader/tasks` → chọn khu (mặc định khu đầu tiên của mùa) → mở 1 nhiệm vụ; sau đó
COMMUNITY → `/community/areas/{id}/tasks` (chỉ đọc).
**Mong đợi:** danh sách đúng nhiệm vụ của khu + thẻ đếm (tổng/đang làm/hoàn thành); trang chi tiết hiện tên,
mô tả, ưu tiên, hạn, số TNV, kỹ năng, tiêu chí hoàn thành; không 404.
**Điều kiện:** TaskExecution phải có `work_area_scope` của khu (seed ở §0), nếu không `GET /work-areas/{id}/tasks` trả 404.

### S19 — Tạo nhiệm vụ
**API:** `POST /api/v1/work-areas/{id}/tasks`.
**Bước:** `/leader/tasks` → "Thêm nhiệm vụ" → tên, mô tả, giờ dự kiến, số TNV, hạn, kỹ năng, tiêu chí → Lưu.
**Mong đợi:** 201, nhiệm vụ xuất hiện ngay trong danh sách; thiếu tên/giờ không hợp lệ → validate FE chặn trước khi gọi API.

### S20 — Sửa nhiệm vụ
**API:** `PATCH /api/v1/tasks/{id}` với `If-Match: "<version>"`.
**Bước:** `/leader/tasks/{id}` → Sửa → đổi tên/giờ dự kiến/hạn → Lưu.
**Mong đợi:** 200, chi tiết + danh sách cập nhật; version cũ (mở 2 tab) → 412 và UI báo lỗi.

### S21 — Tiêu chí hoàn thành
**API:** `PUT /api/v1/tasks/{id}/completion-criteria`.
**Bước:** `/leader/tasks/{id}` → mục Tiêu chí hoàn thành → Sửa → nhập nhiều dòng → Lưu.
**Mong đợi:** 200, nội dung mới hiển thị đúng; để trống → gửi `null`, BE chấp nhận (không 400).

### S22 — Kỹ năng yêu cầu của nhiệm vụ
**API:** `PUT /api/v1/tasks/{id}/skills` (danh mục lấy từ `GET /api/v1/skills`).
**Bước:** `/leader/tasks/{id}` → mục Kỹ năng → multi-select → Lưu.
**Mong đợi:** 200, chip kỹ năng cập nhật ngay; bỏ chọn hết → gửi `[]` và danh sách rỗng (không lỗi).

**Không thuộc kịch bản:** nút **Xoá nhiệm vụ** (BE chưa có `DELETE /tasks/{id}`) và nút **Bắt đầu làm /
Duyệt hoàn thành** (BE chưa có TaskAssignment/TaskProgress) → xem §4 – L4 và §5.

### D. Vật tư – Mua hàng (Resource)

### S23 — Nhóm vật tư
**API:** `GET/POST/PATCH /api/v1/material-categories`.
**Bước:** MO → `/material-officer/categories` → thêm nhóm (mã, tên, mô tả) → sửa tên.
**Mong đợi:** 201/200, bảng refresh ngay; mã trùng → 409 kèm thông báo.

### S24 — Danh mục vật tư + lịch sử cấp phát
**API:** `GET/POST/PATCH /api/v1/materials`, `GET /api/v1/materials/{id}/allocation-history`.
**Bước:** `/material-officer/materials` → lọc theo nhóm + tìm theo mã/tên → thêm vật tư (mã, tên, đơn vị, nhóm) →
sửa → mở Drawer lịch sử của một vật tư.
**Mong đợi:** danh sách phân trang từ BE; 201/200 khi thêm/sửa; Drawer lịch sử gọi đúng endpoint và hiện empty
state khi vật tư chưa có giao dịch (không 404).

### S25 — Tồn kho
**API:** `GET /api/v1/inventory?page&size&seasonId&workAreaId&materialId&onlyShortage`.
**Bước:** `/material-officer/inventory` → lọc theo mùa/khu/vật tư → tick "Chỉ dòng thiếu" → phân trang.
**Mong đợi:** số liệu tồn/đã cấp/thiếu lấy từ BE; mỗi tổ hợp bộ lọc chỉ phát sinh 1 request; empty state rõ ràng.
**N/A khi** `resource_db.work_area_scope` trống: API 404 `WORK_AREA_NOT_FOUND`, bảng rỗng (§4 – L1).

### S26 — Ghi tồn đầu kỳ
**API:** `POST /api/v1/inventory/opening-stock`.
**Bước:** `/material-officer/inventory` → "Tồn đầu kỳ" → chọn khu + vật tư + số lượng + ngày + ghi chú → Lưu.
**Mong đợi:** 201, toast thành công, bảng tồn kho refresh; số lượng ≤ 0 → validate chặn. Sau đó mở lịch sử vật tư
(`GET /materials/{id}/allocation-history`) → thấy dòng `OPENING_STOCK` vừa ghi.

### S27 — Nhu cầu vật tư theo khu vực
**API:** `GET/POST /api/v1/work-areas/{id}/material-requirements`, `PATCH /api/v1/material-requirements/{id}`.
**Bước:** `/parish/areas` (hoặc `/community/areas`) → khu vực → tab "Nhu cầu vật tư" → thêm dòng (vật tư, số lượng
cần, đã có, ghi chú) → sửa số lượng.
**Mong đợi:** 201/200, tab refresh; `version` lệch → 412.
**Role:** web chỉ mở được từ `/parish/areas` hoặc `/community/areas`; BE cho PARISH/LEADER/MO — dùng tài khoản
MO sẽ phải gọi qua trang khu vực của ban hành giáo (403 nếu gọi trực tiếp bằng token role khác).

### S28 — Thiếu hụt vật tư theo khu
**API:** `GET /api/v1/work-areas/{id}/shortages`.
**Bước:** MO → `/material-officer/purchases` → "Tạo yêu cầu" → chọn khu → kiểm tra danh sách vật tư thiếu.
**Mong đợi:** chỉ hiện vật tư có `shortage > 0`; dòng có `shortage = 0` không chọn được trong form (hoặc phải nhập
"Lý do vượt định mức" trước khi lưu).
**N/A khi** chưa seed scope (L1): danh sách rỗng → không thể tạo đơn.

### S29 — Nhu cầu vật tư theo mùa
**API:** `GET /api/v1/seasons/{id}/material-needs?page&size&workAreaId&materialId`.
**Bước:** `/material-officer/material-needs` → chọn mùa → lọc theo khu/vật tư → phân trang.
**Mong đợi:** bảng đọc đúng `PagedResult` (page/size/totalItems/totalPages), cột khu vực + nhu cầu + thiếu khớp BE,
empty state rõ ràng khi mùa chưa có nhu cầu.

### S30 — Yêu cầu mua: danh sách + tạo nháp
**API:** `GET /api/v1/purchase-requests?workAreaId&status&page&size`, `POST /api/v1/purchase-requests`.
**Bước:** MO → `/material-officer/purchases` → lọc theo khu/trạng thái → "Tạo yêu cầu" → chọn vật tư thiếu +
số lượng + chi phí dự kiến + lý do → Lưu.
**Mong đợi:** danh sách đúng bộ lọc gửi lên BE; POST 201 ở trạng thái **DRAFT** (toast "Đã tạo yêu cầu mua (nháp)");
thẻ thống kê (tổng/nháp/chờ duyệt/đã duyệt) khớp danh sách.

### S31 — Sửa nháp + gửi duyệt
**API:** `PATCH /api/v1/purchase-requests/{id}` (`{ version, reason, items }`), `POST …/{id}/submit`.
**Bước:** mở đơn `DRAFT` → sửa số lượng dòng → Gửi duyệt.
**Mong đợi:** PATCH 200 (items thay thế **toàn bộ** dòng), submit 200 → trạng thái `PENDING_APPROVAL`; đơn đã gửi
không sửa được (BE 409) và UI disable nút Lưu/Gửi.

### S32 — Chi tiết đơn + lịch sử trạng thái
**API:** `GET /api/v1/purchase-requests/{id}`, `GET …/{id}/history`.
**Bước:** từ danh sách bấm mã đơn (MO: `/material-officer/purchases/{id}`, LEADER: `/leader/purchases/{id}`).
**Mong đợi:** đúng khu, người yêu cầu, các dòng vật tư, tổng tiền; lịch sử hiện tối thiểu "tạo → gửi duyệt"
(trống thì empty state, không 404).

### S33 — Duyệt / từ chối đơn mua (LEADER)
**API:** `POST /api/v1/purchase-requests/{id}/approve`, `POST …/{id}/reject`.
**Bước:** LEADER → `/leader/purchases` → đơn `PENDING_APPROVAL` → Duyệt (hoặc Từ chối + lý do).
**Mong đợi:** 200 → trạng thái `APPROVED`/`REJECTED`, danh sách + badge sidebar refresh, badge về 0 khi hết đơn chờ.
**Role:** chỉ LEADER được duyệt (ADMIN/PARISH → 403; trang duyệt vì thế nằm ở `/leader/purchases` — §4 – L2).

### E. Shell – Thông báo – Phân quyền

### S34 — Sidebar: active state, ghi chú role, badge
**API:** `GET /api/v1/purchase-requests?status=PENDING_APPROVAL&size=50` (badge cho LEADER/MO).
**Bước:** đi qua toàn bộ mục sidebar của LEADER và MO.
**Mong đợi:** mỗi thời điểm **chỉ 1 mục** có `aria-current="page"`; cuối sidebar có khung ghi chú mục đích role
(nền `#E8F5E9`); MO thấy badge "Yêu cầu mua" = số đơn chờ duyệt thật từ BE; MO không thấy tab nào của role khác.

### S35 — Chuông thông báo + trang thông báo
**Nguồn dữ liệu:** `GET /api/v1/seasons/{id}/work-areas` + `GET /api/v1/purchase-requests?status=PENDING_APPROVAL`.
BE **chưa có** service Notification nên FE tự suy ra feed từ dữ liệu thật (không gọi `/notifications`, `/activity`).
**Bước:**
1. Mở chuông → xem danh sách (khu được phân công / khu thiếu leader–MO / đơn chờ duyệt).
2. Bấm **Đọc tất cả** → dot đỏ tắt, badge sidebar về 0.
3. Mở `/leader/notifications` → filter Tất cả/Chưa đọc, empty state "Bạn đã đọc hết thông báo".
**Mong đợi:** item khớp dữ liệu BE (vd. khu vừa phân công cho mình phải xuất hiện); F5 vẫn giữ trạng thái đã đọc
(`localStorage` chỉ lưu id đã đọc, không lưu nội dung).

### S36 — Phân quyền route theo role
**API:** `GET /api/v1/users/me` (role + parishId) + `RequireRole` (FE).
**Bước:** LEADER mở `/parish/accounts`; MO mở `/leader`; PARISH mở `/material-officer/materials`.
**Mong đợi:** trang 403 "Không đủ quyền", nút "Về trang chính" đưa đúng dashboard của role; F5 vẫn giữ phiên
(access token hết hạn → tự refresh 1 lần, refresh thất bại → về `/login`).

---

## 3. Kết quả chạy thực tế

> Điền sau mỗi lần chạy. `PASS` / `FAIL` / `N/A` + bằng chứng ngắn.

**Lần chạy:** 2026-10-22, `npm run dev` @ `http://localhost:5175`, BE Docker (gateway `:6102`), dữ liệu seed sẵn của demo parish.

| # | Kết quả | Ghi chú / bằng chứng |
| --- | --- | --- |
| S1 | **PASS** | 4 nhánh đúng: `admin→/parish`, `committee→/community`, `leader→/leader`, `officer→/material-officer`; ghi chú vai trò ở sidebar đúng cho cả 4. |
| S2 | **PASS** | Sai mật khẩu → ở lại `/login`, alert "Email hoặc mật khẩu không đúng", `localStorage['grotto-token']` = null. |
| S3–S6 | — | Chưa chạy. (S6 chắc chắn FAIL ở bước Lưu vì L3.) |
| S7 | **PASS** | Header có 1 select mùa ("2026 — GrottoWorks Demo Season 2026"), trạng thái hiển thị đúng; chỉ có 1 mùa nên chưa kiểm được thứ tự ưu tiên. |
| S8, S9 | — | Chưa chạy (tránh đổi trạng thái dữ liệu demo). |
| S10 | **PASS** | Danh sách khu đúng mùa đang chọn, URL có `?season=`; khu không tên hiện `Khu vực #66666666`. |
| S11–S15 | — | Chưa chạy. |
| S16 | **PASS** | ADMIN `/parish/accounts`: gọi `/api/v1/users?size=100` → **403** rồi fallback `/api/v1/admin/users` → 7 tài khoản (admin, committee, leader, officer, volunteer 1/2, admin.local). Nút Xoá vẫn lỗi → L4. |
| S17 | **PASS** | `/leader`: "Bạn đang phụ trách 2 khu vực", bảng 2 khu, note "Chưa có API thống kê cho trang này (đang chờ Backend)". |
| S18 | **PASS** | `/leader/tasks`: 1 nhiệm vụ, stats 1/0/0/0; chi tiết `bd95f532-…` hiển thị tên, mô tả, "4 giờ", "0/3", hạn 05/12/2026, kỹ năng, tiêu chí. |
| S19–S22 | — | Chưa chạy. |
| S23 | **PASS** | Tạo nhóm `WOODTEST` → 201, toast "Thêm vật tư vào danh mục thành công", bảng 1 dòng. |
| S24 | **PASS** | Tạo vật tư `WOOD-PLANK-2M` → 201, hiện đúng trong danh mục. |
| S25 | **PARTIAL** | `/material-officer/inventory` luôn rỗng vì `resource_db.work_area_scope` trống (L1); lỗi bị ẩn dưới empty state. |
| S26, S27, S28 | — | Chưa chạy. |
| S29 | **PARTIAL** | `/material-officer/material-needs` rỗng cùng nguyên nhân L1. |
| S30 | **PASS** (sau khi seed) | Trước seed: `POST /api/v1/purchase-requests` → **404 `WORK_AREA_NOT_FOUND`**, toast "Có lỗi xảy ra — vui lòng thử lại". Sau seed: tạo nháp `#2E2C51DA`, toast "Đã tạo yêu cầu mua (nháp)". |
| S31 | **PASS** (sau khi seed) | "Gửi duyệt" → trạng thái **Chờ duyệt**; dialog chặn đúng khi thiếu "Lý do vượt định mức" (shortage = 0). |
| S32 | — | Chưa chạy. |
| S33 | **PASS** (sau khi sửa L2) | Trước: trang duyệt nằm ở `/parish/purchases` (ADMIN) → `GET /purchase-requests` **403**. Sau: LEADER `/leader/purchases` có mục "Duyệt mua lớn" + badge; duyệt đơn `97e140e8` → toast "Đã duyệt yêu cầu 97e140e8", badge về 0. |
| S34 | **PASS** | 8 route LEADER, mỗi route đúng 1 `aria-current="page"` khớp `href`; badge "Yêu cầu mua" chỉ hiện với MO. |
| S35 | **PASS** | Badge = 2, panel 2 item, mở panel → dot = 0. Lưu ý thiết kế: mở panel tự đánh dấu đã đọc ≤10 mục nên "Đọc tất cả" **disabled** ngay sau khi mở (đúng chủ đích, dễ hiểu nhầm là lỗi). `/leader/notifications` render 2 mục + filter. |
| S36 | **PASS** | LEADER mở `/parish/accounts` → 403 "Không đủ quyền" + nút "Về trang chính"; F5 vẫn giữ phiên. |

> Các kịch bản trước đây về **Designer 2D / Builder 3D / cảnh báo chưa lưu** đã bị bỏ khỏi tài liệu này vì
> không có API thật — xem §5.

---

## 4. Lỗi & vấn đề phát hiện khi chạy

| # | Mức | Nơi | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| L1 | **BE (blocker)** | Resource service | `resource_db.work_area_scope` **rỗng**: mọi API gắn work-area (`inventory`, `seasons/{id}/material-needs`, `POST /purchase-requests`) trả 404 `WORK_AREA_NOT_FOUND` dù khu vực tồn tại ở ParishCoordination. Nguyên nhân: ParishCoordination chưa publish `planning.work-area.*` / MassTransit consumer chưa chạy; FE bị ẩn lỗi dưới empty state. | Cho MassTransit consumer của Resource chạy, hoặc seed projection (`PUT /internal/work-area-scopes/{id}` với `X-Internal-Api-Key`). FE nên hiện banner "Chưa đồng bộ khu vực sang module vật tư" thay vì empty state. |
| L2 | ~~**FE (blocker)**~~ **ĐÃ SỬA** | `/leader/purchases` vs role | BE: `GET /purchase-requests` chỉ cho `PARISH/LEADER/MO`, `approve`/`reject` **chỉ LEADER**. FE cũ: trang duyệt nằm trong shell ADMIN (`/parish/purchases`) → 403, LEADER không có trang. | ✅ Chuyển `CommitteeApprovalPage` sang `/leader/purchases` + mục sidebar "Duyệt mua lớn" (badge số đơn chờ), link chi tiết dùng prefix theo role; bỏ mục + route `/parish/purchases` (ADMIN) vì BE trả 403. |
| L3 | **FE (cao)** | `/profile` | Lưu hồ sơ gọi `PATCH /users/{id}` (legacy → `/api/users/{id}` = 404) **trước** `PATCH /api/v1/users/me`, nên lần lưu nào cũng báo "Có lỗi xảy ra" và 2 request sau (`PUT /users/me/skills`, `PUT /users/me/availability`) không bao giờ chạy. | Bỏ lời gọi legacy; chỉ dùng `useUpdateMyProfile` + 2 hook `useReplaceMy*`, mỗi cái bọc `try/catch` riêng cho role không phải VOLUNTEER. |
| L4 | **FE (cao)** | Các nút Xoá | BE **không có** endpoint DELETE nào: xoá nhiệm vụ (`DELETE /tasks/{id}`), khu vực, cộng đoàn, tài khoản (`/users/{id}`), kỹ năng (`/skills/{index}`) đều 404. | Ẩn/disable nút tới khi BE bổ sung (gửi trong `BE-gap-requests-activity-flows.md`); các nút này đã được loại khỏi kịch bản (§5). |
| L5 | FE (thấp) | `/parish/categories` | Sửa kỹ năng lấy `skills[index].id` sau một lần `GET /skills` riêng → nếu danh sách đổi giữa 2 bước thì PATCH sai id. | Truyền `id` của skill từ item trong bảng thay vì index; dùng chung một query key `['skills']`. |

---

## 5. Chức năng chưa có API — không nằm trong kịch bản

Các màn hình dưới đây **cố tình bỏ khỏi §1/§2** vì FE chưa có endpoint thật (localStorage/IndexedDB hoặc
còn gọi path legacy không tồn tại ở BE). Khi BE bổ sung endpoint, chuyển mục tương ứng lên §2 thành kịch bản mới.

| Nhóm | Màn hình / nút | Đang dùng | Thiếu ở BE |
| --- | --- | --- | --- |
| Thiết kế 2D/3D | `/leader/areas/:id/design`, `/designer`, `/builder` | `localStorage grotto-designs-v1` + IndexedDB (Builder chỉ gọi `GET /work-areas/{id}/tasks` để liên kết nhiệm vụ) | Design / DesignVersion |
| Bản đồ giáo xứ | `/parish/map`, `/community/map` | `localStorage grotto-parish-map-v1` | Map + pin |
| Đăng ký tình nguyện viên | `/register`, `/join` | `POST /registrations` (legacy) | Registration |
| Duyệt đăng ký TNV | `/leader/regs` | `/volunteerRegs` (legacy) | VolunteerRegistration |
| DS + chi tiết TNV | `/leader/volunteers`, `/community/volunteers`, `…/volunteers/:id` | `/volunteerRegs`, `/timesheets`, `/donations` | Assignment, timesheet |
| Yêu cầu hỗ trợ | `/leader/support`, `/community/support` | `/supportRequests`, `/supportRegs` | SupportRequest |
| Chấm công | `/leader/timesheets` | `/timesheets` | Attendance / Timesheet |
| Checklist | `/leader/checklist`, `/community/checklist` | `/checklists` | Checklist |
| Báo cáo | `/community/reports` | aggregate legacy (`purchaseRecords`, `donations`, `timesheets`, `tasks`, `communities`, `areas`) | Reporting |
| Quyên góp / mượn / cấp phát | `/material-officer/donations`, `/borrowed`, `/allocations` | `/donations`, `/borrowedItems`, `/allocations` | Donation / Borrowed / Allocation |
| Xác nhận mua | `/material-officer/purchases-confirm` | `/purchaseRecords` | Purchase receipt / confirm |
| Giao việc + duyệt hoàn thành | nút "Bắt đầu làm", "Giao TNV", "Duyệt hoàn thành" ở chi tiết nhiệm vụ | mock phía client | TaskAssignment, TaskProgress |
| Hoạt động / sao lưu / điểm thưởng / cài đặt thông báo | `/parish/activity`, `/parish/backup`, `/parish/point-rules`, `/parish/notifications` | `/activity`, `/export/backup`, localStorage | Activity, Backup, PointRule |
| Xoá dữ liệu | nút Xoá khu vực / cộng đoàn / nhiệm vụ / tài khoản / kỹ năng | path không tồn tại | DELETE endpoints (§4 – L4) |
