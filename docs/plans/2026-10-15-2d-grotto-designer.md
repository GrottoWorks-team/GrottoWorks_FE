# 2D Grotto Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng công cụ 2D Grotto Studio (Trình thiết kế hang đá Giáng sinh 2D kéo - thả trực quan) cho từng Phân khu thi công hang đá, tích hợp thư viện cấu kiện chuẩn, tính toán tự động danh mục vật tư (BOM) và xuất ảnh bản vẽ PNG theo tiêu chuẩn thiết kế UI/UX Golden Winter cao cấp.

**Architecture:** Sử dụng kiến trúc module độc lập tại `src/features/designer/` tuân thủ nguyên lý tách biệt trách nhiệm (Separation of Concerns). Tách riêng tầng Asset Data Definitions, BOM Calculation Engine, Canvas State Hook (hỗ trợ Undo/Redo, LocalStorage persistence), và các UI components (AssetPalette, GrottoCanvas với SVG Bounding Box, InspectorPanel, DesignerToolbar). Kết nối với `useArea(areaId)` và route `/parish/areas/:areaId/designer`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React icons, React Router DOM, TanStack React Query, Vitest + Testing Library, tiêu chuẩn thiết kế UI/UX Golden Winter (pine `#2f6b4f`, gold `#d97706`, slate palette).

