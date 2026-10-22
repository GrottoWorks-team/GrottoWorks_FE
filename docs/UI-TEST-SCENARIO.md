# Kịch bản kiểm thử UI — GrottoWorks FE (API thật)

**Mục đích:** kiểm tra các luồng nghiệp vụ chính trên FE web khi gọi **API thật** của BE
(`docker compose up -d` trong `GrottoWorks_BE`, gateway `http://localhost:6102`, Vite proxy `/api/v1`).

**Nguyên tắc:**
- Mỗi kịch bản ghi rõ **role**, **màn hình**, **API thật** liên quan, **kết quả mong đợi**.
- Chỉ đánh **PASS** khi thấy dữ liệu thật từ BE (không phải mock/local) và UI không lỗi console.
- Các phần cố tình chưa có BE (support request, borrowed, checklist, activity…) được đánh **N/A** kèm lý do.

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

**Chuẩn bị dữ liệu (bắt buộc với các luồng vật tư):** service Resource và TaskExecution giữ bản
projection `work_area_scope` riêng, hiện **không** được đồng bộ tự động. Trước khi test S7/S11/S12
phải seed thủ công (khoá `INTERNAL_API_KEY` trong `GrottoWorks_BE/.env`):

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
| S1 | Đăng nhập / đăng xuất đúng vai trò | tất cả | `/login` | `POST /api/v1/auth/login`, `GET /api/v1/users/me` |
| S2 | Sai mật khẩu bị chặn | — | `/login` | `POST /api/v1/auth/login` → 401 `AUTH_INVALID_CREDENTIALS` |
| S3 | Dashboard trưởng khu + chọn mùa | LEADER | `/leader` | `GET /seasons`, `GET /seasons/{id}/work-areas`, `GET /users` |
| S4 | Đổi mùa → dữ liệu lọc theo mùa | LEADER | `/leader` | `GET /seasons/{id}/work-areas` |
| S5 | Sidebar: active state, ghi chú role, badge | LEADER/MO | mọi trang | `GET /purchase-requests?status=PENDING_APPROVAL` |
| S6 | Chuông thông báo: feed, Đọc tất cả, badge | LEADER | header + `/leader/notifications` | `GET /work-areas/{id}/tasks`, `GET /purchase-requests` |
| S7 | Danh sách nhiệm vụ thật + chi tiết | LEADER | `/leader/tasks`, `/leader/tasks/{id}` | `GET /work-areas/{id}/tasks`, `GET /tasks/{id}` |
| S8 | Bản thiết kế (review 2D/3D) | LEADER | `/leader/areas/666…/design` | — (FE-only, localStorage) |
| S9 | Designer 2D: thêm cấu kiện, lưu, mở lại | LEADER | `/leader/areas/666…/designer` | — (localStorage) |
| S10 | Builder 3D: đặt item, khoá lớp, tách lớp, liên kết nhiệm vụ, lưu → hiện trong Bản thiết kế | LEADER | `/leader/areas/666…/builder` | `GET /work-areas/{id}/tasks` |
| S11 | Danh mục vật tư / tồn kho / nhu cầu theo mùa | MO | `/material-officer/materials`, `/inventory`, `/material-needs` | `GET /materials`, `GET /inventory`, `GET /seasons/{id}/material-needs` |
| S12 | Yêu cầu mua: danh sách + tạo nháp + gửi duyệt | MO | `/material-officer/purchases` | `GET/POST /purchase-requests` |
| S13 | Duyệt đơn mua (nếu có đơn PENDING) | LEADER | `/leader/purchases` | `POST /purchase-requests/{id}/approve` |
| S14 | Phân quyền route: mở sai nhánh role | LEADER/MO | `/parish`, `/leader` | `RequireRole` (FE) |
| S15 | Quản lý tài khoản | ADMIN/PARISH | `/parish/accounts` | `GET /admin/users` (ADMIN) / `GET /users` (PARISH) |
| S16 | Cảnh báo chưa lưu khi rời Builder | LEADER | `/leader/areas/666…/builder` | — |

---

## 2. Chi tiết kịch bản

### S1 — Đăng nhập / đăng xuất đúng vai trò
**Điều kiện:** BE chạy, có 4 tài khoản test.
**Bước:**
1. Mở `/login`, nhập email/mật khẩu của từng tài khoản (dùng chip demo để tự điền).
2. Kiểm tra URL sau khi đăng nhập: ADMIN → `/parish`; PARISH → `/community`; LEADER → `/leader`; MO → `/material-officer`.
3. Bấm Đăng xuất → quay về `/login`, token trong localStorage bị xoá.

