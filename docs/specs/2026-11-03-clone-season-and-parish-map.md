# Cách thực hiện: Tạo mùa mới từ mùa cũ + Bản đồ giáo xứ

Ngày: 03/11/2026 · Phạm vi: `ParishCoordination` (BE) + `GrottoWorks_FE`

Mục tiêu: (A) tạo lại mùa Giáng sinh mới giữ nguyên/tuỳ chỉnh khu vực, (B) admin
thêm bản đồ giáo xứ — khuôn viên nhà thờ. Tài liệu ghi **cách làm** và **các lỗi
phải tránh**, đặc biệt là không bắn nhiều request vào BE.

---

## 0. Nguyên tắc chung (áp dụng cho cả 2 tính năng)

1. **1 thao tác người dùng = 1 request ghi.** Không để client lặp API theo từng
   bản ghi con (N+1). Gộp thành batch endpoint và xử lý trong **1 transaction**.
2. **Server trả về đủ dữ liệu vừa tạo** để client không phải GET lại.
3. **Không đọc lặp lại**: dữ liệu đã có trong cache React Query thì dùng lại
   (mùa nguồn, danh sách khu vực, `parishId`) — không fetch lại ở từng bước.
4. **Không polling.** Outbox của `ParishCoordination` chạy nền bằng worker;
   client không chờ projection xong.
5. **Không sửa entity không liên quan.** `ParishCoordinationDbContext.SaveChanges`
   tự sinh outbox cho mọi `Season`/`WorkArea` bị thêm/sửa → sửa entity chỉ để
   hiển thị (toạ độ ghim) sẽ bump `Version` và đẩy snapshot vô ích.
6. **Idempotent ở mức nghiệp vụ**: ràng buộc unique sẵn có của BE là chốt chặn
   cuối, FE khoá nút trong lúc đang gửi.

### Checklist lỗi cần tránh (review PR)

| # | Lỗi | Vì sao sai | Cách đúng |
|---|---|---|---|
| 1 | FE lặp `POST /seasons/{id}/work-areas` cho từng khu vực | 7 khu = 7 request; lỗi giữa đường → mùa thiếu khu vực | `POST /seasons/{seasonId}/clone` (1 request, 1 transaction) |
| 2 | FE lặp `PUT /work-areas/{id}/leader` + `/material-officer` | 2N request, không nguyên tử | Clone handler copy sẵn `leaderId`/`materialOfficerId` |
| 3 | Gọi `GET /seasons` rồi `GET /seasons/{id}/work-areas` ngay trước khi clone | 2 request thừa — dữ liệu đã có trong `useSeasonAreas` | Dùng cache, chỉ gửi `sourceSeasonId` |
| 4 | GET lại danh sách khu vực sau khi clone | 1 request thừa | Response clone trả `areas[]`, FE `setQueryData` |
| 5 | Pin bản đồ: gọi `PUT /work-areas/{id}/map-pin` cho từng khu | N request; mỗi lần sửa `WorkArea` còn sinh thêm outbox | 1 `PUT /parishes/{id}/map` chứa cả `pins[]` |
| 6 | Lưu toạ độ vào entity `WorkArea` | Mỗi lần kéo ghim: bump `Version`, worker đẩy lại scope sang 4 service | Lưu `map_pins` (jsonb) trên `parish` |
| 7 | Trả `mapPins` trong `GET /work-areas` | Bơm payload vào list API dùng ở nhiều màn hình | Chỉ trả ở `GET /parishes/{id}/map` |
| 8 | Upload ảnh trong vòng lặp, hoặc upload lại mỗi lần lưu ghim | 3 request × mỗi lần lưu | Upload 1 lần khi chọn ảnh, lưu `fileId` khi bấm Lưu |
| 9 | `await` chờ outbox deliver trong request | Request chậm gấp nhiều lần, dễ timeout | Outbox chạy nền, trả 201 ngay |
| 10 | Bỏ qua ràng buộc unique `name`/`seasonYear` | 409 giữa chừng, client phải rollback tay | Pre-check, trả 409 kèm `code`, FE hiện lỗi tại field |
| 11 | Copy nguyên `startDate`/`deadline` khu vực sang mùa mới | 422 `WORK_AREA_DATE_OUT_OF_SEASON` | Dịch ngày theo mùa mới hoặc để `null` |
| 12 | Copy thẳng `leaderId` mà không kiểm tra | `PUT .../leader` **có** validate qua Identity (tồn tại / `Active` / role `LEADER` / cùng giáo xứ); copy trực tiếp trong clone sẽ **bỏ qua** các validate đó → gán vào user đã nghỉ hoặc sai role | Validate **1 lượt** bằng `GET /internal/users?ids=a,b,c` rồi trả `warnings[]` |
| 12b | Validate từng leader/officer bằng 1 call riêng | 7 khu × 2 người = 14 internal call đồng bộ → chậm | Dùng batch `GET /internal/users?ids=…` (1 call, đã có sẵn) |
| 13 | Clone kèm task/vật tư/quyên góp | Dữ liệu gắn `season_id` cũ, làm sai báo cáo | Chỉ copy **khu vực**; template vật tư là phase sau |
| 14 | Bấm "Tạo mùa" 2 lần | Tạo 2 mùa nếu tên tự sinh khác nhau | Disable khi `mutation.isPending` + unique constraint |

