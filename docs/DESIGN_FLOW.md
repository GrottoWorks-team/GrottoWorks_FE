# GrottoWorks — Luồng "Dựng → Review → Giao nhiệm vụ" trên bản thiết kế

**Ngày:** 2026-10-27 · **Phạm vi:** web (`GrottoWorks_FE`) + hợp đồng cần bổ sung ở BE
**Mục đích:** mô tả luồng nghiệp vụ đầy đủ của một bản thiết kế khu vực, và chỉ rõ phần nào đã có – phần nào còn thiếu.

---

## 1. Luồng tổng thể

```text
┌──────────────────────────── DỰNG ────────────────────────────┐
│ Leader mở Trình dựng 3D của khu vực                          │
│   • đặt model theo lớp thi công                               │
│   • ẩn/hiện, khóa lớp, xem tách lớp                           │
│   • lưu scene                                                 │
│        └─► scene (JSON) + hồ sơ Design(THREE_D) + Version     │
│                                                               │
│ (song song) 2D Studio: bố trí mặt bằng 2D + bóc tách BOM      │
│        └─► bản phác thảo 2D (localStorage)                    │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────── REVIEW ───────────────────────────┐
│ Leader / Ban hành giáo mở Bản thiết kế của khu vực            │
│   • xem phiên bản hiện hành (ảnh, .glb, hoặc scene 3D)       │
│   • gắn yêu cầu chỉnh sửa theo vị trí (2D/3D) hoặc tổng quát  │
│   • yêu cầu chỉnh sửa / duyệt phiên bản                       │
│   • tải phiên bản mới; comment cũ giữ nguyên theo phiên bản   │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────── GIAO NHIỆM VỤ THI CÔNG ───────────────────┐
│ Cách 1 (đã có): gắn nhiệm vụ có sẵn vào từng lớp của scene     │
│   • ConstructionLayer.taskIds → TaskExecution                 │
│   • panel lớp hiển thị trạng thái/ưu tiên/hạn của nhiệm vụ    │
│ Cách 2 (chưa có): chuyển yêu cầu review thành nhiệm vụ mới    │
│   • DesignComment.taskId (type đã có, UI/logic chưa có)       │
└───────────────────────────────────────────────────────────────┘
                            ↓
        Thi công theo nhiệm vụ → bằng chứng → nghiệm thu
        (luồng task hiện có của TaskExecution, không đổi)
```

Nguyên tắc: bản thiết kế **không** tự chứng minh công trình đã hoàn thành; tiến độ thi công luôn do module nhiệm vụ quyết định.

---

## 2. Hiện trạng từng bước

| Bước | Tài liệu | Code | Dữ liệu đang lưu | Trạng thái |
|---|---|---|---|---|
| Dựng 3D theo lớp | [spec](../specs/2026-10-27-3d-layer-builder.md) | `src/features/builder` | `localStorage grotto-builder-scene-v1:<areaId>` | ✅ FE-only |
| Dựng 2D + BOM | [spec](../specs/2026-10-15-2d-grotto-designer.md) | `src/features/designer` | `localStorage grotto-design-<areaId>` | ✅ |
| Sinh hồ sơ thiết kế từ scene | builder spec §10 | `builder/designLink.ts` | `localStorage grotto-designs-v1` | ✅ FE-only |
| Review 2D/3D + comment + duyệt | [spec](../specs/2026-10-27-design-review-2d-3d.md) | `src/features/designs` | metadata `localStorage`, file `IndexedDB` | ✅ FE-only |
| Gắn nhiệm vụ vào lớp | builder spec §9 | `builder/components/LayerPanel.tsx` | `layer.taskIds` (chỉ ID) | ✅ dùng API task thật |
| Chuyển yêu cầu review thành nhiệm vụ | review spec §8 | — | — | ❌ chưa có |
| Phân quyền & audit phía server | — | — | — | ❌ chưa có |

---

## 3. Điều kiện để luồng chạy thật (không còn FE-only)

