# Báo cáo đối chiếu FE ↔ tài liệu nghiệp vụ

**Ngày:** 2026-11-03 · **Phạm vi:** `GrottoWorks_FE` (web) + môi trường BE docker cục bộ
**Nguồn đối chiếu:** `GrottoWorks_4_Workflows_De_Doc.md`, `GrottoWorks_Cam_Nang_Luong_Nghiep_Vu_Chi_Tiet.md`, `BE-gap-requests-activity-flows.md`, `docs/UI-TEST-SCENARIO.md`

---

## 1. Kết luận

Trước đợt sửa, **12 module FE còn gọi endpoint legacy `/api/*`** (thời MSW mock) — đã kiểm chứng 10/10 path trả **404**. Sau đợt sửa:

- **9/9 nhóm chức năng** đã nối API thật hoặc xử lý graceful.
- Không còn lời gọi API legacy nào trong `src/features/*/api.ts` (ngoại trừ các chuỗi không phải endpoint).
- Phần còn thiếu **đều do BE chưa có endpoint**, không phải lỗi FE.

---

## 2. Kiểm chứng

| Hạng mục | Kết quả |
|---|---|
| `npm run lint` (`tsc -b`) | ✅ sạch |
| `npm test` | ✅ 130/130 test, 36 file |
| Endpoint legacy | ✅ không còn |

Endpoint đã kiểm tra trực tiếp qua gateway `http://localhost:6102`:

| Endpoint | Kết quả |
|---|---|
| `GET /api/v1/seasons/{id}/readiness` | 200 (4 khu) |
| `GET /api/v1/reports/tasks` · `/materials` | 200 |
| `GET /api/v1/dashboards/season` | 200 |
| `GET /api/v1/work-areas/{id}/attendance-requests` · `/attendance-corrections` · `/working-hours` | 200 |
| `GET /api/v1/loan-offers` · `/borrowed-items` | 200 |
| `GET /api/v1/purchase-requests` · `/{id}` | 200 (có `purchases`) |
| `GET /api/v1/support-requests` | 200 |
| `GET /api/v1/activity-logs` (ADMIN) | 200 |

---

## 3. Các module đã sửa

| # | Module | Trước | Sau |
|---|---|---|---|
| 1 | Cấp phát vật tư | `/allocations` (404), tự tính khả dụng từ `material.received` (=0) | `GET/POST /api/v1/material-allocations`; khả dụng lấy từ `/api/v1/inventory.unallocated` |
| 2 | Quyên góp | `/donations` (404), “đã nhận” là số tổng | `material-pledges`, `monetary-pledges`, `{id}/receipts` (phần tăng), `{id}/cancel`; donor do BE tự gán |
| 3 | Support request | `/supportRequests`, `/supportRegs` (404), form thiếu vị trí/vật tư | `GET/POST /api/v1/support-requests`, `GET/PATCH /{id}`; form có positions + materials; ẩn phần regs vì BE chưa có |
| 4 | Checklist | `/checklists` (404), toggle `done` | Toàn bộ readiness: `seasons/{id}/readiness`, `work-areas/{id}/readiness-checks`, `items`, `recheck`, `confirm`, `reopen` |
| 5 | Mua hàng / nhập kho | `/purchaseRequests`, `/purchaseRecords` (mock) | `confirm-delivery`, `request-info`, `approve-cost-overrun`; card “Các lần mua” trong chi tiết đề nghị |
| 6 | Chấm công | `/timesheets` (404) | `attendance-requests` (duyệt/từ chối), `attendance-corrections`, `working-hours` |
| 7 | Đồ mượn | `/borrowedItems` (404) | `loan-offers` (accept/reject), `borrowed-items/{id}/issue|return|incidents` |
| 8 | Báo cáo | Gộp 6 endpoint legacy | `GET /api/v1/reports/{tasks|materials|purchases|contributions|attendance|readiness}`, render động theo `ReportDataDto` |
| 9 | Đăng ký TNV / landing | `POST /registrations`, `/volunteerRegs` (404) | Không gọi mạng; hiển thị thông báo “chờ BE bổ sung API” (giữ route, không còn xác nhận giả) |

Phụ trợ: `useActivityLogs` chuyển sang `/api/v1/activity-logs`; xoá `CorrectionDialog`, `TimesheetFormDialog`, `BorrowFormDialog`, `RecognitionBoard` (mock/orphan).

