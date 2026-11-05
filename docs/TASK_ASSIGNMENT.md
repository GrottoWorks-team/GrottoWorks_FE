# GrottoWorks FE — Phân nhiệm vụ & kế hoạch sprint

**Ngày lập:** 2026-10-27 · **Cập nhật:** 2026-10-27
**Team FE:** nkhoa31 · phongnltse · (mobile: chưa chỉ định)
**Khung sprint:** dùng chung khung S0–S9 của BE (`GrottoWorks_BE/plan.md`) — 07/10/2026 → 28/02/2027

> Nguyên tắc: mỗi **module FE** có đúng **một owner** (code + test + tài liệu). Không sửa module của người khác nếu không có PR được người đó review. Mọi thay đổi hình dạng dữ liệu dùng chung phải cập nhật cả web và mobile.

---

## 1. Thành viên & phạm vi

| Thành viên | Vai trò | Module sở hữu | Tài liệu |
|---|---|---|---|
| **nkhoa31** | FE web | 2D Grotto Studio (`src/features/designer`) | [spec](../specs/2026-10-15-2d-grotto-designer.md) · [plan](2026-10-15-2d-grotto-designer.md) |
| **phongnltse** | FE web | 3D Layer Builder (`src/features/builder`), Design Review 2D/3D (`src/features/designs`), Bản đồ giáo xứ (`src/features/map`) | [builder spec](../specs/2026-10-27-3d-layer-builder.md) · [builder plan](2026-10-27-3d-layer-builder.md) · [review spec](../specs/2026-10-27-design-review-2d-3d.md) · [review plan](2026-10-27-design-review-2d-3d.md) |
| **chưa chỉ định** | Mobile (Expo) | Volunteer app (`GrottoWokrs_Mobile`) | `GrottoWokrs_Mobile/PRODUCT.md` |

Phần không thuộc owner nào ở trên (season, area, task, material, purchase, donation, volunteer, timesheet, checklist, report, account) hiện do cả hai cùng làm theo phân công phát sinh; **cần chốt owner cho từng feature** trước S3.

---

## 2. Mã công việc

`FE-<MODULE>-<số>` — ví dụ `FE-BLD-04`.

| Tiền tố | Module |
|---|---|
| `FE-DSN` | 2D Grotto Studio (designer) |
| `FE-BLD` | 3D Layer Builder (builder) |
| `FE-RVW` | Design Review 2D/3D (designs) |
| `FE-MAP` | Bản đồ giáo xứ (map) |
| `FE-INT` | Tích hợp BE / hợp đồng API dùng chung |

---

## 3. Trạng thái hiện tại

| Module | Code | Spec | Plan | Test | BE |
|---|---|---|---|---|---|
| 2D Studio | ✅ (`designer`) | ✅ | ✅ 7 task | ✅ assets/bom/state/canvas | Không cần BE |
| 3D Builder | ✅ (`builder`) | ✅ (mới bổ sung) | ✅ (mới bổ sung) | ✅ scene/serialize/repository/designLink | ⏳ chờ API scene |
| Design Review | ✅ (`designs`) | ✅ (mới bổ sung) | ✅ (mới bổ sung) | ⚠️ chỉ coords | ❌ chưa có endpoint |
| Bản đồ giáo xứ | ✅ (`map`) | ❌ | ❌ | ⚠️ | ❌ chưa có endpoint |

---

## 4. Backlog theo module

### 4.1. FE-DSN — 2D Grotto Studio (owner: nkhoa31)

| ID | Công việc | Sprint | Trạng thái |
|---|---|---|---|
| FE-DSN-01 | Types + 16 cấu kiện chuẩn | S0 | ✅ |
| FE-DSN-02 | BOM engine + xuất CSV | S0 | ✅ |
| FE-DSN-03 | State hook (undo/redo 30 bước, localStorage) | S0 | ✅ |
| FE-DSN-04 | Canvas + bounding box + phím tắt | S1 | ✅ |
| FE-DSN-05 | AssetPalette + InspectorPanel (thuộc tính/BOM) | S1 | ✅ |
| FE-DSN-06 | Toolbar + xuất PNG + trang studio | S1 | ✅ |
| FE-DSN-07 | Nút "Bản thiết kế" trên `AreaCard` + route | S1 | ✅ |

**Còn lại:** không có task mở. Nếu cần gắn nhiệm vụ vào bản vẽ 2D (tương tự builder) thì phải mở task mới + cập nhật spec trước.

