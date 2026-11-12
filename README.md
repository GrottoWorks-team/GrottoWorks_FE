# GrottoWorks_FE
GrottoWorks Frontend

## Chạy dự án

- **Backend:** `docker compose up -d` trong `GrottoWorks_BE` (gateway ở cổng 6102 — mặc định Vite proxy tới đó).
- **FE:** `npm install` → `cp .env.example .env` → `npm run dev`.
- **Tài khoản test:** xem `../ACCOUNTS.md`.

## Biến môi trường

Mọi cấu hình theo máy nằm trong `.env` (không commit — mẫu ở `.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `VITE_DEV_PORT` | `5175` | Cổng dev server. Đổi cổng = đổi origin ⇒ mất draft trong `localStorage` (Builder 3D, designer, "đã đọc" thông báo). |
| `VITE_API_TARGET` | `http://localhost:6102` | Gateway mà Vite proxy `/api/v1` tới. BE chạy native (`scripts/be-local.sh`, YARP 5190) thì đổi thành `http://localhost:5190`. |
| `VITE_DEMO_PASSWORD` | *(trống)* | Mật khẩu tài khoản seed để nút "tài khoản demo" ở `/login` tự điền. Để trống ⇒ khối tài khoản demo bị ẩn. |

Chỉ biến có tiền tố `VITE_` mới được nhúng vào bundle browser; đổi `.env` phải restart `npm run dev`.

## Xác thực & phân quyền

- Mọi route theo role đều nằm sau `RequireRole` — **bắt buộc đăng nhập**: chưa có phiên → `/login`, sai role → trang 403.
- Role của BE (`ADMIN | PARISH | LEADER | MO | VOLUNTEER`) được map sang 4 nhánh UI trong `src/lib/auth.tsx`.

## Hai tính năng FE-only (chờ API của BE)

Design Review 2D/3D và Bản đồ giáo xứ lưu dữ liệu ngay trên máy đang chạy:

- metadata ở `localStorage` (`features/designs/localStore.ts`, `features/map/localStore.ts`);
- ảnh/mô hình ở IndexedDB (`lib/blobStore.ts`).

Dữ liệu chỉ tồn tại trên trình duyệt hiện tại, không đồng bộ giữa các máy.

## Lưu ý khi BE chưa chạy

- `QueryClient` trong `src/App.tsx` đặt `retry: 1`, `retryDelay: 300` (mặc định của React Query là 3 lần + backoff ~7s → trang treo ở "Đang tải…").
- Đừng tắt query bằng `enabled: false` rồi gate UI theo `isPending` — query bị tắt vẫn có `isPending === true`.


