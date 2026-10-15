# Đặc tả Thiết kế Kỹ thuật: 2D Grotto Studio — Trình Thiết kế Hang đá Trực quan cho Phân khu

- **Tài liệu**: `docs/superpowers/specs/2026-10-15-2d-grotto-designer.md`
- **Ngày lập**: 2026-10-15
- **Tác giả**: nkhoa31
- **Phân hệ**: GrottoWorks Frontend (`GrottoWorks_FE`)
- **Trạng thái**: Đã thống nhất thiết kế (Validated Design)

---

## 1. Bối cảnh & Mục tiêu

### 1.1. Bối cảnh
Trước đây, mỗi Phân khu thi công hang đá (`WorkArea`) trong hệ thống GrottoWorks chỉ có các thông tin dạng chữ và thẻ danh sách cơ bản (`AreaCard`, `AreaDetailDialog`). Mặc dù hệ thống có trang xem bản vẽ mẫu (`DesignReviewPage`), người dùng (Trưởng khu, Ban hành giáo, Tình nguyện viên) chưa có công cụ để **tự tay thiết kế và bố trí hang đá** theo ý tưởng và thực địa của phân khu mình.

### 1.2. Mục tiêu sản phẩm
1. Cung cấp một **Trình thiết kế Hang đá 2D Kéo - Thả (2D Grotto Studio)** trực quan, chạy mượt mà ngay trên trình duyệt web.
2. Trang bị **Thư viện Cấu kiện chuẩn Giáo xứ Giáng sinh** (Vách đá, Tượng thánh & Máng cỏ, Đèn rọi/dây LED, Cây thông & Phụ kiện trang trí).
3. Cho phép người dùng linh hoạt: Kéo thả, di chuyển, phóng to/thu nhỏ, xoay góc, xếp thứ tự lớp trước/sau (`z-index`), và hoàn tác (`Undo`/`Redo`).
4. **Tự động bóc tách danh mục vật tư (Bill of Materials - BOM)** từ bản vẽ thiết kế để chuyển giao cho bộ phận Quản lý Vật tư (`MaterialOfficer`) lập dự trù mua sắm và mượn kho.
5. **Xuất ảnh bản vẽ (PNG)** độ phân giải cao phục vụ việc in ấn A3/A4 dán trực tiếp tại công trường thi công.

---

## 2. Luồng Người dùng & Kiến trúc Điều hướng