**Spec:** [`docs/specs/2026-10-15-2d-grotto-designer.md`](file:///D:/khoa/GrottoWorks_FE/docs/specs/2026-10-15-2d-grotto-designer.md)

---

## Global Constraints

- Tuân thủ tuyệt đối quy tắc của dự án trong `AGENTS.md`: commit author `nkhoa31 <276342518+nkhoa31@users.noreply.github.com>`, tuyệt đối không chèn Co-Authored-By AI, không `git push`, chỉ sửa mã nguồn trong `GrottoWorks_FE`.
- Chuẩn hóa thẩm mỹ UI/UX cao cấp (Taste Design / Impeccable / UI-UX Pro Max): hệ màu Golden Winter đồng bộ, typography rõ ràng, phím tắt trực quan, tương tác mượt mà không giật lag.
- Mọi đơn vị đo lường và hiển thị số dùng tabular fonts (`tabular-nums font-mono`).
- TDD: Mọi task logic cốt lõi (assets, BOM engine, state reducer) đều có unit test đi trước.

## Review Focus

1. **Khả năng khôi phục bản vẽ khi reload trang**: Bản vẽ phải tự động lưu vào `localStorage` theo từng `areaId`, không bị mất khi F5 hoặc chuyển trang.
2. **Độ chính xác của thuật toán cộng dồn vật tư (BOM)**: Thống kê đúng số lượng, cộng dồn vật tư cùng tên, không phân biệt hoa thường, tách biệt đơn vị đo lường (`bộ`, `chiếc`, `cây`, `cuộn`).
3. **Thứ tự lớp vẽ (Z-Index)**: Vật thể bên trong hang đá (tượng Chúa, Mẹ Maria) phải hiển thị phía trước hoặc sau vòm đá đúng theo lệnh `bringToFront` / `sendToBack`.
4. **Giữ tỉ lệ khung hình (Aspect Ratio) khi co giãn**: Bounding box hỗ trợ giữ nguyên tỉ lệ khi nhấn giữ phím Shift hoặc mặc định cho các cấu kiện tượng ảnh.
5. **Xuất ảnh bản vẽ (PNG Export)**: Bản vẽ xuất ra phải có khung thông tin phân khu, ngày tháng, không bị cắt xén (clip) các phần tử nằm ngoài viewport hiện tại.

---

## Danh sách Task Triển khai Chi tiết

### Task 1: Core Domain Types & Thư viện Cấu kiện Giáng sinh Chuẩn

**Files:**
- Create: `src/features/designer/types.ts`
- Create: `src/features/designer/assets.ts`
- Test: `src/features/designer/assets.test.ts`

**Interfaces:**
- Produces:
  - `GrottoAssetCategory`: `'ROCKS' | 'STATUES' | 'LIGHTING' | 'DECORATION'`
  - `GrottoAssetDef`: `{ assetId, name, category, defaultWidth, defaultHeight, svgMarkup, materialReq }`
  - `GrottoCanvasItem`: `{ instanceId, assetId, name, category, x, y, width, height, rotation, zIndex, opacity, materialReq }`
  - `GrottoDesignDraft`: `{ areaId, title, canvasWidth, canvasHeight, items, updatedAt, version }`
  - `GROTTO_ASSETS`: `GrottoAssetDef[]` (16 cấu kiện chuẩn)

- [ ] **Step 1: Viết test kiểm tra tính toàn vẹn của thư viện cấu kiện**
  - Tạo `src/features/designer/assets.test.ts`: kiểm tra có đủ 16 cấu kiện, mỗi cấu kiện có `assetId` duy nhất, thuộc 4 danh mục hợp lệ, có kích thước > 0 và thông số `materialReq` đầy đủ.
- [ ] **Step 2: Chạy test để xác nhận test FAIL (do chưa có file code)**
  - Chạy: `npx vitest run src/features/designer/assets.test.ts`
  - Kết quả mong đợi: FAIL (Cannot find module)
- [ ] **Step 3: Định nghĩa types trong `src/features/designer/types.ts` và 16 assets trong `src/features/designer/assets.ts`**
  - Cung cấp SVG markup sắc nét phong cách Golden Winter cho: Vòm đá chính, vách đá phụ, bệ máng cỏ, tượng Chúa Hài Đồng & Máng cỏ, tượng Mẹ Maria, tượng Thánh Giuse, Ba Vua, đàn cừu, bò lừa, thiên thần, sao Bê-lem phát sáng, đèn pha rọi vách, dây LED viền, máy khói sương, cây thông Noel, hàng rào gỗ.
- [ ] **Step 4: Chạy lại test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/assets.test.ts`
  - Kết quả mong đợi: PASS 100%
- [ ] **Step 5: Commit task 1**
  - `git add src/features/designer/types.ts src/features/designer/assets.ts src/features/designer/assets.test.ts`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): dinh nghia types va thu vien 16 cau kien giang sinh"`

---

### Task 2: Bill of Materials (BOM) Calculation Engine & CSV Export

**Files:**
- Create: `src/features/designer/bom.ts`
- Test: `src/features/designer/bom.test.ts`

**Interfaces:**
- Consumes: `GrottoCanvasItem` từ Task 1
- Produces:
  - `MaterialSummaryItem`: `{ materialName: string; totalQuantity: number; unit: string; itemsCount: number }`
  - `calculateBOM(items: GrottoCanvasItem[]): MaterialSummaryItem[]`
  - `exportBOMToCsv(summary: MaterialSummaryItem[], areaName?: string): string`

- [ ] **Step 1: Viết failing test cho hàm tính toán BOM và xuất CSV**
  - Tạo `src/features/designer/bom.test.ts`: test cộng dồn nhiều vật thể cùng loại (ví dụ 3 đàn cừu = 9 con cừu), test danh sách rỗng, test format CSV có UTF-8 BOM `\uFEFF`.
- [ ] **Step 2: Chạy test để xác nhận FAIL**
  - Chạy: `npx vitest run src/features/designer/bom.test.ts`
  - Kết quả mong đợi: FAIL
- [ ] **Step 3: Cài đặt logic trong `src/features/designer/bom.ts`**
  - Triển khai `calculateBOM` dùng `Map<string, MaterialSummaryItem>` gộp theo `materialName.toLowerCase()`.
  - Triển khai `exportBOMToCsv` xuất chuỗi định dạng CSV chuẩn tiếng Việt.
- [ ] **Step 4: Chạy test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/bom.test.ts`
  - Kết quả mong đợi: PASS
- [ ] **Step 5: Commit task 2**
  - `git add src/features/designer/bom.ts src/features/designer/bom.test.ts`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): cai dat bom engine tinh toan vat tu va xuat csv"`

---

### Task 3: Canvas State Management Hook với Undo/Redo & LocalStorage

**Files:**
- Create: `src/features/designer/useDesignerState.ts`
- Test: `src/features/designer/useDesignerState.test.ts`

**Interfaces:**
- Consumes: `GrottoAssetDef`, `GrottoCanvasItem`, `GrottoDesignDraft` từ Task 1
- Produces:
  - Hook `useDesignerState(areaId: string, initialTitle?: string)`
  - State & Actions: `{ items, selectedId, canUndo, canRedo, zoom, pan, gridSnap, addItem, updateItem, removeItem, duplicateItem, bringToFront, sendToBack, undo, redo, setZoom, setPan, setGridSnap, saveDraft, resetDraft }`

- [ ] **Step 1: Viết test cho `useDesignerState`**
  - Tạo `src/features/designer/useDesignerState.test.ts`: test thêm item, di chuyển item, xoá item, undo/redo hoạt động đúng, lưu và nạp từ localStorage.
- [ ] **Step 2: Chạy test để xác nhận FAIL**
  - Chạy: `npx vitest run src/features/designer/useDesignerState.test.ts`
  - Kết quả mong đợi: FAIL
- [ ] **Step 3: Triển khai hook trong `src/features/designer/useDesignerState.ts`**
  - Sử dụng Reducer hoặc State với history stack (tối đa 30 trạng thái).
  - Tự động debounce lưu vào `localStorage.getItem('grotto-design-${areaId}')`.
- [ ] **Step 4: Chạy test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/useDesignerState.test.ts`
  - Kết quả mong đợi: PASS
- [ ] **Step 5: Commit task 3**
  - `git add src/features/designer/useDesignerState.ts src/features/designer/useDesignerState.test.ts`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): hook quan ly state canvas voi undo redo va persistence"`

---

### Task 4: Interactive Canvas Component & SVG Bounding Box

**Files:**
- Create: `src/features/designer/components/CanvasItemView.tsx`
- Create: `src/features/designer/components/GrottoCanvas.tsx`
- Test: `src/features/designer/components/GrottoCanvas.test.tsx`

**Interfaces:**
- Consumes: `useDesignerState` từ Task 3, `GrottoCanvasItem` từ Task 1
- Produces:
  - `<GrottoCanvas />`: Viewport lưới toạ độ, xử lý mouse down/move/up để drag vật thể, 4 góc resize handle, 1 rotate handle trên đỉnh.
  - Phím tắt tương tác: `Delete`, `Ctrl+Z`, `Ctrl+Y`, `Ctrl+D`, `Space` + pan, cuộn chuột zoom.

- [ ] **Step 1: Viết test render canvas và chọn vật thể**
  - Tạo `src/features/designer/components/GrottoCanvas.test.tsx`: test canvas render đúng danh sách items theo zIndex, click chọn item kích hoạt bounding box, nhấn phím Delete kích hoạt xoá.
- [ ] **Step 2: Chạy test để xác nhận FAIL**
  - Chạy: `npx vitest run src/features/designer/components/GrottoCanvas.test.tsx`
  - Kết quả mong đợi: FAIL
- [ ] **Step 3: Triển khai `CanvasItemView.tsx` và `GrottoCanvas.tsx`**
  - Giao diện nền lưới chuẩn xác (lưới 20px / 40px), điểm neo bám dính Snap to Grid.
  - Viền chọn màu xanh thông `#2f6b4f` với các handle bo tròn màu trắng viền xanh, shadow nổi khối.
- [ ] **Step 4: Chạy test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/components/GrottoCanvas.test.tsx`
  - Kết quả mong đợi: PASS
- [ ] **Step 5: Commit task 4**
  - `git add src/features/designer/components/CanvasItemView.tsx src/features/designer/components/GrottoCanvas.tsx src/features/designer/components/GrottoCanvas.test.tsx`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): component khung ve canvas tuong tac kem bounding box"`

---

### Task 5: Thư viện Cấu kiện (AssetPalette) & Bảng Thuộc tính/Vật tư (InspectorPanel)

**Files:**
- Create: `src/features/designer/components/AssetPalette.tsx`
- Create: `src/features/designer/components/InspectorPanel.tsx`
- Test: `src/features/designer/components/AssetPalette.test.tsx`

**Interfaces:**
- Consumes: `GROTTO_ASSETS` từ Task 1, `calculateBOM` & `exportBOMToCsv` từ Task 2, state từ Task 3
- Produces:
  - `<AssetPalette onSelectAsset={...} />`: Cột trái 260px, 4 tab icon danh mục, ô tìm kiếm, preview thẻ cấu kiện kèm nhãn tiếng Việt.
  - `<InspectorPanel selectedItem={...} allItems={...} onUpdate={...} />`: Cột phải 280px, tab "Thuộc tính" (X, Y, W, H, Rotation, Lớp trước/sau) và tab "Bóc tách Vật tư" (BOM table, nút Copy, nút Xuất CSV).

- [ ] **Step 1: Viết test cho `AssetPalette`**
  - Tạo `src/features/designer/components/AssetPalette.test.tsx`: test chuyển tab hiển thị đúng nhóm cấu kiện, lọc tìm kiếm theo từ khoá "sao", click chọn cấu kiện gọi callback.
- [ ] **Step 2: Chạy test để xác nhận FAIL**
  - Chạy: `npx vitest run src/features/designer/components/AssetPalette.test.tsx`
  - Kết quả mong đợi: FAIL
- [ ] **Step 3: Triển khai `AssetPalette.tsx` và `InspectorPanel.tsx`**
  - Thiết kế theo phong cách Golden Winter (Frosted Glass panels, Card hover elevation, Badge hiển thị số lượng vật tư màu hổ phách `#d97706`).
- [ ] **Step 4: Chạy test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/components/AssetPalette.test.tsx`
  - Kết quả mong đợi: PASS
- [ ] **Step 5: Commit task 5**
  - `git add src/features/designer/components/AssetPalette.tsx src/features/designer/components/InspectorPanel.tsx src/features/designer/components/AssetPalette.test.tsx`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): asset palette thu vien va inspector panel vat tu bom"`

---

### Task 6: Top Toolbar, Xuất Ảnh PNG & Trang Giao diện Chính (GrottoDesignerPage)

**Files:**
- Create: `src/features/designer/components/DesignerToolbar.tsx`
- Create: `src/features/designer/pages/GrottoDesignerPage.tsx`
- Test: `src/features/designer/pages/GrottoDesignerPage.test.tsx`

**Interfaces:**
- Consumes: Toàn bộ component từ Task 1 - Task 5, hook `useArea(areaId)` từ `src/features/areas/api.ts`
- Produces:
  - `<DesignerToolbar />`: Nút Quay lại, Tên phân khu, Nút Undo/Redo (disabled khi không có lịch sử), Nút Snap Lưới, Nút Xuất PNG, Nút Lưu bản vẽ.
  - `<GrottoDesignerPage />`: Màn hình Studio hoàn chỉnh kết nối 3 cột không gian làm việc.

- [ ] **Step 1: Viết test render màn hình chính `GrottoDesignerPage`**
  - Tạo `src/features/designer/pages/GrottoDesignerPage.test.tsx`: kiểm tra render đủ 3 cột, hiển thị tên phân khu từ hook `useArea`, nút lưu hiển thị toast thông báo.
- [ ] **Step 2: Chạy test để xác nhận FAIL**
  - Chạy: `npx vitest run src/features/designer/pages/GrottoDesignerPage.test.tsx`
  - Kết quả mong đợi: FAIL
- [ ] **Step 3: Triển khai `DesignerToolbar.tsx` và `GrottoDesignerPage.tsx`**
  - Triển khai hàm xuất ảnh PNG trực tiếp từ Canvas DOM / SVG renderer với khung tiêu đề trang trọng góc ảnh.
  - Toast thông báo "Đã lưu bản thiết kế thành công!".
- [ ] **Step 4: Chạy test để xác nhận PASS**
  - Chạy: `npx vitest run src/features/designer/pages/GrottoDesignerPage.test.tsx`
  - Kết quả mong đợi: PASS
- [ ] **Step 5: Commit task 6**
  - `git add src/features/designer/components/DesignerToolbar.tsx src/features/designer/pages/GrottoDesignerPage.tsx src/features/designer/pages/GrottoDesignerPage.test.tsx`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(designer): man hinh studio chinh kem toolbar va xuat anh png"`

---

### Task 7: Tích hợp Điều hướng & Route Hệ thống

**Files:**
- Modify: `src/features/areas/components/AreaCard.tsx`
- Modify: `src/App.tsx` (hoặc routing configuration)
- Test: `src/features/areas/components/AreaCard.test.tsx`

**Interfaces:**
- Consumes: `<GrottoDesignerPage />` từ Task 6
- Produces:
  - Nút **"Bản thiết kế"** trên thẻ `AreaCard` điều hướng trực tiếp sang route `/parish/areas/:areaId/designer`.
  - Đăng ký route trong App Router.

- [ ] **Step 1: Cập nhật test `AreaCard.test.tsx` kiểm tra link điều hướng sang designer**
  - Chạy: `npx vitest run src/features/areas/components/AreaCard.test.tsx`
- [ ] **Step 2: Cập nhật route trong router và nút trên `AreaCard.tsx`**
  - Đổi `to={/parish/areas/${area.id}/designer}` hoặc điều hướng theo vai trò người dùng.
- [ ] **Step 3: Chạy test toàn bộ suite và build production**
  - Chạy: `npm run build`
  - Kết quả: Mã thoát 0, 0 lỗi TypeScript.
- [ ] **Step 4: Commit task 7**
  - `git add src/features/areas/components/AreaCard.tsx src/App.tsx`
  - `git commit --author="nkhoa31 <276342518+nkhoa31@users.noreply.github.com>" -m "feat(routes): tich hop dieu huong ban thiet ke vao 2d grotto studio"`