**Mong đợi:** đúng 4 nhánh UI khác nhau; tên + role ở header đúng; không lỗi console.

### S2 — Sai mật khẩu
**Bước:** nhập `leader@grottoworks.vn` + `sai-mat-khau` → Đăng nhập.
**Mong đợi:** hiện lỗi "Email hoặc mật khẩu không đúng", **không** vào app, không có token.

### S3 — Dashboard trưởng khu + chọn mùa
**Bước:** đăng nhập LEADER → `/leader`.
**Mong đợi:**
- Header có **chọn mùa** (mặc định mùa 2026), trạng thái mùa hiển thị đúng (Đang chuẩn bị).
- Thẻ "Khu vực tôi phụ trách" = số khu được gán; bảng khu vực hiện tên/trạng thái/trưởng nhóm vật tư.
- Có ghi chú "Chưa có API thống kê cho trang này (đang chờ Backend)" (đúng thực tế BE).

### S4 — Đổi mùa lọc dữ liệu
**Bước:** tạo thêm 1 mùa (nếu có) rồi đổi select mùa ở header; quan sát danh sách khu vực.
**Mong đợi:** URL có `?season=<id>`; danh sách khu vực chỉ còn khu của mùa đang chọn; không có request tới mùa khác.

### S5 — Sidebar
**Bước:** đi qua các mục sidebar của LEADER và MO.
**Mong đợi:**
- Mỗi thời điểm **chỉ 1 mục** có `aria-current="page"`.
- Cuối sidebar có khung ghi chú mục đích role (nền xanh nhạt).
- Mục "Thông báo" có badge số chưa đọc; MO có badge "Yêu cầu mua" khi có đơn chờ duyệt.

### S6 — Thông báo
**Bước:**
1. Mở chuông → thấy danh sách (khu được phân công / khu thiếu nhân sự / đơn chờ duyệt).
2. Bấm **Đọc tất cả** → dot đỏ tắt, badge sidebar về 0.
3. Mở `/leader/notifications` → có filter Tất cả/Chưa đọc, nút Đọc tất cả, empty state "Bạn đã đọc hết thông báo".

**Mong đợi:** dữ liệu lấy từ `GET /seasons/{id}/work-areas` + `GET /purchase-requests` (không mock), F5 vẫn giữ trạng thái đã đọc.

### S7 — Nhiệm vụ thật
**Bước:** `/leader/tasks` → mở một nhiệm vụ.
**Mong đợi:** danh sách lấy từ `GET /api/v1/work-areas/{areaId}/tasks`; trang chi tiết `GET /api/v1/tasks/{id}` hiển thị tên/mô tả/ưu tiên/hạn/tiêu chí hoàn thành; không 404.

### S8 — Bản thiết kế của khu vực
**Bước:** từ dashboard bấm **Bản thiết kế** → `/leader/areas/666…/design`.
**Mong đợi:** nếu đã có scene builder → hiện khung 3D chỉ-đọc + thanh **Tách lớp** + link "Sửa trong trình dựng"; nút "Gắn vị trí" bị disable cho scene.

### S9 — Designer 2D
**Bước:** mở `/leader/areas/666…/designer` → chọn 1 cấu kiện → Lưu thiết kế → F5.
**Mong đợi:** cấu kiện xuất hiện trên khung vẽ; sau F5 dữ liệu còn (localStorage theo `areaId`); undo/redo hoạt động.

### S10 — Builder 3D
**Bước:**
1. Mở `/leader/areas/666…/builder`.
2. Chọn asset "Khối đá" → click vào khung 3D → item được thêm ("Lớp … có 1 item").
3. Tick nhiệm vụ trong panel "Nhiệm vụ liên kết".
4. Khoá lớp đang chọn → nút Nhân bản/Xoá bị disable.
5. Kéo **Tách lớp** 30–100% → item ở lớp khác nâng lên; bấm "Về như cũ".
6. Bấm **Lưu thiết kế** → F5 → item + task link còn nguyên; `/design` hiện đúng scene.

**Mong đợi:** không crash; transform gốc trong localStorage không đổi khi tách lớp; `taskIds` lưu trên layer.

### S11 — Vật tư / tồn kho / nhu cầu (MO)
**Bước:** mở 3 trang trong menu MO.
**Mong đợi:** mỗi trang gọi API thật và render bảng/empty state đúng; lọc theo mùa/khu vực hoạt động.

### S12 — Yêu cầu mua (MO)
**Bước:** `/material-officer/purchases` → tạo nháp (nếu có vật tư thiếu) → gửi duyệt.
**Mong đợi:** danh sách từ `GET /purchase-requests`; tạo nháp `POST /purchase-requests` (201); gửi duyệt đổi trạng thái `PENDING_APPROVAL`.
**Nếu không có vật tư thiếu:** ghi **N/A** (thiếu dữ liệu nhu cầu vật tư) chứ không đánh FAIL.

