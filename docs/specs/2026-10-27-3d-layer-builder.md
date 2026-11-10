# Đặc tả Thiết kế Kỹ thuật: 3D Layer Builder — Trình dựng công trình theo lớp

- **Tài liệu**: `docs/specs/2026-10-27-3d-layer-builder.md`
- **Ngày lập**: 2026-10-27
- **Tác giả**: phongnltse
- **Phân hệ**: GrottoWorks Frontend (`GrottoWorks_FE`)
- **Trạng thái**: Đã thống nhất thiết kế (Validated Design) — giai đoạn A đã triển khai
- **Cập nhật**: 2026-11-09 — chốt mô hình **nháp local + cloud snapshot + catalog mẫu do ADMIN quản lý**
- **Triển khai 10/11/2026**: **FE-local** — `LocalDraftStore` + `LocalSceneVersionStore`; cloud/catalog ADMIN hoãn đến khi được sửa BE
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
| **A** | Editor đầy đủ + nháp `localStorage` + asset demo + liên kết task chỉ đọc | ✅ Đã xong |
| **A2** | Nháp local + lịch sử phiên bản local + nút Lưu "trên máy" (không cloud) | ✅ Đã xong 10/11/2026 |
| **B** | Cloud scene: `GET/PUT` + `scene_version` snapshot, nháp local có `baseRevision`, `If-Match`/409, phân quyền server | ⏳ Chờ BE |
| **C** | Catalog asset/template do ADMIN quản lý trên cloud + `.glb` thật + thumbnail + scene template | ⏳ Chờ BE |

Ranh giới lưu trữ nằm ở `DraftStore` (local) và `SceneApi` (cloud); logic
scene/layer/transform không biết backend. Giai đoạn A dùng `LocalSceneRepository`
như một `DraftStore` tạm.

---

## 3. Điểm truy cập & route

| Role | Route | Page | Ghi chú |
|---|---|---|---|
| LEADER | `/leader/areas/:id/builder` | `BuilderPage` | Route duy nhất đang mở |
| ADMIN (system) | `/parish/templates` | `TemplateAdminPage` | Giai đoạn C; guard `role === 'PARISH' && !user.parishId` |
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
| `repository.ts` | `SceneRepository` interface + `LocalSceneRepository` (nháp) — giai đoạn A |
| `draftStore.ts` | `DraftStore`: nháp theo `userId + workAreaId`, `baseRevision`, autosave/khôi phục (giai đoạn B) |
| `sceneApi.ts` | `GET/PUT /work-areas/{id}/design-scene`, xử lý `If-Match`/409, `scene_version` (giai đoạn B) |
| `pages/TemplateAdminPage.tsx` | Catalog asset/template do ADMIN quản lý — upload `.glb`, thumbnail, metadata (giai đoạn C) |
| `useBuilderScene.ts` | State editor: scene, selection, mode, dirty, save; gọi `DraftStore` (nháp) + `SceneApi` (cloud) |
| `assets.ts` | Catalog hiển thị: asset từ API (PUBLISHED) + primitive demo; manifest chỉ còn là fallback dev |
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
  assetId: string             // MÃ ổn định của asset template (không phải UUID file)
  assetVersion: number        // pin version: mẫu cập nhật không làm đổi bản đã duyệt
  layerId: string             // một nguồn sự thật về quan hệ item–layer
  position: Vec3              // tâm đáy của model
  rotation: Vec3              // Euler radian, thứ tự XYZ
  scale: Vec3
}
```

**Bản ghi trên cloud (giai đoạn B/C)**

```ts
interface AssetTemplate {
  id: string
  code: string                 // mã ổn định, dùng làm `SceneItem.assetId`
  name: string
  category: string
  glbFileId: string
  thumbnailFileId?: string
  realWidthM: number; realHeightM: number; realDepthM: number
  anchor: 'BASE_CENTER'
  license?: string; sourceUrl?: string
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'
  version: number
}

interface WorkAreaScene {
  revision: number             // dùng cho If-Match
  schemaVersion: number
  layers: ConstructionLayer[]
  items: SceneItem[]
  contentHash: string
  updatedAt: string
}

