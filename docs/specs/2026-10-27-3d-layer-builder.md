# Đặc tả Thiết kế Kỹ thuật: 3D Layer Builder — Trình dựng công trình theo lớp

- **Tài liệu**: `docs/specs/2026-10-27-3d-layer-builder.md`
- **Ngày lập**: 2026-10-27
- **Tác giả**: phongnltse
- **Phân hệ**: GrottoWorks Frontend (`GrottoWorks_FE`)
- **Trạng thái**: Đã thống nhất thiết kế (Validated Design) — giai đoạn A đã triển khai
- **Nguồn**: `grottoworks-3d-layer-builder-task-management.md` (yêu cầu gốc ở thư mục dự án) + code `src/features/builder`

---

## 1. Bối cảnh & mục tiêu

### 1.1. Bối cảnh

Trước tính năng này, một khu vực công tác (`WorkArea`) chỉ có dữ liệu dạng chữ và danh sách task. Ban hành giáo và Trưởng khu vực không có nơi bố trí công trình (hang đá, cây thông, hệ đèn) để thống nhất phương án với nhóm thi công.

3D Layer Builder cho phép lắp ghép công trình từ các model có sẵn, chia công trình thành **lớp thi công**, và **liên kết mỗi lớp với nhiệm vụ thật** trong `TaskExecution` — không tạo hệ quản lý nhiệm vụ song song.

### 1.2. Mục tiêu

1. Đặt model vào scene 3D, di chuyển/xoay/scale, nhân bản, xóa.
2. Quản lý lớp thi công: thêm, đổi tên, sắp xếp, ẩn/hiện, khóa/mở khóa, xem riêng một lớp.
3. Liên kết lớp với nhiệm vụ hiện có (chỉ lưu ID tham chiếu).
4. Lưu/mở lại thiết kế mà không phải tải lại toàn bộ model.
5. Scene đã lưu **chính là bản thiết kế của khu vực**, hiển thị và duyệt được ở trang Bản thiết kế.

### 1.3. Ngoài phạm vi

- Tạo model 3D bằng AI hoặc dịch vụ trả phí.
- Tự động tách model thành "mái", "khung", "đá".
- Mô phỏng kết cấu, tải trọng, va chạm nâng cao, physics engine.
- Tạo nhiệm vụ mới trong builder (chỉ liên kết nhiệm vụ có sẵn).

---

## 2. Phạm vi theo giai đoạn

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **A** | Editor đầy đủ + lưu `localStorage` + asset demo + liên kết task chỉ đọc | ✅ Đã xong |
| **B** | Thay `SceneRepository` bằng API, phân quyền server, asset `.glb` thật, hiển thị assignee/tiến độ/nghiệm thu | ⏳ Chờ BE |

Ranh giới lưu trữ được cô lập trong `SceneRepository` ([repository.ts](../../src/features/builder/repository.ts)) nên chuyển sang API không phải sửa logic scene/layer/transform.

---

## 3. Điểm truy cập & route

| Role | Route | Page | Ghi chú |
|---|---|---|---|
| LEADER | `/leader/areas/:id/builder` | `BuilderPage` | Route duy nhất đang mở |
| PARISH / COMMUNITY | — | — | Chưa đăng ký route; page chỉ dành cho người sửa thiết kế |

Khai báo tại [App.tsx](../../src/App.tsx) trong bảng `DYNAMIC`. Từ builder có lối quay về trang Bản thiết kế của cùng khu vực (`builder.backToDesign`).

---

## 4. Kiến trúc module

Feature độc lập tại `src/features/builder/`, tuân thủ tách lớp: dữ liệu thuần → lưu trữ → hook → UI.

| File | Trách nhiệm |
|---|---|
| `types.ts` | Kiểu dữ liệu scene/layer/item/asset + `SCENE_SCHEMA_VERSION` |
| `scene.ts` | Hàm thuần bất biến trên `ConstructionScene` (không DOM, không storage, không three.js) |
| `serialize.ts` | `serializeScene` / `deserializeScene` + `SceneFormatError` |
| `repository.ts` | `SceneRepository` interface + `LocalSceneRepository` (localStorage) |
| `useBuilderScene.ts` | State editor: scene, selection, mode, dirty, save; gọi repository |
| `assets.ts` | Catalog asset: primitive demo + manifest `.glb` |
| `designLink.ts` | Upsert `Design`/`DesignVersion` từ scene sau khi lưu |
| `components/BuilderCanvas.tsx` | Render three.js, chọn/transform/đặt item |
| `components/AssetLibrary.tsx` | Danh mục asset, kéo hoặc chọn để đặt |
| `components/LayerPanel.tsx` | Danh sách lớp, item trong lớp, liên kết nhiệm vụ |
| `components/ScenePreview.tsx` | Chế độ xem chỉ đọc, dùng lại ở trang Bản thiết kế |
| `pages/BuilderPage.tsx` | Ghép 3 vùng + toolbar + lưu |

Logic hình học nằm trọn trong `scene.ts` để test được mà không cần WebGL.

---

## 5. Mô hình dữ liệu