---

## 1. Tính năng A — Tạo mùa mới từ mùa cũ

### 1.1. Hợp đồng API

```http
POST /api/v1/seasons/{sourceSeasonId}/clone
Authorization: Bearer <ADMIN|PARISH>
Content-Type: application/json
```

```jsonc
{
  "name": "Giáng sinh 2027",
  "seasonYear": 2027,
  "startDate": "2027-10-20",
  "endDate": "2027-12-31",
  "description": null,
  "estimatedBudget": 150000000,

  // NONE: bỏ trống ngày khu vực | SAME_DAY_OF_SEASON: giữ đúng vị trí tương đối
  "dateShift": "SAME_DAY_OF_SEASON",

  "copyAssignments": true,

  // null/rỗng = copy tất cả khu vực của mùa nguồn
  "areas": [
    {
      "sourceWorkAreaId": "uuid",
      "name": "Hang đá Bê-lem",   // optional: đổi tên
      "categoryId": "uuid|null",  // optional: đổi loại
      "communityId": "uuid|null"  // optional: đổi giáo khu
    }
  ],

  "copyMapPins": true
}
```

`201 Created` → `ApiResponse<CloneSeasonResultDto>`:

```jsonc
{
  "season": { /* SeasonDto */ },
  "areas": [ { /* WorkAreaDto */ } ],   // client dùng luôn, KHÔNG cần GET lại
  "warnings": ["WORK_AREA_LEADER_NOT_VERIFIED:Hang đá Bê-lem"]
}
```

Lỗi: `404 SOURCE_SEASON_NOT_FOUND` · `409 SEASON_NAME_CONFLICT` /
`SEASON_YEAR_CONFLICT` (kèm `code`) · `422 SEASON_DATE_INVALID` ·
`422 CLONE_AREA_NOT_IN_SOURCE` (`sourceWorkAreaId` không thuộc mùa nguồn) ·
`403 PARISH_ACCESS_DENIED`.

### 1.2. Các bước trong handler (1 transaction)

```text
CloneSeasonCommandHandler.HandleAsync
  1. seasonRepository.GetByIdAsync(sourceSeasonId)                  // 1 query
  2. ParishAccess.EnsureSameParish(currentUser, source.ParishId)
  3. Validate: endDate >= startDate; name/year unique trong parish
  4. season = Season.Create(...)  → PLANNING;  seasonRepository.Add(season)
  5. areas = workAreaRepository.GetPagedBySeasonIdAsync(source, size: 500) // 1 query
  6. Nếu copyAssignments:
       ids = distinct(leaderId ∪ materialOfficerId của các khu được chọn)
       identityUsers = GET /internal/users?ids=a,b,c                     // 1 internal call
       → user không tồn tại / Status != Active / sai role / khác parish
         ⇒ BỎ copy người đó + thêm warnings[]
  7. Với mỗi khu vực được chọn:
       - name/category/community: theo override, mặc định = nguồn
       - ngày: tính theo dateShift của mùa mới, hoặc null
       - leaderId/materialOfficerId: theo kết quả bước 6
       - workAreaRepository.Add(newArea)      // Add() trong vòng lặp, KHÔNG Save
  8. Copy map pins theo map sourceAreaId → newAreaId (nếu copyMapPins)
  9. seasonRepository.SaveChangesAsync()      // 1 transaction:
       - insert season + N khu vực
       - DbContext tự chèn N+1 outbox row trong CÙNG transaction
 10. Trả 201: season + areas + warnings
```

Điểm quan trọng:

- **Không** gọi `PUT /work-areas/{id}/leader` cho từng khu — gán ngay khi tạo.
- **`workAreaRepository.Add()` nhiều lần rồi 1 `SaveChangesAsync()`** là hợp lệ;
  interface hiện tại (`Add` đơn lẻ + `SaveChangesAsync`) không cần đổi.
- Outbox sinh N+1 message nhưng **chạy nền**: `HttpTaskScopeDelivery` PUT 2 lần
  mỗi khu vực (season + area) ≈ 15 internal call cho 7 khu — chấp nhận được vì
  async và có retry (`Attempts`/`NextAttemptAt`).
- Chặn double-submit tuyệt đối: thêm `clone_source_season_id` + unique index,
  hoặc nhận `Idempotency-Key` (đã có tiền lệ ở `Attendance`).

### 1.3. Ràng buộc nghiệp vụ phải giữ (không nới)

| Ràng buộc | Nơi thực thi |
|---|---|
| `name` unique trong giáo xứ | `ISeasonRepository.ExistsByNameAsync` |
| `seasonYear` unique trong giáo xứ | `ISeasonRepository.ExistsByYearAsync` |
| Khu vực chỉ tạo khi mùa `PLANNING` | `CreateWorkAreaCommandHandler` |
| Ngày khu vực nằm trong mùa | `WORK_AREA_DATE_OUT_OF_SEASON` |
| Activate cần ≥1 khu vực và **mọi** khu vực có leader + material officer | `ActivateSeasonCommandHandler`, `WorkAreaRepository.GetActivationReadinessAsync` |
| Không 2 mùa ACTIVE chồng lấn | `HasOverlappingActiveSeasonAsync` |

### 1.4. FE

- Nút **"Tạo mùa từ mùa trước"** ở `features/season/SeasonListPage.tsx`.
- Dialog: chọn mùa nguồn (từ `useSeasons()` đã có) → tick/bỏ khu vực, sửa
  tên/ngày → **1 request** `POST /seasons/{id}/clone`.
- Hook `useCloneSeason()` theo mẫu `useSeasonMutation` (đã tự
  `invalidateQueries(seasonKeys.all)`); thêm `setQueryData(seasonKeys.detail(newId), result.season)`
  và `setQueryData` danh sách khu vực mới từ `result.areas` để không phải GET lại.
- Không lặp `useCreateArea`/`useAssignWorkAreaLeader` (các hook đó chỉ dành cho
  tạo tay từng khu vực).

### 1.5. Phương án không sửa BE (demo ngay)

`POST /seasons` + `N × POST /seasons/{id}/work-areas` + `2N × PUT` = **22 request**
với 7 khu vực. Chỉ dùng để demo, **không dùng production**: không nguyên tử, lỗi
giữa đường để lại mùa thiếu khu vực/thiếu người phụ trách → không activate được.

---

## 2. Tính năng B — Bản đồ giáo xứ / khuôn viên nhà thờ

### 2.1. Hiện trạng

- BE: `Parish` chỉ có `Name/Address/Description/Status`; không service nào có
  trường bản đồ/toạ độ.
- Upload ảnh đã có: `POST /api/v1/files/upload-requests` (presigned MinIO) +
  `POST /api/v1/files/{id}/complete` → `FileReferenceDto`; BE chỉ cần lưu `fileId`.
- FE: `ParishMapPage` đã xong UI (ảnh + ghim toạ độ chuẩn hoá 0..1) nhưng lưu
  `localStorage` + `IndexedDB` → **mất khi đổi máy**. Chỉ cần thay `mapStore.*`
  bằng `api()`.

### 2.2. Thiết kế dữ liệu (1 migration, không đụng `work_area`)

```sql
ALTER TABLE parish
  ADD COLUMN map_file_id     UUID          NULL,
  ADD COLUMN map_file_name   VARCHAR(255)  NULL,
  ADD COLUMN map_pins        JSONB         NULL,  -- { "<workAreaId>": { "x": 0.42, "y": 0.61 } }
  ADD COLUMN map_updated_at  TIMESTAMPTZ   NULL;
```

**Vì sao không lưu `map_x/map_y` trên `work_area`:** `SaveChanges` của
`ParishCoordinationDbContext` sinh outbox cho mọi `WorkArea` bị sửa → mỗi lần
kéo ghim sẽ bump `Version` và đẩy snapshot sang task/resource/readiness/reporting
(vô nghĩa, ~2 internal PUT/khu), đồng thời làm cache client sai. Toạ độ là dữ
liệu trình bày nên tách khỏi aggregate.