interface SceneVersion {
  id: string
  workAreaId: string
  versionNo: number
  doc: { schemaVersion: number; layers: ConstructionLayer[]; items: SceneItem[] }
  assetsLock: { assetId: string; assetVersion: number; sha256: string }[]
  renderFileId?: string
  note?: string
  createdBy: string
  createdAt: string
}
```

**Quyết định đã chốt**

| # | Quyết định | Lý do |
|---|---|---|
| D1 | `SceneItem.layerId` thay vì `layer.itemIds` | Tránh hai danh sách phải đồng bộ sau mỗi thao tác (khác bản gợi ý trong yêu cầu gốc) |
| D2 | `ConstructionLayer.taskIds` chỉ là tham chiếu | Trạng thái/priority/deadline luôn đọc từ `TaskExecution`, không lưu bản sao |
| D3 | `position` là **tâm đáy** model | Căn theo mặt đất/normal; model được chuẩn hóa khi nạp |
| D4 | Không lưu dữ liệu nhị phân của model | Scene chỉ giữ `assetId + assetVersion`; model do catalog cloud cung cấp |
| D5 | Không lưu trạng thái camera/selection | Chỉ phục vụ phiên làm việc, không phải dữ liệu thiết kế |
| D6 | `assetId` là **mã ổn định** + `assetVersion` pin | Mẫu cập nhật không làm sai bản đã duyệt |
| D7 | Đang dựng → **nháp local**; cloud chỉ ghi khi bấm Lưu | Tránh request rác, tránh ghi đè khi thử nghiệm |
| D8 | Mỗi lần Lưu tạo `scene_version` bất biến + `assetsLock` | "Bản hoàn chỉnh" tái tạo được, không copy `.glb` |
| D9 | Dedupe theo `contentHash` | Không spam version khi bấm Lưu nhiều lần |
| D10 | `If-Match: revision` + 409, không auto-merge | Không ghi đè âm thầm giữa 2 tab/2 người |
| D11 | Export ZIP chỉ khi có yêu cầu | Lưu trữ/bàn giao mà không nhân bản dung lượng mỗi lần Lưu |

---

## 6. Lưu trữ & kiểm tra dữ liệu

### 6.1. Ba tầng lưu trữ

| Tầng | Chứa gì | Vai trò |
|---|---|---|
| Cloud – object storage | `.glb` của asset template, thumbnail, ảnh render | Nội dung nặng, dùng chung, bất biến theo version |
| Cloud – DB | `work_area_scene` (bản hiện tại) + `scene_version` (snapshot) | **Nguồn sự thật** của "đã lưu", phân quyền, lịch sử duyệt |
| Máy người dùng | Nháp: layers + items + transform + `baseRevision` | Bản làm việc; mất máy thì mất phần chưa Lưu |

Nháp **không chứa file `.glb`**; model luôn tải từ cloud (HTTP cache lo phần lặp).

**Đồng bộ với R2 plan** (`GrottoWorks_Documents/GrottoWorks_Cloudflare_R2_Storage_Plan_v1.md`
§5-C2, §8-Q1/Q2):

- Tên logic trong tài liệu này ↔ mô hình triển khai: `work_area_scene` →
  `design_scene` (`scene_json`, `schema_version`, cột `version` chính là giá trị
  `If-Match`); `scene_version` → `design_version` với `source = 'BUILDER_SCENE'`
  và `scene_json` snapshot.
- File `.glb`/ảnh dùng file service với purpose `DESIGN_MODEL`/`DESIGN_IMAGE`
  trên object storage **S3-compatible**: MinIO (local), Cloudflare R2
  (staging/prod).
- Scene JSON nằm trong DB (jsonb), không lên R2 trừ khi vượt ~1 MB
  (`DESIGN_SCENE`).

### 6.2. Nháp local

- Khoá: `grotto-builder-draft-v1:<workAreaId>:<userId>` — tách theo user để máy
  dùng chung không lộ nháp của tài khoản khác; **tách riêng** khỏi
  `grotto-designs-v1` của Design Review.
- `SceneDraft = { schemaVersion, workAreaId, userId, baseRevision, doc, contentHash, savedAt }`.
- Autosave debounce 1–2 giây sau thay đổi; flush đồng bộ khi `pagehide` /
  `beforeunload`. Vì cần flush đồng bộ nên dùng `localStorage` cho nháp (JSON
  nhỏ); `IndexedDB` (`blobStore`) chỉ dành cho blob.
- Khi mở editor: nạp cloud + nháp. Nếu nháp khác cloud → banner "Có bản nháp
  chưa lưu (lúc …)" với [Tiếp tục] [Bỏ nháp] [Xem bản cloud].
- Xoá nháp **chỉ sau khi** lưu cloud thành công; lưu lỗi thì giữ nháp.
- Giới hạn: ≤ 100 layer, ≤ 5.000 item, JSON ≤ 2 MB. Vượt → chặn lưu và báo rõ.
- Không đồng bộ nháp giữa thiết bị — đó là chủ ý. Cloud chỉ có bản đã Lưu.
- **Đã triển khai FE-local (10/11/2026):** `LocalDraftStore`
  ([draftStore.ts](../../src/features/builder/draftStore.ts)) — key theo
  `workAreaId + userId`, autosave debounce 800ms, flush đồng bộ khi `pagehide`.
- **Lịch sử phiên bản local:** `LocalSceneVersionStore`
  ([sceneVersions.ts](../../src/features/builder/sceneVersions.ts)) — tối đa 10
  bản/khu vực; dedupe theo nội dung (bỏ `updatedAt`); khôi phục bản cũ vào nháp.

### 6.3. Hợp đồng API

```http
GET  /api/v1/work-areas/{workAreaId}/design-scene        → 200 { revision, schemaVersion, scene: { layers, items }, updatedAt, updatedBy } | 204
PUT  /api/v1/work-areas/{workAreaId}/design-scene        (LEADER)
     If-Match: <revision>
     body { schemaVersion, note?, renderFileId?, scene: { layers, items } }
     → 200 { revision, versionNo, versionId, contentHash }
