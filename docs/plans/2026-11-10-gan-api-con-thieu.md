# Gắn toàn bộ 79 API còn thiếu vào web — và đồng nhất role FE theo BE

**Ngày lập:** 2026-11-10
**Người lập:** Claude (PM) · **Người làm:** agy (dev)
**Repo được sửa:** chỉ `GrottoWorks_FE`
**Nhánh:** `khoa` · **Worktree Orca:** `fe-api-gap` (mới, tách khỏi `D:\khoa\GrottoWorks_FE`)

---

## 0. Luật bắt buộc

1. Không sửa `GrottoWorks_BE` / `Android` / `Documents` — chỉ đọc.
2. Không bịa DTO: field lấy đúng từ `record ...Dto` trong BE, ghi kèm đường dẫn file khi báo cáo.
3. Không fallback bịa dữ liệu. Lỗi → `errorMessage(err)` (`src/lib/errorMessage.ts`).
4. Không hardcode UUID / ngày / mảng mẫu.
5. **Chỉ gắn route thuộc 4 role web.** Danh sách 18 route VOLUNTEER-only ở mục 2 là **không được đụng**.
6. Commit: `nkhoa31 <276342518+nkhoa31@users.noreply.github.com>`, **không** dòng Co-Authored-By.
7. Mỗi đợt: code → `npm test` → `npm run build` → commit → push `origin khoa` → nhắn PM.
8. UI mới **phải dùng skill** — xem mục 5.

---

## 1. Việc đầu tiên: đồng nhất role FE ↔ BE

Hiện `src/types/index.ts:3` khai báo 4 role, còn BE phát hành 5 code. Chưa có bảng đối chiếu chính thức trong code.

### 1.1. Bảng ánh xạ chốt (Khoa xác nhận 2026-11-10)

| BE (`GrottoWorksRoles`) | Code BE thật | Web `Role` | Route prefix | Ghi chú |
|---|---|---|---|---|
| `Admin` | `ADMIN` | `PARISH` | `/parish/*` | Quản trị cấp hệ thống + giáo xứ |
| `Parish` | `PARISH` | `COMMUNITY` | `/community/*` | Ban điều phối / ban hành giáo |
| `Leader` | `LEADER` | `LEADER` | `/leader/*` | Trưởng khu công tác |
| `MaterialOfficer` | `MO` | `MATERIAL_OFFICER` | `/material-officer/*` | Trưởng ban vật tư |
| `Volunteer` | `VOLUNTEER` | **không có** | `/volunteer` (trang báo) | **Chỉ dùng app mobile** |

### 1.2. Việc cần làm

Tạo `src/lib/roleMapping.ts` thay cho logic rải rác trong `auth.tsx`:

```ts
/** Role code BE → role giao diện web. Xem docs/plans/2026-11-10-gan-api-con-thieu.md §1. */
export const BE_TO_WEB_ROLE = {
  ADMIN: 'PARISH',
  PARISH: 'COMMUNITY',
  LEADER: 'LEADER',
  MO: 'MATERIAL_OFFICER',
} as const satisfies Record<string, Role>

/** BE role gửi lên quyền cho route này không? (dùng khi ẩn/hiện nút) */
export function beRoleCanAccess(beRole: string, allowed: readonly string[]): boolean
```

- `normalizeRole()` trong `auth.tsx` phải dùng bảng này, **giữ nguyên hành vi** hiện tại (có test).
- Thêm `VOLUNTEER` vào danh sách role BE nhưng **không** thêm vào `Role` của web.
- Viết `roleMapping.test.ts`: khoá đủ 5 mã BE + mã lạ.

**Tiêu chí xong:** `normalizeRole('MO')==='MATERIAL_OFFICER'`, `normalizeRole('ADMIN')==='PARISH'`, `normalizeRole('PARISH')==='COMMUNITY'`, `normalizeRole('VOLUNTEER')` không trả role web hợp lệ để render, test xanh.

---

## 2. 18 route KHÔNG được gắn vào web (VOLUNTEER-only)

Đây là của app mobile. **Không lập UI, không gọi API, không tính vào "còn thiếu".**

```
POST /api/v1/attendance-requests/{id}/cancel
POST /api/v1/attendance/{id}/correction-requests
POST /api/v1/donations/material-pledges
POST /api/v1/donations/monetary-pledges
POST /api/v1/purchase-requests/{id}/purchases
POST /api/v1/purchases/{id}/receipts
POST /api/v1/task-assignments/{id}/accept
POST /api/v1/task-assignments/{id}/attendance/check-in-requests
POST /api/v1/task-assignments/{id}/attendance/check-out
POST /api/v1/task-assignments/{id}/decline
POST /api/v1/tasks/{id}/progress
POST /api/v1/tasks/{id}/resubmit
POST /api/v1/tasks/{id}/submit
GET  /api/v1/users/me/assignments
GET  /api/v1/users/me/attendance-requests
GET  /api/v1/users/me/contributions
GET  /api/v1/users/me/recognition
GET  /api/v1/users/me/tasks
```