### S13 — Duyệt đơn mua
**Bước:** đăng nhập LEADER (BE chỉ cho LEADER approve/reject) → `/leader/purchases` → duyệt đơn vừa gửi.
**Mong đợi:** trạng thái đơn đổi `APPROVED`; danh sách refresh.
**Nếu S12 không tạo được đơn:** N/A.

### S14 — Phân quyền
**Bước:** đang là LEADER → mở `/parish/accounts`; đang là MO → mở `/leader`.
**Mong đợi:** chuyển tới trang 403 ("Không đủ quyền"), nút "Về trang chính" đưa đúng dashboard của role.

### S15 — Quản lý tài khoản
**Bước:** ADMIN → `/parish/accounts`.
**Mong đợi:** danh sách user thật (fallback `/api/v1/admin/users` khi `/users` trả 403); PARISH mở cùng trang bằng `/api/v1/users`.

### S16 — Cảnh báo chưa lưu
**Bước:** ở Builder, thêm item rồi bấm link điều hướng khác.
**Mong đợi:** trình duyệt hiện hộp thoại xác nhận rời trang.

---

## 3. Kết quả chạy thực tế

> Điền sau mỗi lần chạy. `PASS` / `FAIL` / `N/A` + bằng chứng ngắn.

**Lần chạy:** 2026-10-22, `npm run dev` @ `http://localhost:5175`, BE Docker (gateway `:6102`), dữ liệu seed sẵn của demo parish.

| # | Kết quả | Ghi chú / bằng chứng |
| --- | --- | --- |
| S1 | **PASS** | `admin→/parish`, `committee→/community`, `leader→/leader`, `officer→/material-officer`; ghi chú vai trò ở sidebar hiện đúng cho cả 4. |
| S2 | **PASS** | Sai mật khẩu → ở lại `/login`, alert "Email hoặc mật khẩu không đúng", `localStorage['grotto-token']` = null. |
| S3 | **PASS** | `/leader`: "Bạn đang phụ trách 2 khu vực", 1 select mùa ("2026 — GrottoWorks Demo Season 2026"), bảng 2 khu, note "Chưa có API thống kê cho trang này (đang chờ Backend)". |
| S4 | **N/A** | Chỉ có 1 mùa trong hệ thống (`seasonOptions: 1`) nên không thể đổi mùa để so sánh. Cần seed thêm mùa thứ 2 để test. |
| S5 | **PASS** | 8 route LEADER, mỗi route có đúng 1 `aria-current="page"` khớp `href`; badge "Thông báo 2"; badge "Yêu cầu mua" chỉ hiện với MO. |
| S6 | **PASS** | Badge = 2, panel 2 item (mất 1 phần "khu thiếu trưởng nhóm vật tư"), mở panel → dot = 0. Lưu ý thiết kế: mở panel tự mark đã đọc ≤10 mục nên nút "Đọc tất cả" **disabled** ngay sau khi mở (đúng chủ đích, nhưng dễ gây hiểu nhầm là lỗi). Trang `/leader/notifications` render 2 mục + filter "Tất cả/Chưa đọc". |
| S7 | **PASS** | `/leader/tasks`: 1 nhiệm vụ, stats 1/0/0/0; click → `/leader/tasks/bd95f532-…` hiển thị tên, mô tả, "4 giờ", "0/3", hạn 05/12/2026, kỹ năng, tiêu chí, nút "Bắt đầu làm". |
| S8 | **PASS** | `/leader/areas/666…/design`: "Phiên bản 1 · Khu vực #66666666.scene.json", canvas 3D (`role="application"`), slider "Tách lớp" + "Về như cũ", "4/4 lớp đang hiện · 4 lớp · 1 item", nút "Gắn vị trí" **disabled** (đúng: review-only). |
| S9 | **PASS** | Click 1 cấu kiện → "Vật tư (1)"; `localStorage['grotto-design-66666666-…']` được ghi sau "Lưu thiết kế"; reload vẫn "Vật tư (1)". |
| S10 | **PASS** | Builder: chọn "Khối đá" rồi click canvas → "4 lớp · 1 item"; "Lưu thiết kế" → `grotto-designs-v1` có 1 design + 1 version `fileKey: scene:66666666-…`; mở `/design` thấy đúng scene (1 item). |
| S11 | **PARTIAL** | Tạo **danh mục** (`WOODTEST`) và **vật tư** (`WOOD-PLANK-2M`) thành công, toast "Thêm vật tư vào danh mục thành công", bảng 1 dòng. Nhưng `/material-officer/inventory` và `/material-needs` luôn rỗng vì `resource_db.work_area_scope` trống (xem §4 – L1), lỗi bị ẩn dưới empty state. |
| S12 | **PASS** (sau khi seed) | Trước khi seed scope: "Lưu" → toast "Có lỗi xảy ra — vui lòng thử lại", API `POST /api/v1/purchase-requests` → **404 `WORK_AREA_NOT_FOUND`**. Sau khi seed: tạo nháp `#2E2C51DA` (toast "Đã tạo yêu cầu mua (nháp)"), "Gửi duyệt" → trạng thái **Chờ duyệt**. Dialog chặn đúng khi thiếu "Lý do vượt định mức" (shortage = 0). |
| S13 | **PASS** (sau khi sửa L2) | Trước khi sửa: trang duyệt nằm ở `/parish/purchases` (ADMIN) → `GET /purchase-requests` **403**, bảng rỗng. Sau khi chuyển sang `/leader/purchases`: LEADER thấy mục "Duyệt mua lớn" + badge số đơn chờ; tạo đơn `97e140e8` (MO) → "Gửi duyệt" (PENDING) → bấm "Duyệt" → toast "Đã duyệt yêu cầu 97e140e8", danh sách lọc "Chờ duyệt" trống, badge về 0. |
| S14 | **PASS** | LEADER mở `/parish/accounts` → trang 403 "Không đủ quyền" + nút "Về trang chính"; route guard FE hoạt động. |
| S15 | **PASS** | ADMIN `/parish/accounts`: gọi `/api/v1/users?size=100` → **403** rồi fallback `/api/v1/admin/users` → 7 tài khoản (admin, committee, leader, officer, volunteer 1/2, admin.local). Fallback hoạt động đúng thiết kế. |
| S16 | **PASS** | Ở Builder sau khi thêm item thứ 2 ("Cột trụ" → "4 lớp · 2 item"): nhãn "Có thay đổi chưa lưu" + `beforeunload` bị `preventDefault` (dispatch thử event → `defaultPrevented: true`); sau khi "Lưu thiết kế" chuyển thành "Đã lưu". |

