# Đặc tả Thiết kế Kỹ thuật: Design Review 2D/3D — Không gian duyệt bản thiết kế theo khu vực

- **Tài liệu**: `docs/specs/2026-10-27-design-review-2d-3d.md`
- **Ngày lập**: 2026-10-27
- **Tác giả**: phongnltse
- **Phân hệ**: GrottoWorks Frontend (`GrottoWorks_FE`)
- **Trạng thái**: Đã thống nhất thiết kế (Validated Design) — FE-only, chờ API của BE
- **Nguồn**: `grottoworks-2d-3d-review-ai-agent-prompt.md` (yêu cầu gốc) + code `src/features/designs`

---

## 1. Bối cảnh & mục tiêu

### 1.1. Bối cảnh

Leader và Volunteer trao đổi phương án thi công qua chat/lời nói, dễ hiểu sai vị trí và yêu cầu. Design Review tập trung **bản vẽ/ảnh tham chiếu/mô hình 3D đã có** của một khu vực vào một chỗ, cho phép gắn yêu cầu chỉnh sửa đúng vị trí, thảo luận và duyệt theo phiên bản.

Đây **không phải** công cụ tạo thiết kế bằng AI: người dùng tự upload file.

### 1.2. Mục tiêu

1. Hồ sơ thiết kế theo `WorkArea`, có nhiều phiên bản file.
2. Review ảnh 2D (marker theo toạ độ chuẩn hoá) và mô hình 3D (marker theo toạ độ model).
3. Yêu cầu chỉnh sửa có tiêu đề, mô tả, ưu tiên, người phụ trách, trạng thái.
4. Duyệt phiên bản / yêu cầu chỉnh sửa theo quyền.
5. Giữ lịch sử phiên bản; comment gắn với **một** phiên bản, không tự chuyển sang phiên bản mới.

### 1.3. Ngoài phạm vi

- Tạo model/ảnh bằng AI; tích hợp Meshy hoặc API tạo 3D trả phí.
- Hệ thống chat riêng cho tính năng review.
- Xác nhận an toàn kỹ thuật hoặc nghi thức làm phép (giữ quy trình nghiệp vụ riêng).

---

## 2. Phạm vi & hiện trạng

| Hạng mục | Hiện trạng |
|---|---|
| UI 2D review, 3D review, comment, version, duyệt | ✅ Đã có |
| Lưu metadata | `localStorage` (`grotto-designs-v1`) — **tạm**, FE-only |
| Lưu file ảnh/`.glb` | IndexedDB (`grotto-blobs-v1`) |
| API `/designs`, `/designVersions`, `/designComments` | ❌ BE chưa có (xem `api-contracts.md` §1.10) |
| Phân quyền | Chỉ kiểm ở UI |

Lý do FE-only: BE (`GrottoWorks_BE`) hiện chỉ có `Identity`, `ParishCoordination`, `Resource`, `TaskExecution`; MSW đã bị gỡ khỏi dự án nên không còn lớp mock HTTP.

---

## 3. Điểm truy cập & route

| Role | Route | Ghi chú |
|---|---|---|
| LEADER | `/leader/areas/:id/design` | Tạo hồ sơ, upload phiên bản, duyệt |
| PARISH | `/parish/areas/:id/design` | Xem + duyệt/yêu cầu chỉnh sửa, không upload |
| COMMUNITY | (chưa đăng ký route) | Page có xử lý prefix `/community` nhưng `App.tsx` chưa khai báo route |

Vào từ thẻ khu vực hoặc từ Builder (`builder.backToDesign`).

---

## 4. Kiến trúc module

| File | Trách nhiệm |
|---|---|
| `config.ts` | Giới hạn file, MIME/đuôi được nhận, hàm `validateImageFile` / `validateModelFile` |
| `coords.ts` | Chuyển toạ độ pixel ↔ chuẩn hoá, xử lý letterbox/crop |
| `position.ts` | Union `ReviewPoint` (2D/3D) + format hiển thị |
| `localStore.ts` | Store tạm `grotto-designs-v1` (designs, versions, comments) |
| `api.ts` | Hook surface (`useDesigns`, `useDesignVersions`, `useDesignComments` + mutations) — hiện gọi `localStore` |
| `components/ImageReviewCanvas.tsx` | Zoom/pan ảnh, marker 2D, click để gắn vị trí |
| `components/ModelReviewCanvas.tsx` | Viewer `.glb`, orbit/fit, marker 3D, raycast chọn điểm |
| `components/CommentFormDialog.tsx` | Tạo/sửa yêu cầu chỉnh sửa |
| `components/NewDesignDialog.tsx`, `UploadVersionDialog.tsx` | Tạo hồ sơ, tải phiên bản mới |
| `pages/DesignReviewPage.tsx` | Trang review: chọn phiên bản, canvas, danh sách yêu cầu, duyệt |