Đánh đổi: mất FK tới `work_area` → handler phải validate `workAreaId` thuộc giáo
xứ; clone phải map `sourceAreaId → newAreaId` (đã nằm trong handler clone).

### 2.3. Hợp đồng API (batch — 1 request lưu cả ảnh và mọi ghim)

```http
GET    /api/v1/parishes/{parishId}/map   → 200 { fileId, fileName, pins, updatedAt } | 204
PUT    /api/v1/parishes/{parishId}/map   → 200   (ADMIN)
DELETE /api/v1/parishes/{parishId}/map   → 204   (ADMIN)
```

```jsonc
// PUT body — gửi NGUYÊN trạng thái (idempotent, không PATCH từng ghim)
{
  "fileId": "uuid|null",              // null = giữ ảnh hiện tại
  "fileName": "mat-bang-nha-tho.jpg",
  "pins": [
    { "workAreaId": "uuid", "x": 0.42, "y": 0.61 },
    { "workAreaId": "uuid", "x": 0.18, "y": 0.77 }
  ]
}
```

Validation (1 lượt, `422` kèm `errors`):

- `0 <= x,y <= 1`; không trùng `workAreaId`.
- Mọi `workAreaId` thuộc một mùa của `parishId` (1 query join `work_area` ×
  `season`).
- `fileId` (nếu có) đã `complete` — có thể để FE tự đảm bảo cho đơn giản.

Quyền: hiện `POST /api/v1/parishes` cho **cả ADMIN và PARISH**. Nếu bản đồ do
admin thêm khi tạo giáo xứ thì nên **siết tạo giáo xứ về ADMIN**, `PUT /map`
cho ADMIN (hoặc ADMIN + PARISH của chính giáo xứ đó).

### 2.4. Luồng FE (không quá 3 request cho 1 lần lưu ảnh)

```text
1. Chọn ảnh → validate (type/size) → POST /files/upload-requests → PUT MinIO
   → POST /files/{id}/complete                     (3 request, 1 lần/ảnh)
2. Kéo ghim trên canvas (local state, KHÔNG gọi API)
3. Bấm "Lưu" → PUT /parishes/{id}/map { fileId, pins[] }      (1 request)
```

Bỏ `mapStore` (localStorage/IndexedDB) sau khi có API; giữ `ImageReviewCanvas`
(marker theo %), chỉ đổi nguồn dữ liệu.

### 2.5. Tạo giáo xứ + bản đồ

- Khuyến nghị **2 bước** (không phá contract `POST /parishes`): tạo giáo xứ →
  `PUT /parishes/{id}/map`. Màn admin vẫn 1 flow, không cần `multipart`.
- Nếu muốn 1 bước: thêm `mapFileId` vào `CreateParishCommand` và upload trước khi
  tạo — nhưng phải xử lý file mồ côi khi tạo giáo xứ lỗi.

---

## 3. Thứ tự thực hiện & ước lượng

| Bước | Việc | Ước lượng |
|---|---|---|
| 1 | BE: `POST /seasons/{id}/clone` (command + handler + DTO + endpoint + validate) | 4–6 h |
| 2 | BE: test handler (name/year conflict, ngày lệch, khu vực không thuộc mùa nguồn) | 2 h |
| 3 | FE: dialog "Tạo mùa từ mùa trước" + `useCloneSeason` | 3–4 h |
| 4 | BE: migration map + `GET/PUT/DELETE /parishes/{id}/map` | 3–4 h |
| 5 | FE: thay `mapStore` bằng API + nút upload/lưu | 2–3 h |
| 6 | Rà checklist mục 0 trước khi merge | 1 h |

## 4. Kiểm chứng tối thiểu

- Clone: `201` → mùa `PLANNING`, đúng số khu vực, `leaderId/officerId` copy đúng,
  ngày khu vực nằm trong mùa mới; `name`/`seasonYear` trùng → `409`.
- Clone với `areas: []`/`null` → copy toàn bộ; `sourceWorkAreaId` lạ → `422`.
- Sau clone activate được ngay; nếu có khu thiếu người →
  `409 WORK_AREA_ASSIGNMENT_INCOMPLETE` đúng thiết kế.
- Map: `PUT` 5 ghim → `200`, `GET` trả đúng 5 ghim; `x=1.2` → `422`;
  `workAreaId` của giáo xứ khác → `422`.
- Map: `PUT` 5 lần liên tiếp **không** làm tăng `work_area.version`
  (`select version from work_area`).
- Network tab: clone = **1** request, lưu bản đồ = **1** request (sau khi upload ảnh).