---

## 4. Lỗi & vấn đề phát hiện khi chạy

| # | Mức | Nơi | Mô tả | Đề xuất |
| --- | --- | --- | --- | --- |
| L1 | **BE (blocker)** | Resource service | `resource_db.work_area_scope` **rỗng**: mọi API gắn work-area (`inventory`, `seasons/{id}/material-needs`, `POST /purchase-requests`) trả 404 `WORK_AREA_NOT_FOUND` dù khu vực tồn tại ở ParishCoordination. Nguyên nhân: ParishCoordination chưa publish `planning.work-area.*` / MassTransit consumer chưa chạy; FE bị ẩn lỗi dưới empty state. | Cho MassTransit consumer của Resource chạy, hoặc seed projection (`PUT /internal/work-area-scopes/{id}` với `X-Internal-Api-Key`). FE nên hiện banner "Chưa đồng bộ khu vực sang module vật tư" thay vì empty state. |
| L2 | ~~**FE (blocker)**~~ **ĐÃ SỬA** | `/leader/purchases` vs role | BE: `GET /purchase-requests` chỉ cho `PARISH/LEADER/MO`, `approve`/`reject` **chỉ LEADER**. FE cũ: trang duyệt nằm trong shell ADMIN (`/parish/purchases`) → 403, LEADER không có trang. | ✅ Chuyển `CommitteeApprovalPage` sang `/leader/purchases` + mục sidebar "Duyệt mua lớn" (badge số đơn chờ), link chi tiết dùng prefix theo role; bỏ mục + route `/parish/purchases` (ADMIN) vì BE trả 403. |
| L3 | FE (thấp) | `/community` (PARISH) | Không có route duyệt mua: `/community/purchases` → trang 404 chung. | Bỏ link/không dùng, hoặc thêm route nếu BE mở quyền cho PARISH. |
| L4 | ~~FE (thấp)~~ **ĐÃ SỬA** | Builder | `GET /models/manifest.json` → 404 mỗi lần mở Builder. | ✅ Thêm `public/models/manifest.json` với `[]` → không còn request lỗi nào khi mở Builder. |
| L5 | Ghi chú | localStorage | Scene Builder / Designer lưu theo **origin**: dữ liệu tạo ở `:5174` không thấy ở `:5175`. S8 ban đầu "trượt" chỉ vì lý do này, không phải bug. | Ghi vào tài liệu dev; khi lên staging dùng 1 domain cố định. |