> Lưu ý kiểm chứng: plan 2D dự kiến cập nhật `AreaCard.test.tsx` (Task 7, Step 1) nhưng **file này chưa tồn tại** trong repo — cần bổ sung test điều hướng "Bản thiết kế".

### 4.2. FE-BLD — 3D Layer Builder (owner: phongnltse)

| ID | Công việc | Sprint | Trạng thái |
|---|---|---|---|
| FE-BLD-01 | Types + serialize an toàn | S1 | ✅ |
| FE-BLD-02 | Hàm thuần scene + bất biến khóa lớp | S1 | ✅ |
| FE-BLD-03 | Repository localStorage | S1 | ✅ |
| FE-BLD-04 | Hook editor (dirty/save) | S1 | ✅ |
| FE-BLD-05 | Asset catalog + manifest `.glb` | S1 | ✅ |
| FE-BLD-06 | Liên kết nhiệm vụ theo lớp | S1 | ✅ |
| FE-BLD-07 | Canvas + transform + đặt trên nền/bề mặt | S1 | ✅ |
| FE-BLD-08 | Route LEADER + đồng bộ hồ sơ thiết kế | S1 | ✅ |
| FE-BLD-09 | API scene thay localStorage | chờ BE | ⏳ |
| FE-BLD-10 | Asset `.glb` thật + thumbnail | S4 | ⏳ |
| FE-BLD-11 | Hiển thị assignee/tiến độ/nghiệm thu | chờ BE | ⏳ |

### 4.3. FE-RVW — Design Review 2D/3D (owner: phongnltse)

| ID | Công việc | Sprint | Trạng thái |
|---|---|---|---|
| FE-RVW-01 | Validate file + giới hạn cấu hình | S0 | ✅ |
| FE-RVW-02 | Toạ độ chuẩn hoá 2D + `ReviewPoint` | S0 | ✅ |
| FE-RVW-03 | Store tạm + hook surface API | S0 | ✅ |
| FE-RVW-04 | Canvas 2D (zoom/pan/marker) | S1 | ✅ |
| FE-RVW-05 | Canvas 3D (`.glb`, raycast, cleanup) | S1 | ✅ |
| FE-RVW-06 | Comment form + lọc + đổi trạng thái | S1 | ✅ |
| FE-RVW-07 | Hồ sơ + phiên bản + duyệt | S1 | ✅ |
| FE-RVW-08 | Route LEADER/PARISH | S1 | ✅ |
| FE-RVW-09 | Nhận scene từ builder (chỉ đọc) | S1 | ✅ |
| FE-RVW-10 | Route COMMUNITY (chỉ xem + bình luận) | S2 | ⏳ |
| FE-RVW-11 | Chuyển yêu cầu thành nhiệm vụ | chờ BE | ⏳ |
| FE-RVW-12 | Metadata qua API thật | chờ BE | ⏳ |
| FE-RVW-13 | File qua object storage | chờ BE | ⏳ |
| FE-RVW-14 | Audit trail duyệt/upload | chờ BE | ⏳ |

### 4.4. FE-MAP — Bản đồ giáo xứ (owner: phongnltse)

| ID | Công việc | Sprint | Trạng thái |
|---|---|---|---|
| FE-MAP-01 | Viết spec + plan (chuẩn `docs/specs`, `docs/plans`) | S2 | ⏳ |
| FE-MAP-02 | Ảnh mặt bằng + ghim toạ độ khu vực | S2 | ✅ (code) |
| FE-MAP-03 | Metadata qua API thật | chờ BE | ⏳ |

### 4.5. FE-INT — Tích hợp & chất lượng (mỗi người cho phần của mình)

| ID | Công việc | Sprint | Trạng thái |
|---|---|---|---|
| FE-INT-01 | Bổ sung kịch bản test UI cho 2D/3D (hiện bị loại vì FE-only) | S2 | ⏳ |
| FE-INT-02 | Rà `api-contracts.md` §1.10 và chốt phạm vi design với BE | S2 | ⏳ |
| FE-INT-03 | Thêm `AGENTS.md` cho `GrottoWorks_FE` (plan 2D đang tham chiếu nhưng thiếu) | S2 | ⏳ |
| FE-INT-04 | Dọn file rác `.merge-vi.block.txt` ở thư mục dự án | S2 | ⏳ |
| FE-INT-05 | Sửa đường dẫn tài liệu sai (`docs/superpowers/...`, `file:///D:/khoa/...`) | S2 | ⏳ |