> Ngoại lệ: tài khoản `volunteer.demo` vẫn giữ trong seed để `curl` kiểm chứng, nhưng **không** sinh màn hình trong `src/features/`.

---

## 3. 79 route còn thiếu, chia 9 đợt

Sắp theo **giá trị nghiệp vụ** (route đang chặn luồng làm việc thật lên trước) và **số lượng**.

### Đợt A — Nhiệm vụ: duyệt & nghiệm thu (11 route, role LEADER)
Chặn luồng chính: trưởng khu hiện **không duyệt được** nhiệm vụ.

| Endpoint | Role |
|---|---|
| `GET /tasks/{id}/applications` | Leader |
| `POST /tasks/{id}/approve` | Leader |
| `GET /tasks/{id}/assignments` | Leader |
| `POST /tasks/{id}/cancel` | Leader |
| `GET /tasks/{id}/material-reports` | Leader, MO |
| `GET /tasks/{id}/materials` | Leader |
| `POST /tasks/{id}/request-revision` | Leader |
| `GET /tasks/{id}/review-package` | Leader |
| `PUT/DELETE /tasks/{id}/team-leader` | Leader |
| `GET /tasks/{id}/volunteer-matches` | Leader |
| `GET /tasks/{id}/progress/{pid}/evidence/{eid}/download-url` | mọi role đăng nhập |
| `POST /task-applications/{id}/approve` | Leader |
| `POST /task-applications/{id}/reject` | Leader |

**UI:** mở rộng `src/features/tasks/pages/TaskDetailPage.tsx` — hiện có 1 nút "chờ Backend", thay bằng bảng ứng viên + nút duyệt/từ chối + nút gán trưởng nhóm + nút duyệt hoàn thành/yêu cầu làm lại.

### Đợt B — Kiểm tra điều kiện (9 route, LEADER/parish/MO)
`readiness-checks/*` — FE gọi **0** route, trong khi đây là bước bắt buộc trước khi kích hoạt mùa.

| Endpoint | Role |
|---|---|
| `GET /readiness-checks/{id}` | Leader, MO, Parish |
| `POST /readiness-checks/{id}/confirm` | Leader |
| `GET/PUT /readiness-checks/{id}/items` | Leader |
| `PUT /readiness-checks/{id}/items/{iid}` | Leader |
| `PUT /readiness-checks/{id}/items/{iid}/corrective-task` | Leader |
| `POST /readiness-checks/{id}/items/{iid}/evidence` | Leader |
| `GET .../evidence/{eid}/download-url` | mọi role |
| `POST /readiness-checks/{id}/items/{iid}/recheck` | Leader |
| `POST /readiness-checks/{id}/reopen` | Leader, Parish |

**UI:** trang mới `src/features/readiness/pages/ReadinessPage.tsx` + route `/leader/readiness/:checkId`, `/parish/readiness/:checkId`.

### Đợt C — Mùa & bảng điều khiển (6 + 3 route)
| Endpoint | Role |
|---|---|
| `POST /seasons/{id}/activate` | Admin, Parish |
| `POST /seasons/{id}/complete` | Admin, Parish |
| `POST /seasons/{id}/archive` | Admin, Parish |
| `GET /seasons/{id}/contribution-needs` | mọi role |
| `GET /seasons/{id}/readiness` | Leader, MO, Parish |
| `GET /seasons/{id}/support-summary` | Parish |
| `GET /dashboards/season?seasonId=` | Parish |
| `GET /dashboards/work-area?workAreaId=` | Leader |
| `GET /dashboards/materials` | MO |

**UI:** nút Kích hoạt/Hoàn thành/Lưu trữ trên `SeasonListPage`; 3 dashboard dùng `StatCard` + `DataTable` sẵn có.

### Đợt D — Mua sắm (8 route)
| Endpoint | Role |
|---|---|
| `POST /purchases/{id}/confirm-delivery` | MO |
| `POST /purchases/{id}/request-info` | MO |
| `POST /purchases/{id}/approve-cost-overrun` | Leader |
| `GET /purchases/{id}/receipts/{rid}/download-url` | mọi role |
| `GET /purchase-requests/{id}/purchase-tasks` | Leader |
| `POST /task-material-reports/{id}/verify` | MO |
| `POST /task-material-reports/{id}/request-revision` | MO |

**UI:** `PurchaseDetailPage` (đã có) + bảng báo cáo vật tư nhiệm vụ.

### Đợt E — Hỗ trợ liên khu (5 route)
`support-requests/{id}/publish|close`, `support-response-members/{id}/approve|reject`, `support-response-materials/{id}/approve|reject|confirm-receipt`.

**UI:** `SupportListPage` (đã có bảng) + drawer chi tiết.

### Đợt F — Chấm công duyệt (4 route)
`work-areas/{id}/attendance-requests`, `work-areas/{id}/attendance-corrections`, `attendance-requests/{id}/approve|reject`, `attendance-corrections/{id}/approve|reject`, `attendance/open-sessions`.