### 2.1. Điểm truy cập
1. Tại trang **Khu vực công tác** (`/parish/areas` hoặc `/leader/areas`), trên mỗi thẻ vòm hang đá [`AreaCard`](file:///D:/khoa/GrottoWorks_FE/src/features/areas/components/AreaCard.tsx), người dùng nhấn nút **"Bản thiết kế"**.
2. Hệ thống chuyển hướng tới Studio thiết kế 2D của phân khu:
   - Route: `/parish/areas/:areaId/designer` (hoặc `/leader/areas/:areaId/designer`).
   - Có nút quay lại danh sách khu vực ở thanh tiêu đề trên cùng.

### 2.2. Bố cục 3 Cột (3-Column Studio Workspace)
```
+--------------------------------------------------------------------------------------------------------+
| [<- Quay lại]  Tên Phân khu: Hang Bê-lem Chính  |  [Hoàn tác] [Làm lại]  |  [Xuất ảnh PNG] [Lưu bản vẽ]|
+--------------------------------------------------------------------------------------------------------+
| THƯ VIỆN CẤU KIỆN (260px)   | KHUNG VẼ TƯƠNG TÁC (CANVAS LINH HOẠT)   | THUỘC TÍNH & VẬT TƯ (280px)    |
|                             |                                         |                                |
| [Tab: Đá][Tượng][Đèn][Cây]  | [Lưới tỷ lệ 0.5m]                       | [Tab: Thuộc tính] [Tab: Vật tư]|
| --------------------------- |                                         | ------------------------------ |
| [ Icon: Vòm đá lớn ]        |            * (Sao Bê-lem)               | Vật thể: Vòm đá lớn            |
| [ Icon: Máng cỏ & Tượng ]   |        /=======\                        | Toạ độ: X=500, Y=320           |
| [ Icon: Đèn pha 50W ]       |       /  [+]    \                       | Kích thước: 320 x 240 px       |
| [ Icon: Đàn cừu ]           |      |   (Mẹ)    |                      | Góc xoay: 0 độ                 |
| [ Icon: Cây thông ]         |  (Cừu)          (Cây thông)             | Lớp: [Lên trên] [Xuống dưới]   |
|                             |                                         | ------------------------------ |
| (Kéo hoặc click đúp để đưa  | Zoom: [ - ] 100% [ + ] [Fit] [Lưới: Bật]| Vật tư bóc tách: 1 Vòm đá,     |
|  vào khung vẽ trung tâm)    |                                         | 1 Bộ tượng, 4 Đèn LED...       |
+--------------------------------------------------------------------------------------------------------+
```

---

## 3. Thiết kế Cấu kiện & Thư viện Cấu kiện (Asset Library)

Mỗi cấu kiện trong thư viện tuân theo schema chuẩn:

```ts
export type GrottoAssetCategory = 'ROCKS' | 'STATUES' | 'LIGHTING' | 'DECORATION';

export interface GrottoAssetDef {
  assetId: string;
  name: string;
  category: GrottoAssetCategory;
  defaultWidth: number;
  defaultHeight: number;
  svgIcon: string;
  materialReq: {
    materialName: string;
    defaultQty: number;
    unit: string;
    specs?: string;
  };
}
```

### 3.1. Danh mục Cấu kiện ban đầu (16 cấu kiện phổ biến):
1. **Nhóm Vòm & Vách đá (`ROCKS`)**:
   - `rock-arch-main`: Vòm đá chính Bê-lem (vật tư: 10 cây sắt hộp / tre nứa + 3 cuộn bạt tạo vách).
   - `rock-wall-left`: Vách đá phụ tả ngạn (vật tư: 5 cây tre + 1 cuộn bạt).
   - `rock-wall-right`: Vách đá phụ hữu ngạn (vật tư: 5 cây tre + 1 cuộn bạt).
   - `rock-platform-manger`: Bệ đá đặt máng cỏ (vật tư: 1 bệ gỗ kê 80x50cm).
2. **Nhóm Tượng & Nhân vật (`STATUES`)**:
   - `statue-nativity-core`: Bộ Tượng Thánh Gia (Chúa Hài Đồng, Đức Mẹ, Thánh Giuse) (vật tư: 1 bộ tượng Composite 80cm).
   - `statue-angel-gloria`: Thiên Thần Gloria bay (vật tư: 1 tượng thiên thần + dây cáp treo).
   - `statue-three-kings`: Ba Vua triều bái (vật tư: 1 bộ tượng Ba Vua).
   - `statue-sheep-group`: Đàn chiên cừu 3 con (vật tư: 3 tượng cừu nằm/đứng).
   - `statue-ox-donkey`: Bò và Lừa sưởi ấm Chúa (vật tư: 2 tượng bò lừa).
3. **Nhóm Ánh sáng & Hiệu ứng (`LIGHTING`)**:
   - `light-star-bethlehem`: Ngôi sao Bê-lem phát sáng đỉnh hang (vật tư: 1 khung sao LED 1.2m).
   - `light-spotlight-amber`: Đèn rọi vách ánh sáng vàng ấm (vật tư: 1 đèn pha LED 50W vàng).
   - `light-led-string-warm`: Dây LED giọt nước viền hang (vật tư: 1 cuộn LED 20m).
   - `light-smoke-fog`: Máy tạo khói sương huyền ảo (vật tư: 1 máy khói sân khấu 1000W).
4. **Nhóm Cây cỏ & Trang trí (`DECORATION`)**:
   - `deco-pine-tree-tall`: Cây thông tuyết 2.5m (vật tư: 1 cây thông nhân tạo).
   - `deco-fence-wood`: Hàng rào gỗ bảo vệ (vật tư: 2 mét hàng rào sơn trắng).
   - `deco-snow-blanket`: Thảm bông tuyết nhân tạo (vật tư: 5m thảm tuyết trắng).

---

## 4. Mô hình Dữ liệu Bản vẽ (Data Model Schema)

```ts
export interface GrottoCanvasItem {
  instanceId: string;       // GUID định danh vật thể trên canvas
  assetId: string;          // Khớp mã cấu kiện trong thư viện
  name: string;             // Tên hiển thị
  category: GrottoAssetCategory;
  x: number;                // Toạ độ X (pixel)
  y: number;                // Toạ độ Y (pixel)
  width: number;            // Chiều rộng (pixel)
  height: number;           // Chiều cao (pixel)
  rotation: number;         // Góc xoay (0 - 360 độ)
  zIndex: number;           // Thứ tự lớp vẽ
  opacity: number;          // Độ mờ (0.1 - 1.0)
  materialReq: {
    materialName: string;
    quantity: number;
    unit: string;
  };
}

export interface GrottoDesignDraft {
  areaId: string;
  seasonId?: string;
  title: string;
  realWorldDimension: {
    widthMeters: number;    // Chiều rộng sân thực tế (ví dụ: 10m)
    heightMeters: number;   // Chiều cao trần/hang (ví dụ: 6m)
  };
  canvasWidth: number;      // 1200 px
  canvasHeight: number;     // 800 px
  items: GrottoCanvasItem[];
  updatedAt: string;
  version: number;
}
```

---

## 5. Các Thao tác Tương tác trên Khung vẽ

1. **Thêm phần tử**:
   - Thả kéo (Drag & drop) từ Palette vào toạ độ chuột.
   - Hoặc click chọn cấu kiện trong Palette để chèn vào tâm màn hình.
2. **Chọn & Biến đổi (Selection & Transformation)**:
   - Click vào vật thể để kích hoạt Bounding Box (viền xanh lá `#2f6b4f`).
   - Kéo rê thân vật thể để di chuyển vị trí.
   - Kéo 4 điểm chốt góc để thay đổi kích cỡ (tự động giữ tỷ lệ góc khi nhấn Shift).
   - Kéo núm chốt xoay trên đỉnh để quay góc từ 0 đến 360 độ.
3. **Quản lý Lớp (Z-Index)**:
   - Các nút "Lên trên cùng" (`Bring to Front`), "Xuống dưới cùng" (`Send to Back`), "Tiến 1 lớp", "Lùi 1 lớp".
4. **Phím tắt Thông dụng**:
   - `Delete` hoặc `Backspace`: Xoá phần tử được chọn.
   - `Ctrl + D`: Nhân bản nhanh phần tử (Duplicate).
   - `Ctrl + Z`: Hoàn tác (Undo).
   - `Ctrl + Y` hoặc `Ctrl + Shift + Z`: Làm lại (Redo).
   - Giữ phím `Space` + Kéo chuột: Di chuyển vùng nhìn (Pan canvas).
   - Cuộn chuột: Phóng to / Thu nhỏ (Zoom).

---

## 6. Tính toán Bóc tách Vật tư (Bill of Materials Engine)

Hàm tổng hợp tự động nhóm các vật thể trên canvas theo `materialName`:
$$\text{Tổng số lượng}_m = \sum_{i \in \text{Items}} \text{quantity}(i, m)$$
- Hiển thị bảng tổng hợp vật tư trực quan ngay ở thanh bên phải (Inspector).
- Nút **"Sao chép bảng vật tư"** để paste vào Excel hoặc gửi tin nhắn nhóm.
- Nút **"Tải file CSV"** chuẩn UTF-8 chứa danh sách vật tư cần chuẩn bị.

---

## 7. Xuất Ảnh Bản vẽ (PNG Export)

- Sử dụng cơ chế vẽ phẳng Canvas hoặc thư viện render SVG/Canvas (`html2canvas` hoặc native canvas drawing).
- Thêm khung tiêu đề trang trọng góc dưới:
  - Tên Giáo xứ: *GrottoWorks Demo Parish*
  - Phân khu: *Khu vực #66666666 (Hang Bê-lem Chính)*
  - Ngày xuất: *2026-10-15*
  - Tỷ lệ & Kích thước ước tính.
- Tải file ảnh với tên: `Ban-ve-hang-da-[areaId].png`.

---

## 8. Kế hoạch Kiểm thử & Tiêu chí Nghiệm thu

1. **Unit Tests**:
   - `grotto-designer.test.ts`: Kiểm tra hàm thêm, sửa, xoá, di chuyển phần tử.
   - `bom-calculator.test.ts`: Kiểm tra độ chính xác của hàm tổng hợp vật tư theo danh mục và đơn vị tính.
2. **End-to-End Tests**:
   - Mở route thiết kế của 1 phân khu.
   - Kéo thả cấu kiện vào canvas, kiểm tra bounding box xuất hiện.
   - Thay đổi toạ độ và kiểm tra bảng vật tư tự cập nhật số lượng.
   - Bấm lưu và F5 trang, xác nhận bản vẽ giữ nguyên vẹn.
