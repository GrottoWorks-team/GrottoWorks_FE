# GrottoWorks FE — hướng dẫn cho AI agent

## Skill thiết kế (vendored)

Repo có 2 skill on-demand trong `.github/skills/` (bản cá nhân: `~/.copilot/skills/`):

| Skill | Dùng khi |
|---|---|
| `design-taste-frontend` (tasteskill v2) | Dựng/redesign landing page, marketing site, hero, portfolio, one-pager; hoặc khi người dùng nói trang "generic", "AI-made", "trông giống mọi trang khác", cần "premium/award-level" |
| `impeccable` | Critique, audit, polish, simplify, harden, animate UI; review hierarchy/typography/color/motion/UX copy/accessibility; đúc kết design system (DESIGN.md, tokens) |

Quy tắc:

- Trước khi thiết kế mới hoặc review giao diện, **nạp skill tương ứng** (đọc `SKILL.md` của skill đó) thay vì tự phát minh phong cách.
- Với màn hình nội bộ (dashboard, admin, settings) trong repo này, giữ nguyên design system hiện có (`src/index.css`, Tailwind tokens, component trong `src/components/ui`); skill chỉ dùng để nâng craft, không đổi ngôn ngữ thị giác của sản phẩm.
- Không sửa code BE/mobile khi đang chạy skill UI.

## Yêu cầu môi trường

- Node 22+ (đã có v22.14).
- taste-skill cần Chrome/Edge/Chromium cho `scripts/inspect.mjs` (screenshot + đo house style).
- Windows: gọi CLI impeccable bằng `scripts/impeccable.cmd` (bản bash là `scripts/impeccable`).
- Thư mục làm việc sinh ra khi chạy skill (`.taste-skill/`, `.impeccable/`) đã nằm trong `.gitignore` — không commit.

## Giấy phép

- `design-taste-frontend`: MIT — Leonxlnx/taste-skill (`LICENSE-taste-skill.txt`).
- `impeccable`: Apache-2.0 — pbakaus/impeccable (`LICENSE-impeccable.txt`).