### Đợt G — Quản trị người dùng (4 route, ADMIN→PARISH)
`PATCH /admin/users/{id}`, `PUT /admin/users/{id}/role`, `POST /admin/users/{id}/lock`, `POST /admin/users/{id}/unlock`.
**UI:** `AccountsPage` đã có — thêm sửa/khoá/đổi role.

### Đợt H — File & xuất dữ liệu (4 + 3 + 1 route)
`files/upload-requests`, `files/{id}`, `files/{id}/complete`, `files/{id}/download-url`; `report-exports*`; `system-data-exports`.
**UI:** component dùng chung `src/components/shared/FileUploadButton.tsx` — upload 3 bước (xin URL → PUT → complete), tuân đúng luồng BE.

### Đợt I — Còn lại (kho nhỏ, gom một đợt)
`GET /backups`, `GET /backups/{id}`, `PATCH/DELETE /notification-rules/{id}`, `GET /activity-logs/{id}`, `GET /resource-history/{type}/{id}`, `GET /users/me/notification-preferences`, `PATCH /donors/{id}`, `POST /inventory-adjustments`, `POST /borrowed-items/{id}/incidents`, `POST /donations/{id}/receipts`, `PUT /contribution-types/{id}`, `POST /recognition-rules/{id}/deactivate`, `GET/PUT /work-areas/{id}/progress`, `GET /work-areas/{id}/readiness-checks`.

---

## 4. Quy tắc gắn API

1. **DTO trước, UI sau.** Đọc `record XxxDto` trong `Services/<Service>/...Application/`, chép đúng tên field (camelCase hoá ở FE).
2. **Mapper riêng.** DTO → domain type trong `src/features/<x>/mappers.ts`, không map tay trong page (theo mẫu `src/features/parish/mappers.ts`).
3. **Paging.** Route trả `PagedResponse` (`{data, page:{page,size,totalItems,totalPages}}`) — **không** dùng `api<T[]>()` cho route này, phải dùng kiểu có `page`.
4. **If-Match.** Route có `Version` trong DTO (task, purchase, season, support…) phải gửi `If-Match: "<version>"` khi PUT/PATCH. Thiếu → 412.
5. **Idempotency-Key.** Mọi `POST` tạo mới phải sinh UUID v4 và gửi header `Idempotency-Key`.
6. **Không nuốt lỗi.** Mỗi catch dùng `errorMessage(err)`; 403 phải hiện "không đủ quyền", không hiện "lỗi chung".

---

## 5. Dùng skill khi làm UI (BẮT BUỘC)

| Việc | Skill |
|---|---|
| Trang mới, drawer, bảng, empty state | `impeccable` |
| Design token / bảng màu / thang chữ | `design-system` hoặc `ui-ux-pro-max` |
| Chart trong dashboard | `dataviz` |
| Component shadcn (dialog, dropdown, table) | `ui-styling` |
| Rà soát UI trước khi báo xong | `ponytail-review` + hook `impeccable detect` |

**Quy tắc:** mỗi lần tạo file `.tsx` mới, chạy
```bash
C:/Users/phucn/.claude/skills/impeccable/scripts/impeccable detect --json <file>
```
phải ra `0` finding. Không đạt thì sửa, không ignore.

---

## 6. Thứ tự & mốc kiểm

```
Đợt 0  role mapping + roleMapping.test.ts        ← PHẢI trước mọi thứ
Đợt A  tasks (11)         ← ưu tiên cao nhất
Đợt B  readiness (9)
Đợt C  seasons + dashboards (9)
Đợt D  purchases (8)
Đợt E  support (5)
Đợt F  attendance duyệt (4)
Đợt G  admin users (4)
Đợt H  files + exports (8)
Đợt I  phần lẻ (16)
```

Mỗi đợt xong agy phải: `npm test` + `npm run build` + ảnh E2E khoanh đỏ **riêng cho từng endpoint** (theo `SKILL.md` mục "MẪU BÁO CÁO CHUẨN") + nhắn PM bằng `orca terminal send`.

---

## 7. Rủi ro đã biết

- **`GET /tasks/{id}/progress/.../download-url`** — file nằm trên MinIO/R2. Guide BE cảnh báo URL có thể trỏ `localhost:9000`. Khi E2E phải kiểm URL thật; hỏng thì báo BE, **không tự đổi URL**.
- **`POST /backups`, `system-data-exports`** — chỉ ADMIN. Tài khoản demo `parish.demo` là PARISH, nên **phải đăng nhập bằng `admin@grottoworks.local`** mới test được.
- **`PUT /tasks/{id}/team-leader`** — route mới nhất (commit `74d80a8`). Gateway đã route nhưng chưa có UI; đây là tính năng mới hoàn toàn.
- **Paged vs Api** — nhầm envelope sẽ ra `undefined.map`. Test bằng `curl` trước khi viết UI.