GET  /api/v1/work-areas/{workAreaId}/design-scene/versions?page=  → danh sách version (metadata)
GET  /api/v1/scene-versions/{versionId}                  → snapshot đầy đủ (bất biến)
```

`PUT` là **1 transaction**: upsert `work_area_scene` + insert `scene_version` +
cập nhật liên kết `design_version` (nếu có). Response trả đủ để client không
phải GET lại.

### 6.4. Xung đột

- Nháp giữ `baseRevision`; `PUT` gửi `If-Match`.
- `409 SCENE_REVISION_CONFLICT` kèm `currentRevision`, `updatedBy`, `updatedAt`.
- UI **không** tự ghi đè: [Xem bản cloud] [Lấy bản cloud và bỏ nháp] [Lưu thành
  bản mới từ nháp].
- 2 tab cùng máy: `storage` event / `BroadcastChannel` → cảnh báo "nháp đã bị
  tab khác sửa".

### 6.5. Kiểm tra phía server

| Kiểm tra | Lỗi |
|---|---|
| `schemaVersion` được hỗ trợ | 422 |
| ID layer/item không trùng; `layerId` tồn tại; `order` duy nhất | 422 |
| `assetId + assetVersion` tồn tại và `PUBLISHED` (hoặc đã dùng ở version trước) | 422 `ASSET_NOT_AVAILABLE` |
| Transform là số hữu hạn; `scale > 0`; giới hạn biên độ | 422 |
| `taskIds` thuộc đúng khu vực (hoặc tồn tại) | 422 |
| Số layer/item + kích thước document | 413/422 |
| `If-Match` khớp `revision` | 409 |

### 6.6. Serialize & schema

- `serializeScene` làm tròn số 3 chữ số thập phân để JSON không phình vì sai số
  dấu phẩy động **và** để `contentHash` ổn định.
- `deserializeScene` kiểm kiểu từng trường, ném `SceneFormatError` khi sai;
  `DraftStore` bắt lỗi và trả `null` (coi như chưa có nháp) để editor không sập.
- `schemaVersion` khác `SCENE_SCHEMA_VERSION` → migrate khi đọc; migrate lỗi thì
  giữ raw + cho "Xuất JSON" để cứu, không render sai.
- Lưu nháp thất bại (hết quota/private mode) → `SCENE_SAVE_FAILED`; UI hiển thị
  `builder.saveError`.

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

## 8. Asset catalog & template do ADMIN quản lý

### 8.1. Hiện trạng (giai đoạn A)

- Repository **không có file `.glb` nào**. Catalog mặc định chỉ gồm primitive
  three.js, gắn `source: 'DEMO_PRIMITIVE'` và nhãn UI rõ là demo.
- `public/models/manifest.json` chỉ còn là **fallback cho dev/offline**; manifest
  rỗng → catalog chỉ có demo.
- `fetchGlbAssets` lỗi mạng/không có file → trả `[]`, **không bịa asset**.

### 8.2. Giai đoạn C — catalog trên cloud

- System ADMIN upload `.glb` + thumbnail + metadata → `asset_template` (global).
- Trường bắt buộc: `code` (ổn định), `name`, `category`, `glbFileId`,
  `realWidthM/HeightM/DepthM`, `anchor = BASE_CENTER`, `status`, `version`,
  `license`, `sourceUrl`.
- **Chuẩn hoá khi nạp**: đưa origin về tâm đáy, scale theo kích thước thật
  (1 unit = 1 m) để cây 3 m không cao bằng người 10 m.
- Vòng đời: `DRAFT → PUBLISHED → DEPRECATED → ARCHIVED`. **Không hard-delete**
  template đã PUBLISHED; file vẫn tải được cho scene cũ.
- `PUBLISHED` là **bất biến**: sửa mẫu = tạo `version` mới. Scene pin
  `assetId + assetVersion` nên bản đã duyệt không đổi.
- FE chỉ thấy template `PUBLISHED` (+ `DEPRECATED` nếu đang được scene hiện tại
  dùng). Không tin `assetId` client gửi khi lưu — server kiểm lại.

### 8.3. Scene template (preset)

- Là một document scene (layers + items) đã bố trí sẵn, **không chứa task link**.
- "Tạo từ mẫu" → copy scene + **remap ID** + giữ `assetId/assetVersion`.
- Dùng để admin đóng gói kinh nghiệm ("Hang đá mẫu A"), giảm thời gian dựng.

---

## 9. Liên kết nhiệm vụ

- `LayerPanel` nhận `tasks` từ `useTasks(areaId)` (TaskExecution) và gọi `onLinkTask` / `onUnlinkTask` → `scene.taskIds`.
- `404` từ API task được hiểu là khu vực chưa có `work_area_scope` bên TaskExecution (chưa đồng bộ scope), hiển thị trạng thái riêng thay vì lỗi chung.
- Hiện chỉ đọc được `title`, `status`, `priority`, `dueDate`. **Assignee, tiến độ và trạng thái nghiệm thu chưa có API** — không suy ra tiến độ thi công từ mức hoàn chỉnh của model.

---

## 10. Đồng bộ sang hồ sơ thiết kế

Sau khi lưu scene, `syncSceneDesign` ([designLink.ts](../../src/features/builder/designLink.ts)) upsert:

- `Design` với `designType = 'THREE_D'` theo `areaId`;
- `DesignVersion` với `fileKey = 'scene-version:<sceneVersionId>'`, `status = 'DRAFT'`, `mimeType = 'application/json'` — trỏ tới **snapshot bất biến**, không trỏ tới scene hiện tại đang sửa.

> **Giai đoạn FE-local (10/11/2026):** code hiện dùng `fileKey = 'scene:<areaId>'` cho bản đang lưu; lịch sử nằm ở `LocalSceneVersionStore`. Khi lên cloud (phase B) mới chuyển sang `scene-version:<id>` và bảng `design_version`.

Chỉ lưu **metadata**: nội dung scene nằm trong `scene_version`, không sao chép dữ liệu model và không tạo blob giả. Nhờ vậy trang Bản thiết kế hiển thị scene bằng `ScenePreview` và duyệt được như một phiên bản thiết kế.

Lỗi đồng bộ không chặn việc lưu scene; UI báo `builder.designSyncError`.

---

## 11. UI/UX

Bố cục 3 vùng: **Thư viện model** (trái) · **Canvas 3D** (giữa) · **Panel lớp + item + nhiệm vụ** (phải).

| Trạng thái | Xử lý |
|---|---|
| Đang nạp scene | `EmptyState` "Đang tải" |
| Chưa có scene | Tạo mới với 4 lớp mặc định (Nền móng, Kết cấu, Bao phủ, Trang trí) |
| Đang lưu nháp / đã lưu cloud / lỗi | Nhãn phải phân biệt **"Nháp trên máy"** và **"Đã lưu lên cloud"**; nút disable khi đang lưu cloud |
| Có thay đổi chưa lưu | Cảnh báo `beforeunload` + flush nháp |
| Có bản nháp khác cloud | Banner [Tiếp tục] [Bỏ nháp] [Xem bản cloud] |
| Xung đột revision (409) | Banner 3 lựa chọn, không tự ghi đè |
| Lớp bị khóa | Phản hồi trực quan + chặn thao tác thật |
| Lỗi WebGL / lỗi model | Toast riêng cho từng loại |

Thao tác phân biệt rõ 4 trạng thái: chọn asset, kéo asset mới, transform item, điều khiển camera. Chế độ đặt: `ground` (raycast mặt phẳng nền) và `surface` (raycast mesh, có tùy chọn căn theo normal).

Tuân thủ `DESIGN_SYSTEM.md` (Golden Winter), không tạo design system riêng.

---

## 12. Phân quyền

| Việc | Vai trò | Kiểm ở đâu |
|---|---|---|
| Upload/publish asset template | System ADMIN (BE `ADMIN`) | Server |
| Upload sơ đồ + pin khu vực | **System ADMIN (BE `ADMIN`)** — chốt 11/11/2026; ban hành giáo chỉ đọc | Server |
| Dựng/sửa scene | LEADER phụ trách khu vực | Server |
| Duyệt design version | Ban hành giáo | Server |
| TNV xem **lớp** gắn với nhiệm vụ đã nhận | VOLUNTEER có assignment `ACCEPTED` cho task thuộc khu vực — **chỉ trả các lớp có `taskIds` chứa task đó** | Server (lọc trước khi trả) |

- Route UI chỉ là lớp trang trí; **server phải kiểm lại** `workAreaId` thuộc quyền
  của leader và trạng thái version hợp lệ.
- Không cho client gửi `createdBy`/`parishId` tuỳ ý — lấy từ token.
- Khóa lớp/khóa item được kiểm ở tầng logic scene (client) **và** khi validate
  document ở server (không tin client).

---

## 13. Kiểm thử hiện có

| File | Nội dung |
|---|---|
| `src/features/builder/scene.test.ts` | Bất biến thao tác, khóa lớp chặn thật, thứ tự lớp, chuyển lớp |
| `src/features/builder/serialize.test.ts` | Làm tròn số, từ chối dữ liệu sai kiểu/thiếu trường, `schemaVersion` |
| `src/features/builder/repository.test.ts` | Lưu/nạp/xóa nháp, dữ liệu hỏng trả `null`, lỗi lưu |
| `src/features/builder/draftStore.test.ts` | Nháp theo user, khôi phục, xoá sau lưu, dữ liệu hỏng |
| `src/features/builder/sceneApi.test.ts` | `If-Match`, 409, hash dedupe, map response |
| `src/features/builder/designLink.test.ts` | Upsert `Design`/`DesignVersion`, `fileKey = scene-version:<id>`, không tạo trùng |

Chạy: `npx vitest run src/features/builder` · build: `npm run build`.

---

## 14. Giới hạn đã biết

| ID | Giới hạn | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| B1 | Nháp + lịch sử phiên bản chỉ ở `localStorage` | Không chia sẻ giữa máy/tài khoản; xoá cache là mất nháp/lịch sử | Giai đoạn B: cloud scene; draft vẫn local theo chủ ý |
| B2 | Chưa có phân quyền server | Người có URL có thể sửa dữ liệu cục bộ | Bắt buộc kiểm quyền ở BE khi có endpoint |
| B3 | Không có `.glb` thật | Chỉ thấy primitive demo | Giai đoạn C: catalog ADMIN + seed mẫu CC0 |
| B4 | Task chỉ đọc `status/priority/dueDate` | Không hiển thị assignee/tiến độ/nghiệm thu | Chờ API TaskExecution |
| B5 | Builder chỉ mở cho LEADER | PARISH/COMMUNITY không xem được builder (chỉ xem bản thiết kế) | Cân nhắc route xem chỉ đọc |
| B6 | Chưa có render thumbnail khi Lưu | Trang duyệt phải tải `.glb` để xem | Giai đoạn B: `renderFileId` tuỳ chọn |
| B7 | Chưa có preview template | Leader phải tải model mới biết hình dạng | Giai đoạn C: thumbnail bắt buộc |

---

## 15. Definition of Done

**Giai đoạn A (đã đạt)**

- [x] Đặt/transform/nhân bản/xóa item; đặt trên nền và trên bề mặt.
- [x] Quản lý lớp đầy đủ, khóa lớp chặn thao tác thật.
- [x] Liên kết/hủy liên kết nhiệm vụ, không lưu bản sao dữ liệu task.
- [x] Lưu/mở scene, cảnh báo thay đổi chưa lưu, dữ liệu hỏng không làm sập editor.
- [x] Lưu scene sinh/cập nhật hồ sơ thiết kế 3D để duyệt được.
- [x] Unit test cho scene/serialize/repository/designLink pass; `npm run build` xanh.

**FE-local (đã đạt 10/11/2026)**

- [x] Nháp tự lưu local, khôi phục sau F5/crash, banner chọn tiếp tục/bỏ nháp.
- [x] Nút Lưu tạo bản đã lưu + phiên bản lịch sử trên máy; dedupe nội dung.
- [x] Khôi phục phiên bản vào nháp; lưu lại để chốt bản mới.
- [x] Test `draftStore`, `sceneVersions` pass; `npm run lint` + `npm run build` xanh.

**Giai đoạn B (chưa đạt) — nháp local + cloud scene**

- [ ] Đang sửa không phát sinh request ghi; nháp tự lưu local và khôi phục sau F5/crash.
- [ ] `PUT /work-areas/{id}/design-scene` là **1 request**, tạo `scene_version` đầy đủ layers + items.
- [ ] `If-Match` + 409; không ghi đè âm thầm.
- [ ] Lưu 2 lần không đổi nội dung → không sinh version mới (hash dedupe).
- [ ] Mở version cũ vẫn thấy đúng layers/items dù scene hiện tại đã đổi.
- [ ] Server kiểm quyền + validate document.

**Giai đoạn C (chưa đạt) — catalog mẫu**

- [ ] ADMIN upload `.glb` + thumbnail + metadata; publish/deprecate.
- [ ] Leader thấy catalog PUBLISHED, đặt được mẫu với tỉ lệ thật.
- [ ] Deprecate template không làm hỏng scene cũ.
- [ ] Có ít nhất 6 mẫu seed (license rõ ràng).

---

## 16. Câu hỏi mở

1. Một nhiệm vụ có thể thuộc nhiều lớp không? Hiện `taskIds` cho phép nhiều-nhiều nhưng chưa chốt nghiệp vụ.
2. ~~Khi scene đổi cấu trúc lớp, có cần versioning scene không?~~ **Đã chốt**: có — `scene_version` bất biến mỗi lần Lưu (D8).
3. Có mở route chỉ đọc cho PARISH/COMMUNITY (chỉ xem, không sửa) không?
4. Có cần "lưu tạm trên cloud" tách khỏi "chốt bản" không? Hiện chốt: chỉ một nút Lưu = snapshot; bổ sung sau nếu người dùng cần.
5. Scene template có được phép kèm task link không? Chốt: không — chỉ asset + transform, tránh copy ID task giữa các khu vực.