1. **BE có chỗ lưu scene** và trả lại đúng scene đã lưu (kèm `version` để chống ghi đè).
2. **BE có hồ sơ thiết kế + phiên bản + yêu cầu chỉnh sửa** thay `localStore`.
3. **File (ảnh, `.glb`) qua object storage**, không nằm ở IndexedDB người dùng.
4. **Quyền kiểm ở server** theo `work_area_scope` (ai được tạo/duyệt/xóa).
5. **Chuyển comment thành task** qua API TaskExecution, có chống tạo trùng.
6. **Audit** cho duyệt/upload/xóa (dùng `activity_log` của NotificationAudit).

---

## 4. Đề xuất hợp đồng BE tối thiểu

> Đây là đề xuất để chốt phạm vi; **chưa có trong BA v1.2.2 / ERD v3.6.2 / API Contract v1.3.2**. Trước khi BE code phải bổ sung tài liệu (bảng ERD + endpoint trong Contract), nếu không sẽ lặp lại tình trạng FE-only.

| Nhóm | Endpoint đề xuất | Ghi chú |
|---|---|---|
| Scene | `GET`, `PUT /api/v1/work-areas/{workAreaId}/design-scene` | `PUT` cần `If-Match` theo `version`; payload JSON đúng `SCENE_SCHEMA_VERSION` |
| Hồ sơ | `GET`, `POST /api/v1/designs?areaId=` · `PATCH /api/v1/designs/{id}` | 1 area có thể nhiều hồ sơ (2D/3D) |
| Phiên bản | `GET`, `POST /api/v1/designs/{id}/versions` · `PATCH /api/v1/design-versions/{id}` | `PATCH` cho duyệt/yêu cầu chỉnh sửa |
| Yêu cầu | `GET`, `POST /api/v1/design-versions/{id}/comments` · `PATCH`, `DELETE /api/v1/design-comments/{id}` | `taskId` nullable khi chuyển thành nhiệm vụ |
| Upload | `POST /api/v1/files/upload-requests` (signed URL) | Tái dùng cơ chế `file_object` của NotificationAudit nếu có |

**Quyết định cần chốt:** scene và hồ sơ thiết kế thuộc service nào — tạo service `Design` mới, hay mở rộng `TaskExecution`. Tiêu chí: không FK chéo service, không tạo kho dữ liệu song song với `task`.

---

## 5. Danh sách khoảng trống

| ID | Khoảng trống | Owner đề xuất | Sprint |
|---|---|---|---|
| G1 | Không có endpoint scene → bản thiết kế 3D không chia sẻ được | BE (Lâm/Vũ) + chốt phạm vi | S3 |
| G2 | Không có endpoint design/version/comment | BE + chốt phạm vi | S3 |
| G3 | File ở IndexedDB, không backup | BE (object storage) | S4 |
| G4 | Quyền chỉ kiểm ở UI | BE | S3 |
| G5 | "Chuyển yêu cầu thành nhiệm vụ" chưa có | FE (phongnltse) + BE API task | S5 |
| G6 | Audit duyệt/upload chưa có | BE NotificationAudit | S5 |
| G7 | 2D Studio không có liên kết nhiệm vụ | nkhoa31 (nếu chốt nghiệp vụ) | S4 |
| G8 | Bản đồ giáo xứ cũng FE-only, chưa có spec/plan | phongnltse | S2 |
| G9 | BA/ERD/Contract chưa mô tả design & bản đồ | nhóm tài liệu | S2 |
| G10 | Kịch bản test UI chưa phủ 2D/3D (bị loại vì FE-only) | cả hai | S2 |

---

## 6. Cách trình bày khi demo/bảo vệ

- Nói rõ: dựng 3D, review và liên kết nhiệm vụ **đã chạy trên FE**; dữ liệu thiết kế đang lưu cục bộ theo giai đoạn A.
- Nhiệm vụ/nghiệm thu **là dữ liệu thật** từ `TaskExecution` — không phải mock.
- Khoảng trống G1–G4 là phần cần BE bổ sung; đã có đề xuất hợp đồng ở §4.
