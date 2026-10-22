# GrottoWorks_FE
GrottoWorks Frontend

## Chạy dự án

- **Backend:** `docker compose up -d` trong `GrottoWorks_BE` (gateway ở cổng 6102 — mặc định Vite proxy tới đó).
  Chạy BE native thì đặt `VITE_API_TARGET` (ví dụ `http://localhost:5190`).
- **FE:** `npm install` → `npm run dev`.
- **Tài khoản test:** xem `../ACCOUNTS.md`.

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