Hook surface được giữ nguyên khi BE bổ sung endpoint: chỉ thay `designStore.*` bằng `api(...)`.

---

## 5. Mô hình dữ liệu

```ts
type DesignType = 'TWO_D' | 'THREE_D'
type DesignVersionStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'
type DesignCommentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'
type DesignCommentPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type DesignPositionType = 'NONE' | 'IMAGE_2D' | 'MODEL_3D'

interface Design {
  id: string; areaId: string; title: string; description?: string
  designType: DesignType; currentVersionId?: string
  createdBy: string; createdAt: string; updatedAt: string
}

interface DesignVersion {
  id: string; designId: string; versionNumber: number
  fileKey: string            // IndexedDB key (hoặc `scene:<workAreaId>` với scene 3D)
  fileName: string; mimeType: string; fileSize: number
  changeNote?: string; status: DesignVersionStatus
  uploadedBy: string; uploadedAt: string
  approvedBy?: string; approvedAt?: string
}

interface DesignComment {
  id: string; designVersionId: string       // luôn gắn MỘT phiên bản
  title: string; description?: string
  priority: DesignCommentPriority; status: DesignCommentStatus
  positionType: DesignPositionType
  position2D?: { x: number; y: number }     // chuẩn hoá 0..1
  position3D?: { x: number; y: number; z: number }
  objectName?: string
  createdBy: string; assignedTo?: string
  taskId?: string                            // nếu đã chuyển thành nhiệm vụ (chưa có UI)
  createdAt: string; updatedAt: string
}
```

Quan hệ: `Design 1-n DesignVersion 1-n DesignComment` (comment không gắn trực tiếp vào Design).

---

## 6. Quy tắc toạ độ

| Loại | Quy tắc | Lý do |
|---|---|---|
| `IMAGE_2D` | Lưu `0..1` theo **ảnh gốc**, quy đổi khi render (tính cả letterbox/crop) | Không lệch khi zoom/resize/mở máy khác |
| `MODEL_3D` | Lưu toạ độ trong hệ toạ độ model của phiên bản đó | Hình học thay đổi giữa các phiên bản |
| Chuyển phiên bản | **Không** tự chuyển toạ độ sang bản mới | Tránh marker chỉ sai vị trí |
| `NONE` | Comment tổng quát, không marker | Góp ý không gắn vị trí |

---

## 7. Kiểm tra file & lưu trữ

| Loại | Giới hạn | Kiểm tra |
|---|---|---|
| Ảnh 2D | 8 MB; `image/png`, `image/jpeg`, `image/webp` | MIME + dung lượng + file rỗng (không tin riêng đuôi) |
| Model 3D | 75 MB; chỉ `.glb` tự chứa | Đuôi + dung lượng + lỗi parse; không tin riêng đuôi |
| `.gltf` | Không nhận | Có thể tham chiếu texture/buffer ngoài, chưa xử lý an toàn |

- Metadata: `localStorage` key `grotto-designs-v1` (tách khỏi `grotto-builder-scene-v1`).
- File: IndexedDB `grotto-blobs-v1` qua `lib/blobStore.ts`.
- Không tự tải/chạy script từ model; coi file upload là dữ liệu không tin cậy.
- Giới hạn áp dụng ở client; **BE phải kiểm lại** khi có endpoint.

---

## 8. Luồng nghiệp vụ

```text
Leader tạo hồ sơ thiết kế (areaId, title, designType)
        ↓
Upload phiên bản (ảnh/.glb) → DesignVersion #1 (DRAFT)
        ↓
Người xem gắn yêu cầu chỉnh sửa (marker 2D/3D hoặc không marker)
        ↓
Leader/Parish: Request changes (CHANGES_REQUESTED) hoặc Approve (APPROVED)
        ↓
Upload phiên bản mới → version #2; comment cũ vẫn thuộc version #1
        ↓
(thủ công) Chuyển yêu cầu thành nhiệm vụ — CHƯA triển khai
```

---

## 9. Phân quyền

