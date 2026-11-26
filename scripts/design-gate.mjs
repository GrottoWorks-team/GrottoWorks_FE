#!/usr/bin/env node
// Gate thiết kế trước khi merge màn hình (F-14).
//
//   node scripts/design-gate.mjs             # lint tĩnh trên màn app: 0 FAIL mới qua
//   node scripts/design-gate.mjs --inspect   # thêm render 1440/768/390 (cần server + Chrome)
//
// Phạm vi: màn hình app (components/shared, components/ui, lib, features/*, pages/*).
// Trang công khai (landing, login, register…) theo hướng "Golden Winter" riêng nên
// không chịu house-style app — xem docs/gate/README.md.
//
// Chạy inspect: cần dev/preview server đang chạy và biến GATE_URL, ví dụ
//   npm run preview -- --port 4173
//   GATE_URL=http://localhost:4173/login npm run gate:inspect
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LINT = join(ROOT, '.github/skills/design-taste-frontend/scripts/lint.mjs')
const INSPECT = join(ROOT, '.github/skills/design-taste-frontend/scripts/inspect.mjs')

// Màn hình KHÔNG thuộc phạm vi gate app: trang công khai + công cụ vẽ 2D/3D.
const EXCLUDE = [
  'src/components/auth/',
  'src/features/landing/',
  'src/features/designer/',
  'src/features/builder/',
  'src/components/shared/WinterBackdrop.tsx',
  'src/components/shared/Snowfall.tsx',
  'src/components/shared/BethlehemStar.tsx',
  'src/pages/Login.tsx',
  'src/pages/Register.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
  'src/pages/VolunteerNotice.tsx',
]

const EXT = new Set(['.ts', '.tsx', '.css'])
const skipped = (path) => EXCLUDE.some((prefix) => path.replace(/\\/g, '/').startsWith(prefix))
const isTest = (path) => /\.test\.[cm]?[jt]sx?$/.test(path)

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'locales') continue
      walk(path, out)
    } else if (EXT.has(path.slice(path.lastIndexOf('.'))) && !isTest(path)) {
      out.push(path)
    }
  }
  return out
}

const files = []
for (const dir of ['src/components', 'src/lib', 'src/features', 'src/pages']) {
  const absolute = join(ROOT, dir)
  try {
    if (statSync(absolute).isDirectory()) {
      files.push(...walk(absolute).filter((path) => !skipped(relative(ROOT, path))))
    }
  } catch {
    // thư mục chưa tồn tại — bỏ qua
  }
}

if (!files.length) {
  console.error('Không tìm thấy file màn hình nào trong phạm vi gate.')
  process.exit(2)
}

console.log(`design-gate: lint ${files.length} file màn hình app (--app)`)
const lint = spawnSync(process.execPath, [LINT, ...files, '--app'], {
  cwd: ROOT,
  stdio: 'inherit',
})
if (lint.status !== 0) {
  console.error('\ndesign-gate: còn FAIL — sửa trước khi merge màn.')
  process.exit(lint.status ?? 1)
}

if (process.argv.includes('--inspect')) {
  const url = process.env.GATE_URL
  if (!url) {
    console.error('design-gate: cần GATE_URL (ví dụ http://localhost:4173/login) để chạy inspect.')
    process.exit(2)
  }
  const outDir = join(ROOT, 'docs/gate/after')
  mkdirSync(outDir, { recursive: true })
  // Trang công khai (login/landing/register) theo hướng "Golden Winter" nên các rule
  // trang trí của house-style app không áp dụng — xem docs/gate/README.md.
  const isPublic = /^https?:\/\/[^/]+\/(login|register|forgot-password|reset-password)?(\/|$|\?)/.test(url)
  const allow = isPublic
    ? ['gradient', 'gradient-text', 'heavy-shadow', 'tiny-text', 'headline-lines', 'micro-label', 'mixed-font-headline', 'font-count', 'app-title-size']
    : []
  const args = [INSPECT, url, '--out', outDir, '--widths', '1440,768,390', '--app']
  if (allow.length) args.push('--allow', allow.join(','))
  console.log(`design-gate: inspect ${url} → docs/gate/after (1440/768/390)${allow.length ? ' [public art rules allowed]' : ''}`)
  const inspect = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  })
  if (inspect.status !== 0) {
    console.error('\ndesign-gate: inspect có FAIL — mở ảnh trong docs/gate/after để xem.')
    process.exit(inspect.status ?? 1)
  }
}

console.log('\ndesign-gate: 0 FAIL.')