```ts
type Vec3 = [number, number, number]

interface ConstructionScene {
  schemaVersion: number
  id: string
  workAreaId: string          // WorkArea.id
  name: string
  layers: ConstructionLayer[]
  items: SceneItem[]
  updatedAt: string
}

interface ConstructionLayer {
  id: string
  name: string
  order: number
  visible: boolean
  locked: boolean
  taskIds: string[]           // chỉ tham chiếu TaskExecution
}

interface SceneItem {
  id: string
  assetId: string
  layerId: string             // một nguồn sự thật về quan hệ item–layer
  position: Vec3              // tâm đáy của model
  rotation: Vec3              // Euler radian, thứ tự XYZ
  scale: Vec3
}
```

**Quyết định đã chốt**

| # | Quyết định | Lý do |
|---|---|---|
| D1 | `SceneItem.layerId` thay vì `layer.itemIds` | Tránh hai danh sách phải đồng bộ sau mỗi thao tác (khác bản gợi ý trong yêu cầu gốc) |
| D2 | `ConstructionLayer.taskIds` chỉ là tham chiếu | Trạng thái/priority/deadline luôn đọc từ `TaskExecution`, không lưu bản sao |
| D3 | `position` là **tâm đáy** model | Căn theo mặt đất/normal; model được chuẩn hóa khi nạp |
| D4 | Không lưu dữ liệu nhị phân của model | Scene chỉ giữ `assetId`; model do catalog/manifest cung cấp |
| D5 | Không lưu trạng thái camera/selection | Chỉ phục vụ phiên làm việc, không phải dữ liệu thiết kế |

---

## 6. Lưu trữ & kiểm tra dữ liệu

- Khoá: `grotto-builder-scene-v1:<workAreaId>` — **tách riêng** khỏi `grotto-designs-v1` của Design Review.
- `serializeScene` làm tròn số 3 chữ số thập phân để JSON không phình vì sai số dấu phẩy động.
- `deserializeScene` kiểm kiểu từng trường, ném `SceneFormatError` khi sai; `repository.load` bắt lỗi và trả `null` (coi như chưa có scene) để editor không sập.
- `schemaVersion` khác `SCENE_SCHEMA_VERSION` → từ chối thay vì render sai.
- Lưu thất bại (hết quota/private mode) → ném `SCENE_SAVE_FAILED`; UI hiển thị `builder.saveError`.
- Trung thực về giới hạn: `localStorage` chỉ thuộc **một trình duyệt**, không chia sẻ giữa tài khoản/thiết bị và không thay thế phân quyền backend.

---

## 7. Thao tác scene & bất biến

Toàn bộ hàm trong `scene.ts` là **hàm thuần, bất biến**: trả scene mới, hoặc **trả lại chính scene cũ** khi thao tác bị chặn.

| Nhóm | Hàm |
|---|---|
| Khởi tạo | `createScene` (tạo lớp mặc định, `taskIds: []`) |
| Truy vấn | `sortedLayers`, `layerById`, `itemsOfLayer`, `itemById` |
| Lớp | `addLayer`, `renameLayer`, `moveLayer`, `removeLayer`, `setLayerVisible`, `setLayerLocked` |
| Item | `addItem`, `updateItemTransform`, `moveItemToLayer`, `duplicateItem`, `removeItem` |
| Nhiệm vụ | `linkTask`, `unlinkTask` |
| Khóa | `isItemLocked` |

**Bất biến bắt buộc**

1. Lớp `locked` → `updateItemTransform`, `removeItem`, `duplicateItem` **không đổi** scene (so sánh tham chiếu là biết thao tác có hiệu lực).
2. Khóa lớp được kiểm trong logic, không chỉ đổi icon trên UI.
3. Chế độ tách lớp (explode) chỉ đổi vị trí trình bày, **không ghi đè transform gốc**.

---

## 8. Asset catalog

- Repository **không có file `.glb` nào**. Catalog mặc định chỉ gồm primitive three.js, gắn `source: 'DEMO_PRIMITIVE'` và nhãn UI rõ là demo.
- Cơ chế bổ sung model thật: thả file vào `public/models/*.glb` và khai báo trong `public/models/manifest.json` (`GlbManifestEntry`). Manifest luôn tồn tại (mặc định `[]`) để không sinh 404.
- `fetchGlbAssets` lỗi mạng/không có file → trả `[]`, **không bịa asset**.
- Không tạo file `.glb` giả, không gọi nguồn ngoài.

---

## 9. Liên kết nhiệm vụ

- `LayerPanel` nhận `tasks` từ `useTasks(areaId)` (TaskExecution) và gọi `onLinkTask` / `onUnlinkTask` → `scene.taskIds`.
- `404` từ API task được hiểu là khu vực chưa có `work_area_scope` bên TaskExecution (chưa đồng bộ scope), hiển thị trạng thái riêng thay vì lỗi chung.
- Hiện chỉ đọc được `title`, `status`, `priority`, `dueDate`. **Assignee, tiến độ và trạng thái nghiệm thu chưa có API** — không suy ra tiến độ thi công từ mức hoàn chỉnh của model.

---

## 10. Đồng bộ sang hồ sơ thiết kế