| Hành động | LEADER | PARISH | COMMUNITY |
|---|---|---|---|
| Tạo hồ sơ, upload phiên bản | ✅ | ❌ | ❌ |
| Gắn vị trí marker | ✅ | ❌ | ❌ |
| Tạo/sửa/xóa yêu cầu chỉnh sửa | ✅ | ✅ | ✅ (chỉ bình luận) |
| Duyệt / yêu cầu chỉnh sửa | ✅ | ✅ | ❌ |
| Xem | ✅ | ✅ | ✅ (nếu route được mở) |

Chỉ kiểm ở UI. Khi có BE: kiểm quyền theo `work_area_scope`, không tin `userId`/`role`/`approvedBy` từ client.

---

## 10. UI/UX & trạng thái

Bố cục: header (khu vực + breadcrumb + phiên bản) · canvas 2D/3D · panel yêu cầu (lọc theo trạng thái/ưu tiên) · vùng lịch sử phiên bản.

Trạng thái bắt buộc: chưa có thiết kế · đang tải file · đang load ảnh/model · upload thành công/thất bại · file không hợp lệ/quá lớn · chưa có yêu cầu · không có quyền · đang lưu · lỗi kết nối · đang xem phiên bản cũ · phiên bản đã duyệt/chờ chỉnh sửa.

Thuật ngữ UI dùng tiếng Việt: "Bản thiết kế", "Yêu cầu chỉnh sửa", "Đang xử lý", "Đã giải quyết", "Duyệt thiết kế".

---

## 11. Tích hợp với 3D Layer Builder

- Scene do builder lưu xuất hiện như một `DesignVersion` với `fileKey = 'scene:<workAreaId>'`, `mimeType = 'application/json'`.
- Trang review nhận diện qua `isSceneFileKey` và render bằng `ScenePreview` (chỉ đọc).
- Với phiên bản scene: **không cho gắn marker** (nút gắn vị trí bị disable) vì chưa có toạ độ 3D gắn với scene; yêu cầu chỉnh sửa vẫn tạo được dạng `NONE`.

---

## 12. Kiểm thử hiện có

| File | Nội dung |
|---|---|
| `src/features/designs/coords.test.ts` | Quy đổi toạ độ chuẩn hoá ↔ pixel, letterbox |
| `src/features/designs/config.ts` | Hàm validate thuần — **chưa có test riêng** |

Chạy: `npx vitest run src/features/designs`.

---

## 13. Giới hạn & khoảng trống

| ID | Khoảng trống | Ảnh hưởng |
|---|---|---|
| R1 | Không có BE `/designs`, `/designVersions`, `/designComments` | Dữ liệu không chia sẻ giữa máy; mất khi xóa dữ liệu trình duyệt |
| R2 | Phân quyền chỉ ở UI | Bypass được bằng DevTools |
| R3 | Chưa có "chuyển yêu cầu review thành Task" | `DesignComment.taskId` có trong type nhưng không có UI/logic |
| R4 | File ở IndexedDB của một trình duyệt | Không có backup, không có signed URL |
| R5 | Chưa có audit trail cho duyệt/yêu cầu chỉnh sửa | Không truy vết được người duyệt |
| R6 | COMMUNITY chưa có route | Vai trò ban hành giáo chỉ xem được nếu được mở route |

---

## 14. Definition of Done

**Hiện tại (FE-only)**

- [x] Tạo hồ sơ, upload phiên bản ảnh/`.glb`, chuyển phiên bản để xem.
- [x] Marker 2D chuẩn hoá, marker 3D theo model, comment không marker.
- [x] Danh sách yêu cầu có lọc trạng thái/ưu tiên, đổi trạng thái, gán người phụ trách.
- [x] Duyệt/yêu cầu chỉnh sửa theo quyền UI.
- [x] Validate file ảnh/model theo MIME + dung lượng + đuôi.

**Khi có BE**

- [ ] Metadata qua API thật, giữ nguyên hook surface.
- [ ] Phân quyền kiểm ở server theo `work_area_scope`.
- [ ] File qua object storage thật (không dùng IndexedDB).
- [ ] Audit trail cho duyệt/upload.
- [ ] Chuyển yêu cầu chỉnh sửa thành nhiệm vụ qua API TaskExecution (idempotent).

---

## 15. Câu hỏi mở

1. Scene 3D của builder có cần marker 3D theo mesh không, hay chỉ comment tổng quát?
2. Comment có cần thread nhiều lượt không, hay dùng `activity_log` của NotificationAudit?
3. Ai được xóa phiên bản thiết kế đã duyệt (hiện chỉ cho xóa yêu cầu)?
