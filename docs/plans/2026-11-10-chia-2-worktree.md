# Gắn API còn thiếu — Chia 2 worktree (Đợt A–E và F–I)

**Ngày lập:** 2026-11-10 · **Người làm:** agy (2 terminal song song) · **PM:** Claude
**Repo:** `GrottoWorks_FE` · **Nhánh:** `khoa`

Bản gốc đầy đủ: `docs/plans/2026-11-10-gan-api-con-thieu.md` (đọc file đó trước).
File này chỉ chia việc và chốt ranh giới file để 2 nhánh **không đụng nhau**.

---

## 0. Hai worktree

| Worktree | Đợt | Nhánh | Phạm vi |
|---|---|---|---|
| **`fe-api-gap`** (đang chạy) | 0, A, B, C, D, E | `puck67/fe-api-gap` | Nhiệm vụ, kiểm tra điều kiện, mùa, dashboard, mua sắm, hỗ trợ |
| **`fe-api-gap-2`** (mới) | 0′, F, G, H, I | `puck67/fe-api-gap-2` | Chấm công duyệt, quản trị user, file/exports, phần lẻ + sidebar |

**Cả hai đều bắt đầu ở đợt 0** (role mapping) — nhưng chỉ **worktree 1 được commit `roleMapping.ts`**.
Worktree 2 **không tạo lại**, chỉ `git pull` sau khi worktree 1 push xong.

> Nếu worktree 2 chạy trước khi worktree 1 push `roleMapping.ts`: cứ làm phần khác trước, đợt 0′ để cuối.

---

## 1. Ranh giới file — BẮT BUỘC, để không conflict

| Đường dẫn | Worktree 1 | Worktree 2 |
|---|---|---|
| `src/lib/roleMapping.ts` + test | ✅ tạo | ❌ không sửa |
| `src/features/tasks/**` | ✅ | ❌ |
| `src/features/readiness/**` | ✅ tạo | ❌ |
| `src/features/season/**` | ✅ | ❌ |
| `src/features/dashboards/**` | ✅ | ❌ |
| `src/features/purchases/**` | ✅ | ❌ |
| `src/features/materials/**` | ✅ | ❌ |
| `src/features/support/**` | ✅ | ❌ |
| `src/features/timesheets/**` | ❌ | ✅ |
| `src/features/attendance/**` | ❌ | ✅ tạo |
| `src/features/parish/pages/AccountsPage.tsx` | ❌ | ✅ |
| `src/components/shared/AppShell.tsx` (sidebar) | ❌ | ✅ |
| `src/components/shared/FileUploadButton.tsx` | ❌ | ✅ tạo |
| `src/features/reports/**` (exports) | ❌ | ✅ |
| `src/types/index.ts` | ⚠️ **xung đột được** | ⚠️ **xung đột được** |
| `src/locales/vi.json`, `en.json` | ⚠️ **xung đột được** | ⚠️ **xung đột được** |

### Cách xử lý 3 file hay đụng

1. **`src/types/index.ts`** — mỗi bên thêm khối type **riêng, ngăn bằng comment dấu mốc**:
   ```ts
   // ══════ [fe-api-gap] Đợt A–E ══════
   …
   // ══════ [/fe-api-gap] ══════
   ```
   Bên kia dùng mốc `[fe-api-gap-2]`. Merge theo mốc, không đụng phần của nhau.
2. **`src/locales/*.json`** — thêm key **theo nhóm tiền tố riêng**:
   - WT1: `features.readiness.*`, `features.tasks.*` (mới), `features.purchases.*`
   - WT2: `features.attendance.*`, `features.accounts.*`, `features.files.*`
   Không sửa key có sẵn của nhau.
3. **`docs/plans/`** — mỗi bên chỉ đọc, không sửa plan.

**Việc đầu tiên của MỖI worktree sau `git pull`:**
```bash
grep -n "══════ \[" src/types/index.ts src/locales/vi.json | head
```
Thấy mốc của bên kia → **không xoá**, chỉ thêm mốc của mình.

---

## 2. Worktree 1 — Đợt A–E (đã có plan gốc, giữ nguyên)

Chi tiết ở `2026-11-10-gan-api-con-thieu.md` mục 3. Không thay đổi gì.

---

## 3. Worktree 2 — Đợt F, G, H, I + sidebar

### Đợt F — Chấm công duyệt (6 route, LEADER)
| Endpoint | Role |
|---|---|
| `GET /work-areas/{id}/attendance-requests` | Leader |
| `POST /attendance-requests/{id}/approve` | Leader |
| `POST /attendance-requests/{id}/reject` | Leader |
| `GET /work-areas/{id}/attendance-corrections` | Leader |
| `POST /attendance-corrections/{id}/approve` | Leader |
| `POST /attendance-corrections/{id}/reject` | Leader |
| `GET /attendance/open-sessions` | Admin, Leader |

**UI:** mở rộng `src/features/timesheets/pages/TimesheetPage.tsx` — thêm tab "Chờ duyệt" với 2 bảng (yêu cầu chấm công, yêu cầu sửa công) + nút Duyệt/Từ chối.