Sau khi lưu scene, `syncSceneDesign` ([designLink.ts](../../src/features/builder/designLink.ts)) upsert:

- `Design` với `designType = 'THREE_D'` theo `areaId`;
- `DesignVersion` với `fileKey = 'scene:<workAreaId>'`, `status = 'DRAFT'`, `mimeType = 'application/json'`.

Chỉ lưu **metadata**: nội dung scene nằm trong `SceneRepository`, không sao chép dữ liệu model và không tạo blob giả. Nhờ vậy trang Bản thiết kế hiển thị scene bằng `ScenePreview` và duyệt được như một phiên bản thiết kế.

Lỗi đồng bộ không chặn việc lưu scene; UI báo `builder.designSyncError`.

---

## 11. UI/UX

Bố cục 3 vùng: **Thư viện model** (trái) · **Canvas 3D** (giữa) · **Panel lớp + item + nhiệm vụ** (phải).

| Trạng thái | Xử lý |
|---|---|
| Đang nạp scene | `EmptyState` "Đang tải" |
| Chưa có scene | Tạo mới với 4 lớp mặc định (Nền móng, Kết cấu, Bao phủ, Trang trí) |
| Đang lưu / đã lưu / lỗi lưu | Nhãn nút đổi theo `saveState` |
| Có thay đổi chưa lưu | Cảnh báo `beforeunload` |
| Lớp bị khóa | Phản hồi trực quan + chặn thao tác thật |
| Lỗi WebGL / lỗi model | Toast riêng cho từng loại |

Thao tác phân biệt rõ 4 trạng thái: chọn asset, kéo asset mới, transform item, điều khiển camera. Chế độ đặt: `ground` (raycast mặt phẳng nền) và `surface` (raycast mesh, có tùy chọn căn theo normal).

Tuân thủ `DESIGN_SYSTEM.md` (Golden Winter), không tạo design system riêng.

---

## 12. Phân quyền

- Route giới hạn `LEADER`; quyền chỉ kiểm ở UI.
- Khóa lớp/khóa item được kiểm ở tầng logic scene.
- **Backend chưa kiểm quyền** vì chưa có endpoint — đây là điều kiện bắt buộc của giai đoạn B.

---

## 13. Kiểm thử hiện có

| File | Nội dung |
|---|---|
| `src/features/builder/scene.test.ts` | Bất biến thao tác, khóa lớp chặn thật, thứ tự lớp, chuyển lớp |
| `src/features/builder/serialize.test.ts` | Làm tròn số, từ chối dữ liệu sai kiểu/thiếu trường, `schemaVersion` |
| `src/features/builder/repository.test.ts` | Lưu/nạp/xóa, dữ liệu hỏng trả `null`, lỗi lưu |
| `src/features/builder/designLink.test.ts` | Upsert `Design`/`DesignVersion`, `fileKey` scene, không tạo trùng |

Chạy: `npx vitest run src/features/builder` · build: `npm run build`.

---

## 14. Giới hạn đã biết

| ID | Giới hạn | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| B1 | Scene chỉ ở `localStorage` | Không chia sẻ giữa máy/tài khoản | Giai đoạn B: API scene |
| B2 | Chưa có phân quyền server | Người có URL có thể sửa dữ liệu cục bộ | Kiểm quyền ở BE khi có endpoint |
| B3 | Không có `.glb` thật | Chỉ thấy primitive demo | Bổ sung `public/models` + manifest |
| B4 | Task chỉ đọc `status/priority/dueDate` | Không hiển thị assignee/tiến độ/nghiệm thu | Chờ API TaskExecution |
| B5 | Builder chỉ mở cho LEADER | PARISH không xem được builder (chỉ xem bản thiết kế) | Cân nhắc route xem chỉ đọc |

---

## 15. Definition of Done

**Giai đoạn A (đã đạt)**

- [x] Đặt/transform/nhân bản/xóa item; đặt trên nền và trên bề mặt.
- [x] Quản lý lớp đầy đủ, khóa lớp chặn thao tác thật.
- [x] Liên kết/hủy liên kết nhiệm vụ, không lưu bản sao dữ liệu task.
- [x] Lưu/mở scene, cảnh báo thay đổi chưa lưu, dữ liệu hỏng không làm sập editor.
- [x] Lưu scene sinh/cập nhật hồ sơ thiết kế 3D để duyệt được.
- [x] Unit test cho scene/serialize/repository/designLink pass; `npm run build` xanh.

**Giai đoạn B (chưa đạt)**

- [ ] `SceneRepository` dùng API thật, có kiểm quyền ở server.
- [ ] Asset `.glb` thật qua manifest.
- [ ] Hiển thị assignee/tiến độ/nghiệm thu từ TaskExecution.

---

## 16. Câu hỏi mở

1. Một nhiệm vụ có thể thuộc nhiều lớp không? Hiện `taskIds` cho phép nhiều-nhiều nhưng chưa chốt nghiệp vụ.
2. Khi scene đổi cấu trúc lớp, có cần versioning scene (tương tự `DesignVersion`) không?
3. Có mở route chỉ đọc cho PARISH/COMMUNITY (chỉ xem, không sửa) không?
