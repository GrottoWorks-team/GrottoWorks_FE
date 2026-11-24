# Gate thiết kế trước khi merge màn (F-14)

Gate chạy **trước khi merge** một màn hình: lint house-style trên mã nguồn và (tuỳ chọn)
render thật ở 1440 / 768 / 390 px. Mục tiêu: **0 FAIL** và ảnh phải được mở ra xem.

## Lệnh

```bash
npm run gate:lint     # lint tĩnh màn hình app (0 FAIL mới qua)
npm run gate:inspect  # render thật; cần server + GATE_URL
```

`gate:inspect` cần một server đang chạy và Chrome/Edge/Chromium:

```bash
npm run build
npm run preview -- --port 4173
# cửa sổ khác:
GATE_URL=http://localhost:4173/login npm run gate:inspect
```

Ảnh được ghi vào `docs/gate/after/`.

## Phạm vi

| Trong phạm vi | Ngoài phạm vi (có lý do) |
|---|---|
| `src/components/ui`, `src/components/shared` | `src/components/auth` — trang đăng nhập theo hướng "Golden Winter" |
| `src/lib`, `src/features/*`, `src/pages/*` | `src/features/landing` — trang công khai, art direction riêng |
| Màn hình S-00a → S-14 | `src/features/designer`, `src/features/builder` — công cụ vẽ 2D/3D (gradient là nội dung bản vẽ) |
| | `Login/Register/ForgotPassword/ResetPassword/VolunteerNotice` |

Danh sách loại trừ nằm trong [`scripts/design-gate.mjs`](../../scripts/design-gate.mjs).

## Chụp `before/` và `after/`

1. **Trước khi sửa màn**: chụp hiện trạng vào `docs/gate/before/<màn>/` (1440/768/390).
2. Sửa màn.
3. `npm run gate:lint` → 0 FAIL.
4. `npm run gate:inspect` → ảnh vào `docs/gate/after/<màn>/`.
5. **Mở ảnh ra xem** và ghi nhận xét vào PR (không chỉ dựa vào exit code).

Màn cần đăng nhập: dùng tài khoản demo trong `.env` (xem `ACCOUNTS.md`), chụp thủ công
theo 3 bề rộng rồi đặt vào đúng thư mục. `inspect.mjs` chỉ render URL công khai.

## Kết quả lần chạy gần nhất (24/11/2026)

| Bước | Kết quả |
|---|---|
| `npm run gate:lint` (149 file màn app) | 0 FAIL, 66 WARN |
| `npm run gate:inspect` — `/login` 1440/768/390 | 0 FAIL, 0 WARN |
| `npm test` | 225/225 pass (gồm parity i18n + chặn copy cứng) |

Baseline `before/` chụp từ `HEAD` trước thay đổi: phát hiện 1 FAIL thật — logo
`/pic/Logo_GrottoWorks.png` 404 trên màn đăng nhập. Đã bổ sung asset nên `after/` hết lỗi.

## CI

[`.github/workflows/design-gate.yml`](../../.github/workflows/design-gate.yml) chạy
`npm run lint` (tsc), `npm test` (gồm parity i18n + chặn copy cứng) và `npm run gate:lint`
trên mỗi pull request.