### Đợt G — Quản trị user (4 route, ADMIN → `/parish/*`)
| Endpoint | Role |
|---|---|
| `PATCH /admin/users/{id}` | Admin |
| `PUT /admin/users/{id}/role` | Admin |
| `POST /admin/users/{id}/lock` | Admin |
| `POST /admin/users/{id}/unlock` | Admin |

**UI:** `AccountsPage.tsx` đã có danh sách + công tắc khoá. Thêm: sửa hồ sơ, đổi role (dialog), khoá/mở khoá gọi route thật thay vì `PATCH status` cũ nếu đang có.

### Đợt H — File & xuất dữ liệu (8 route)
| Endpoint | Role |
|---|---|
| `POST /files/upload-requests` | mọi role |
| `GET /files/{id}` | mọi role |
| `POST /files/{id}/complete` | mọi role |
| `GET /files/{id}/download-url` | mọi role |
| `POST /report-exports` | Parish |
| `GET /report-exports/{id}` | Parish |
| `GET /report-exports/{id}/file` | Parish |
| `GET /system-data-exports` | Admin |

**UI:** component dùng chung `src/components/shared/FileUploadButton.tsx` — luồng 3 bước:
1. `POST /files/upload-requests` → nhận `uploadUrl` + `fileId`
2. `PUT uploadUrl` (S3/MinIO, **không** qua gateway, không kèm Authorization)
3. `POST /files/{id}/complete`

Rồi `GET /files/{id}/download-url` để hiện link tải.

> **Cảnh báo**: URL có thể trỏ `localhost:9000` hoặc R2. Test thật, nếu hỏng thì báo BE — **không tự đổi URL**.

### Đợt I — Phần lẻ (16 route)
`GET /backups`, `GET /backups/{id}`, `PATCH/DELETE /notification-rules/{id}`, `GET /activity-logs/{id}`, `GET /resource-history/{type}/{id}`, `GET/PUT /users/me/notification-preferences`, `PATCH /donors/{id}`, `POST /inventory-adjustments`, `POST /borrowed-items/{id}/incidents`, `POST /donations/{id}/receipts`, `PATCH /contribution-types/{id}`, `POST /recognition-rules/{id}/deactivate`, `GET/PUT /work-areas/{id}/progress`, `GET /work-areas/{id}/readiness-checks`.

### Sidebar collapse
Theo `docs/plans/2026-11-10-sidebar-collapsed.md` (đã giao, làm xen).

---

## 4. BÁO CÁO HTML — bắt buộc, đúng form

> Khoa nhắc 2026-11-10: **"làm báo cáo html theo đúng format nhá, cái đó có trong rule chưa, chưa thì thêm vô, cả agy hay quên lắm"**.

Quy tắc **đã có** trong `.claude/skills/grottoworks-workflow/SKILL.md` mục "MẪU BÁO CÁO CHUẨN",
nhưng agy vẫn quên. Nên từ nay **mỗi đợt xong phải nộp đúng 5 thứ**:

1. **Một `<section class="day" id="d2026-11-10-<slug>">`** thêm vào `reports/index.html`, dùng **đúng khung**
   trong SKILL.md (khung HTML đầy đủ ở mục "MẪU BÁO CÁO CHUẨN"). Không tự chế class.
2. **Mục lục**: thêm `<li>` tương ứng trong `<ol>` của TOC.
3. **Bảng bước kiểm thử 4 cột** cho **từng endpoint**: `Bước | Thao tác & URL | Kết quả mong đợi | Kết quả thực tế`.
4. **1 ảnh khoanh đỏ cho mỗi endpoint**, nhãn `<b>Khoanh đỏ <METHOD> /api/v1/...</b>`.
5. **Chạy 3 lệnh tự kiểm** rồi dán kết quả vào báo cáo:

```bash
# (a) không class rác — phải ra []
python - <<'EOF'
import re,io
s=io.open('reports/index.html',encoding='utf-8').read()
css=s[:s.find('</style>')]
used={c for m in re.finditer(r'class="([^"]+)"',s) for c in m.group(1).split()}
print([c for c in sorted(used) if '.'+c not in css])
EOF

# (b) số section == số mục TOC
grep -c '<section class="day"' reports/index.html
grep -c 'toc-title' reports/index.html

# (c) đếm pixel đỏ từng ảnh mới (ảnh trắng = chưa đạt)
```

**Sau khi PM duyệt** mới chạy sanitize + deploy:
```bash
node tmp/report-deploy/sanitize.js reports/index.html tmp/report-deploy/deploy/index.html
cd tmp/report-deploy/deploy && vercel deploy --yes --prod
```

**Không được** tự deploy trước khi PM kiểm form.

---

## 5. Mốc báo cáo cho PM

Mỗi đợt xong, agy gửi **một dòng**:
```
DOT <X> xong: <commit> | test <n>/<n> | build <s> | anh E2E <tên file> | bao cao section <id>
```
qua `orca terminal send --terminal term_31e9b944-2592-43b9-aa11-1b5b9f8c5486`.

PM sẽ audit từng đợt: đọc diff, chạy test/build độc lập, `curl` endpoint, đếm pixel đỏ.