---

## 4. Sửa môi trường (không phải source)

1. **Gateway**: image cũ (30/10 00:01) thiếu **51/74 route** → mọi path mới trả 404 rỗng. Đã rebuild.
2. **Projection `work_area_scope`**: `readiness_db` = 0, `reporting_db` = 0, `resource_db` = 1, `task_db` = 1 dòng.
   Đã đồng bộ thủ công **5 season + 7 work-area** vào TaskExecution, Resource, Readiness, Reporting (dùng `X-Internal-Api-Key`). Hiện cả 4 DB = **7 dòng**.
   > Lưu ý charset: gửi tên tiếng Việt phải dùng UTF-8 (`application/json; charset=utf-8`), nếu không BE trả 400 `INVALID_REQUEST_BODY`.
3. **Migration `task_db`**: container mới có `PendingModelChangesWarning` nên `MigrateOnStartup` dừng; đã áp script idempotent (13/13 migration). Xem mục 7.

---

## 5. Còn thiếu — do BE chưa có endpoint

| Luồng | Endpoint còn thiếu | Ảnh hưởng FE |
|---|---|---|
| Giao việc cho TNV | `POST /tasks/{id}/assignments`, `/task-assignments/{id}/accept|decline` | Không có UI giao việc (đã bỏ nút) |
| Ứng tuyển việc | `POST /tasks/{id}/applications`, `/task-applications/{id}/approve|reject` | Không có UI duyệt ứng tuyển |
| Tiến độ & nghiệm thu | progress / submit / approve / revision | Task chỉ tới `NOT_STARTED` |
| Support nâng cao | publish, respond, approve member, offer vật tư, confirm receipt | Yêu cầu dừng ở `PLANNING` |
| VolunteerRegistration | `POST /registrations`, `/volunteer-registrations` | Trang duyệt ĐK TNV + form landing chỉ hiện thông báo |
| Season READY | API `ACTIVE → READY` | Nút “Hoàn tất mùa” bị disable |
| Task PURCHASE | tạo task mua từ PR đã duyệt | Chưa có UI tạo việc mua |
| Backup | `/export/backup` | Nút xuất JSON bị disable |

---

## 6. Việc FE cần làm khi BE bổ sung

1. Giao việc/ứng tuyển: bảng assignment + application trong `TaskDetailPage`, dùng capacity đã dự trữ.
2. Progress/nghiệm thu: timeline `task_progress` + duyệt `SUBMITTED → COMPLETED|REVISION_REQUIRED`.
3. Support: màn trả lời (positions/materials), duyệt member, xác nhận nhận vật tư.
4. VolunteerRegistration: bật lại form landing + trang `/leader/regs`.
5. Backup: bật nút khi có `/export/backup`; hoặc dùng `POST /api/v1/report-exports` (Reporting) cho XLSX/PDF.
6. Season READY: bật `completeSeason` khi có API chuyển trạng thái.

---

## 7. Ghi chú vận hành

- Sau khi pull code mới, **phải rebuild image** (`docker compose up -d --build <service>`); image cũ hơn source là nguyên nhân gốc của cả 404 route và 404 scope.
- **Nợ kỹ thuật BE:** `TaskExecution` đang có *pending model changes* (`dotnet ef migrations has-pending-model-changes` báo lỗi). Trên máy sạch, `MigrateOnStartup` sẽ fail và API task trả 500 cho tới khi thêm migration + cập nhật snapshot.
- Đồng bộ scope hiện là **thủ công**. Giải pháp bền: mở rộng `TaskScopeSync` của ParishCoordination cho nhiều đích, hoặc cho 3 service kia consume event `planning.work-area.*`.

---

## 8. Chạy lại kiểm chứng

```powershell
cd GrottoWorks_FE
npm run lint
npm test
```

Kiểm tra nhanh không còn endpoint legacy:

```powershell
Get-ChildItem src/features -Recurse -Filter api.ts |
  Select-String -Pattern "['`"](/[A-Za-z][^'`"]*)['`"]" -AllMatches |
  ForEach-Object { $_.Matches } |
  ForEach-Object { $_.Groups[1].Value } |
  Where-Object { $_ -notmatch '^/api' } |
  Sort-Object -Unique
```