---

## 5. Kế hoạch sprint

| Sprint | Thời gian | nkhoa31 | phongnltse | Demo |
|---|---|---|---|---|
| S0 | 07/10 – 18/10/2026 | FE-DSN-01..03, FE-RVW-01..02 (hỗ trợ) | FE-RVW-01..03, FE-RVW-04 (khung) | 2D studio lưu/nạp bản vẽ |
| S1 | 19/10 – 01/11 | FE-DSN-04..07 | FE-BLD-01..08, FE-RVW-04..09 | Dựng 3D theo lớp → lưu thành bản thiết kế → review/duyệt |
| S2 | 02/11 – 15/11 | Rà soát 2D studio, hỗ trợ FE-INT | FE-MAP-01, FE-RVW-10, FE-INT-01..05 | Bản đồ giáo xứ + kịch bản test UI |
| S3 | 16/11 – 29/11 | Task/volunteer web | Rà hợp đồng API design với BE | Luồng tạo task + đăng ký |
| S4 | 30/11 – 13/12 | Nghiệm thu/chấm công | FE-BLD-10 (asset thật) | Dựng công trình bằng model thật |
| S5–S6 | 14/12 – 10/01/2027 | Mua/quyên góp | Tích hợp báo cáo dashboard | Luồng vật tư |
| S7 | 11/01 – 24/01 | Support/readiness | Rà UX toàn hệ thống | Support & readiness |
| S8 | 25/01 – 07/02 | Dashboard + fix bug | Dashboard + fix bug | Báo cáo |
| S9 | 15/02 – 28/02 | Hardening, E2E | Hardening, E2E | Full flow demo |
| 03/2027 | — | Tài liệu, bảo vệ | Tài liệu, bảo vệ | — |

---

## 6. Phụ thuộc BE (blocking)

| Mốc | Cần từ BE | Ai cần | Hạn |
|---|---|---|---|
| API scene 3D | `GET/PUT /api/v1/work-areas/{id}/design-scene` | phongnltse (FE-BLD-09) | S3 |
| API design | `/designs`, `/designVersions`, `/designComments` | phongnltse (FE-RVW-12) | S3 |
| Object storage | Endpoint cấp signed URL upload/tải | phongnltse (FE-RVW-13) | S4 |
| `TaskDto` mở rộng | assignee, progress, trạng thái nghiệm thu | phongnltse (FE-BLD-11) | S4 |
| Task từ comment | API tạo task + lưu `taskId` | phongnltse (FE-RVW-11) | S5 |
| Bản đồ giáo xứ | `/parishMaps` | phongnltse (FE-MAP-03) | S4 |

> Các endpoint design/bản đồ **chưa có trong BA/ERD/API Contract**. Theo `api-contracts.md` §3 mục 8, nhóm phải chốt đưa vào phạm vi (bổ sung bảng + endpoint) hoặc loại bỏ trước khi BE triển khai.

---

## 7. Definition of Done (mỗi task)

- [ ] Test cho logic cốt lõi pass; không giảm coverage của module.
- [ ] `npx tsc -b` và `npm run build` xanh.
- [ ] Không gọi API legacy/mock trong luồng thật; nếu phải FE-only thì ghi rõ trong spec.
- [ ] Trạng thái loading/empty/error được xử lý; không crash khi BE tắt.
- [ ] Cập nhật spec/plan cùng PR nếu hành vi thay đổi.
- [ ] PR có review chéo bởi người còn lại.

---

## 8. Quy ước làm việc

- Branch: `feat/<module>/<task-id>` (ví dụ `feat/builder/FE-BLD-09`).
- Commit: `<type>(<module>): <mô tả>` (ví dụ `feat(builder): them api scene repository`).
- Không push trực tiếp `main`; merge qua PR có review.
- Không commit file build (`dist/`, `*.tsbuildinfo`) hay file rác ở thư mục dự án.

---

## 9. Rủi ro

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Mobile chưa có owner | Không ai chịu trách nhiệm app Volunteer | Chốt người trong S1 |
| Design/bản đồ không có trong BA/ERD | BE không có căn cứ triển khai, FE mãi FE-only | Chốt phạm vi ở FE-INT-02 (S2) |
| Hai người cùng sửa một feature chung | Conflict, mất code | Chốt owner cho feature chưa có chủ ở mục 1 |
| Phụ thuộc BE trễ | FE không demo được luồng thật | Chuẩn bị kịch bản demo FE-only, ghi rõ giới hạn |
