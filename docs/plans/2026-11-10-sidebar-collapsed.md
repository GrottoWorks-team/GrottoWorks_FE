# Sidebar collapses được (thu gọn còn rail icon)

**Ngày lập:** 2026-11-10 · **Người làm:** agy · **Repo:** `GrottoWorks_FE`
**Worktree:** gom chung vào `fe-api-gap` (việc nhỏ, ~1 file + test)
**Độ ưu tiên:** làm xen giữa các đợt, KHÔNG chặn đợt A–I

---

## 1. Yêu cầu

Feedback Khoa (2026-11-10): *"về UI: sidebar cần có collapsed"*.

Hiện `src/components/shared/AppShell.tsx` có `<aside className="flex w-64 shrink-0 ...">` — **luôn rộng 256px, không thu gọn được**. Trên màn 1366×768 (laptop phổ thông) sidebar chiếm 19% chiều ngang, phần nội dung bảng bị ép và phải cuộn ngang.

**Mong muốn:** bấm một nút là sidebar thu còn ~72px chỉ hiện icon, có tooltip; bấm lại mở ra. Nhớ trạng thái giữa các lần tải trang.

---

## 2. Phạm vi (nhỏ, giữ đúng ponytail)

### 2.1. Thêm state + nút toggle

Trong `AppShell`:

```tsx
const COLLAPSE_KEY = 'grotto-sidebar-collapsed'
const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
const toggle = () => setCollapsed((v) => {
  localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
  return !v
})
```

- Dùng `useState` khởi tạo từ `localStorage`, **không** thêm context hay provider — chỉ 1 chỗ đọc.
- Nút đặt ở **header** (cạnh crumb), dùng icon `PanelLeft` / `PanelLeftClose` của lucide, có `aria-label` + `title`, và `aria-expanded={!collapsed}`.

### 2.2. Ô aside đổi bề rộng, có transition

```tsx
<aside className={cn(
  'flex shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out',
  collapsed ? 'w-[72px]' : 'w-64',
)}>
```

### 2.3. Nội dung co lại đúng cách

| Phần | Khi collapsed |
|---|---|
| Logo + tên app | chỉ còn ô `G`, ẩn phần chữ (`{!collapsed && …}`) |
| Tiêu đề nhóm (`g.section`) | ẩn, thay bằng `<div className="my-2 h-px bg-border" />` để còn dấu phân cách |
| Mỗi `NavLink` | `justify-center px-0`, ẩn `<span>` nhãn, ẩn badge số |
| Tooltip | `title={t(item.label)}` trên `NavLink` — đủ dùng, không cần thư viện |
| Khối ghi chú role cuối sidebar | ẩn hoàn toàn khi collapsed |
| Badge gold | ẩn khi collapsed (không đủ chỗ), nhưng giữ `aria-label` có số để trình đọc màn hình đọc được |

**Không** dùng `overflow-hidden` + `whitespace-nowrap` để "cắt chữ" — sẽ có nhấp nháy. Ẩn bằng điều kiện render.

### 2.4. Màn nhỏ thì mặc định thu gọn

```tsx
const [collapsed, setCollapsed] = useState(() => {
  const saved = localStorage.getItem(COLLAPSE_KEY)
  if (saved !== null) return saved === '1'
  return window.matchMedia('(max-width: 1280px)').matches  // chưa từng chọn → theo màn hình
})
```

Chỉ đọc **một lần lúc khởi tạo**, không thêm listener resize (YAGNI — người dùng đã có nút).

### 2.5. i18n

Thêm 2 key vi + en:
```
shell.collapseSidebar   = "Thu gọn thanh bên"   / "Collapse sidebar"
shell.expandSidebar     = "Mở rộng thanh bên"   / "Expand sidebar"
```

---

## 3. Tiêu chí xong

1. `npm test` xanh, `npm run build` xanh.
2. Test mới `src/components/shared/AppShell.test.tsx` (dùng `renderHook`/`render` với `MemoryRouter` + mock `useAuth`), khoá **4 hành vi**:
   - mặc định mở khi màn rộng
   - bấm nút → `aside` có class `w-[72px]`, nhãn menu biến mất
   - bấm lần nữa → trở lại `w-64`
   - `localStorage['grotto-sidebar-collapsed']` được ghi đúng `'1'` / `'0'`
3. `impeccable detect` trên `AppShell.tsx` → **0 finding**.
4. Ảnh E2E 2 trạng thái (mở / thu gọn), khoanh đỏ vùng sidebar, đặt tên
   `2026-11-10-sidebar-open.png`, `2026-11-10-sidebar-collapsed.png`.
5. Không đổi route, không đổi `nav-config`, không đổi quyền.

---

## 4. Rủi ro

- **`data-g-item` / animation stagger**: `NavLink` đang có `style={{ '--d': delayOf(...) }}` cho hiệu ứng vào trang. Giữ nguyên, chỉ thêm `justify-center` — đừng bỏ `style`.
- **Mobile < 768px**: hiện app **không** có menu mobile (sidebar luôn hiện, tràn). Việc này **không** giải quyết mobile — nếu cần thì làm riêng. Ghi rõ trong báo cáo là "chưa xử lý mobile".
- **`SeasonSelect` trên header**: khi cửa sổ hẹp, đã có `px-6` và `gap-2`; thêm nút toggle có thể đẩy tràn. Kiểm ở 1280px, nếu tràn thì ẩn `SeasonSelect` dưới `xl` (chỉ ẩn nhãn, giữ nút).
