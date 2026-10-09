// MSW handlers: auth (login/me/logout), 3 dashboard summary, activity,
// backup export + CRUD generic cho mọi resource key mảng của seed
// (src/mocks/seed.ts). Mọi mutation persist qua src/lib/db.ts và ghi thêm
// 1 dòng ActivityLog (actor suy từ Bearer token).
import { http, HttpResponse } from 'msw'
import { loadDb, saveDb } from '../lib/db'

// Structural: khớp cả Request của DOM lẫn request object của MSW.
type HasHeaders = { headers: { get(name: string): string | null } }

// prefix id cho nextId: 'users' → 'u41', 'tasks' → 't41', ...
const PREFIX: Record<string, string> = {
  users: 'u',
  seasons: 's',
  communities: 'c',
  areas: 'a',
  tasks: 't',
  volunteerRegs: 'vr',
  materials: 'm',
  purchaseRequests: 'pr',
  purchaseRecords: 'pc',
  donations: 'd',
  borrowedItems: 'b',
  allocations: 'al',
    timesheets: 'ts',
  supportRequests: 'sr',
  supportRegs: 'srg',
  checklists: 'cl',
  activityLogs: 'log',
}

// label tiếng Việt cho ActivityLog action, theo style seed.
const LABEL: Record<string, string> = {
  users: 'người dùng',
  parish: 'giáo xứ',
  communities: 'giáo khu',
  areas: 'khu',
  tasks: 'nhiệm vụ',
  volunteerRegs: 'đăng ký tình nguyện',
  materials: 'vật tư',
  purchaseRequests: 'đề nghị mua',
  purchaseRecords: 'hồ sơ mua',
  donations: 'quà tặng',
  borrowedItems: 'đồ mượn',
  allocations: 'phân bổ',
    timesheets: 'chấm công',
  supportRequests: 'yêu cầu hỗ trợ',
  supportRegs: 'đăng ký hỗ trợ',
  checklists: 'checklist',
  skills: 'kỹ năng',
}

function nextId(db: any, resource: string): string {
  const prefix = PREFIX[resource] ?? resource.charAt(0)
  let max = 0
  for (const row of db[resource] ?? []) {
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(String(row?.id ?? ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return prefix + (max + 1)
}

function tokenUser(db: any, request: HasHeaders): any {
  const id = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+demo-/i, '')
  return id ? db.users.find((u: any) => u.id === id) : undefined
}

function logMutation(db: any, request: HasHeaders, resource: string, verb: string, target: string): void {
  if (resource === 'activityLogs') return // không log cho chính bảng log
  const actor = tokenUser(db, request)?.id ?? 'u1'
  db.activityLogs.push({
    id: nextId(db, 'activityLogs'),
    at: new Date().toISOString().replace('Z', ''),
    actor,
    action: `${verb} ${LABEL[resource] ?? resource}`,
    target,
  })
}

// Vật tư: received/status là field suy diễn — tính lại khi write để db luôn nhất quán.
function refreshMaterial(m: any): void {
  m.received = (m.existing ?? 0) + (m.purchased ?? 0) + (m.donatedReceived ?? 0)
  const short = m.required - m.received
  m.status = short <= 0 ? 'ENOUGH' : short <= (m.donatedPledged ?? 0) ? 'INCOMING' : 'SHORTAGE'
}

// "Tuần hiện tại" deterministic: 7 ngày tính từ ngày chấm công cuối cùng của db.
function weekFrom(db: any): string {
  const dates: string[] = db.timesheets.map((t: any) => t.date).sort()
  if (!dates.length) return '0000-00-00'
  const from = new Date(dates[dates.length - 1])
  from.setDate(from.getDate() - 6)
  return from.toISOString().slice(0, 10)
}

export function committeeSummary(db: any) {
  const from = weekFrom(db)
  const pledged = db.donations.filter(
    (d: any) => d.promisedQty && d.status !== 'CANCELED' && d.status !== 'UNUSABLE',
  )
  const promisedQty = pledged.reduce((s: number, d: any) => s + d.promisedQty, 0)
  const receivedQty = pledged.reduce((s: number, d: any) => s + (d.receivedQty ?? 0), 0)
  return {
    materialsShortage: db.materials.filter((m: any) => m.status === 'SHORTAGE').length,
    pendingPurchases: db.purchaseRequests.filter((p: any) => p.status === 'PENDING').length,
    donationPercent: promisedQty ? Math.round((receivedQty / promisedQty) * 100) : 0,
    weekHours: db.timesheets
      .filter((t: any) => t.date >= from)
      .reduce((s: number, t: any) => s + (t.hours ?? 0), 0),
    pendingVolunteers: db.volunteerRegs.filter((v: any) => v.status === 'PENDING').length,
    openSupportRequests: db.supportRequests.filter((r: any) => r.status === 'OPEN').length,
    areas: db.areas.map((a: any) => ({
      id: a.id,
      name: a.name,
      progress: a.progress,
      status: a.status,
      volunteerCount: a.volunteerCount,
      taskCount: a.taskCount,
    })),
  }
}

export function leaderSummary(db: any, request: HasHeaders) {
  const me = tokenUser(db, request) ?? db.users.find((u: any) => u.role === 'LEADER')
  const area = db.areas.find((a: any) => a.leaderId === me.id) ?? null
  const from = weekFrom(db)
  if (!area) {
    return { area: null, taskCounts: {}, volunteerCount: 0, materialsShortage: 0, weekHours: 0, pendingVolunteers: 0, checklist: { done: 0, total: 0 } }
  }
  const areaTasks = db.tasks.filter((t: any) => t.areaId === area.id)
  const taskCounts: Record<string, number> = {}
  for (const t of areaTasks) taskCounts[t.status] = (taskCounts[t.status] ?? 0) + 1
  const volunteerIds = new Set<string>(areaTasks.flatMap((t: any) => t.assignees))
  return {
    area,
    taskCounts,
    volunteerCount: area.volunteerCount,
    materialsShortage: db.materials.filter(
      (m: any) => m.areaId === area.id && m.status === 'SHORTAGE',
    ).length,
    weekHours: db.timesheets
      .filter((t: any) => t.date >= from && volunteerIds.has(t.volunteerId))
      .reduce((s: number, t: any) => s + (t.hours ?? 0), 0),
    pendingVolunteers: db.volunteerRegs.filter(
      (v: any) => v.status === 'PENDING' && areaTasks.some((t: any) => t.id === v.taskId),
    ).length,
    checklist: {
      done: db.checklists.filter((c: any) => c.areaId === area.id && c.done).length,
      total: db.checklists.filter((c: any) => c.areaId === area.id).length,
    },
  }
}

export function officerSummary(db: any, request: HasHeaders) {
  const me = tokenUser(db, request) ?? db.users.find((u: any) => u.role === 'MATERIAL_OFFICER')
  const area = db.areas.find((a: any) => a.officerId === me.id) ?? null
  const from = weekFrom(db)
  if (!area) return { area: null, shortageList: [], pendingPurchases: [], weekHours: 0 }
  const areaMaterials = db.materials.filter((m: any) => m.areaId === area.id)
  const volunteerIds = new Set<string>(
    db.tasks.filter((t: any) => t.areaId === area.id).flatMap((t: any) => t.assignees),
  )
  return {
    area,
    shortageList: areaMaterials
      .filter((m: any) => m.required - m.received > 0)
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        unit: m.unit,
        short: m.required - m.received,
        status: m.status,
      })),
    pendingPurchases: db.purchaseRequests
      .filter(
        (p: any) =>
          p.status === 'PENDING' &&
          p.materialIds.some((id: string) => areaMaterials.some((m: any) => m.id === id)),
      )
      .map((p: any) => ({ id: p.id, total: p.total, note: p.note })),
    weekHours: db.timesheets
      .filter((t: any) => t.date >= from && volunteerIds.has(t.volunteerId))
      .reduce((s: number, t: any) => s + (t.hours ?? 0), 0),
  }
}

// CRUD generic: GET list, GET :id, POST (id = prefix+(max+1)), PATCH :id, DELETE :id.
const crud = (resource: string) => [
  http.get(`/api/${resource}`, () => HttpResponse.json(loadDb()[resource])),
  http.get(`/api/${resource}/:id`, ({ params }) => {
    const row = loadDb()[resource].find((r: any) => r.id === params.id)
    return row ? HttpResponse.json(row) : new HttpResponse(null, { status: 404 })
  }),
  http.post(`/api/${resource}`, async ({ request }) => {
    const db = loadDb()
    const body = (await request.json()) as any
    body.id = nextId(db, resource)
    if (resource === 'materials') refreshMaterial(body)
    db[resource].push(body)
    logMutation(db, request, resource, 'tạo', body.id)
    saveDb(db)
    return HttpResponse.json(body, { status: 201 })
  }),
  http.patch(`/api/${resource}/:id`, async ({ params, request }) => {
    const db = loadDb()
    const i = db[resource].findIndex((r: any) => r.id === params.id)
    if (i < 0) return new HttpResponse(null, { status: 404 })
    db[resource][i] = { ...db[resource][i], ...((await request.json()) as Record<string, unknown>) }
    if (resource === 'materials') refreshMaterial(db[resource][i])
    logMutation(db, request, resource, 'cập nhật', String(params.id))
    saveDb(db)
    return HttpResponse.json(db[resource][i])
  }),
  http.delete(`/api/${resource}/:id`, ({ params, request }) => {
    const db = loadDb()
    const i = db[resource].findIndex((r: any) => r.id === params.id)
    if (i < 0) return new HttpResponse(null, { status: 404 })
    db[resource] = db[resource].filter((r: any) => r.id !== params.id)
    logMutation(db, request, resource, 'xoá', String(params.id))
    saveDb(db)
    return new HttpResponse(null, { status: 204 })
  }),
]

export const handlers = [
  // Auth — mật khẩu demo chung: 'grotto'.
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as { email?: string; password?: string }
    const u = loadDb().users.find((x: any) => x.email === email && !x.locked)
    if (!u || password !== 'grotto') {
      return HttpResponse.json({ message: 'Email hoặc mật khẩu không đúng' }, { status: 401 })
    }
    return HttpResponse.json({ token: `demo-${u.id}`, user: u })
  }),
  http.get('/api/auth/me', ({ request }) => {
    const u = tokenUser(loadDb(), request)
    return u ? HttpResponse.json(u) : new HttpResponse(null, { status: 401 })
  }),
  http.post('/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  // Dashboard summaries.
  http.get('/api/dashboard/community', () => HttpResponse.json(committeeSummary(loadDb()))),
  http.get('/api/dashboard/leader', ({ request }) =>
    HttpResponse.json(leaderSummary(loadDb(), request)),
  ),
  http.get('/api/dashboard/material-officer', ({ request }) =>
    HttpResponse.json(officerSummary(loadDb(), request)),
  ),
  // 50 dòng activity mới nhất (mới nhất đứng đầu).
  http.get('/api/activity', () => HttpResponse.json(loadDb().activityLogs.slice(-50).reverse())),
  // Backup: toàn bộ db dạng JSON.
  http.post('/api/export/backup', () =>
    HttpResponse.json(loadDb(), {
      headers: { 'Content-Disposition': 'attachment; filename="grottoworks-backup.json"' },
    }),
  ),
  // seed key object đơn / mảng chuỗi — mock layer loại trừ khỏi crud() generic.
  http.post('/api/skills', async ({ request }) => {
    const db = loadDb()
    const { name } = (await request.json()) as { name?: string }
    const v = (name ?? '').trim()
    if (!v) return HttpResponse.json({ message: 'Thiếu tên kỹ năng' }, { status: 400 })
    if (db.skills.includes(v))
      return HttpResponse.json({ message: 'Kỹ năng đã tồn tại' }, { status: 409 })
    db.skills.push(v)
    logMutation(db, request, 'skills', 'thêm', v)
    saveDb(db)
    return HttpResponse.json(db.skills, { status: 201 })
  }),
  http.patch(`/api/skills/:index`, async ({ params, request }) => {
    const db = loadDb()
    const i = Number(params.index)
    if (!Number.isInteger(i) || i < 0 || i >= db.skills.length)
      return new HttpResponse(null, { status: 404 })
    const { name } = (await request.json()) as { name?: string }
    const v = (name ?? '').trim()
    if (!v) return HttpResponse.json({ message: 'Thiếu tên kỹ năng' }, { status: 400 })
    if (db.skills.includes(v))
      return HttpResponse.json({ message: 'Kỹ năng đã tồn tại' }, { status: 409 })
    const old = db.skills[i]
    db.skills[i] = v
    // Đổi tên cập nhật theo: user.skills + task.skills lưu tên kỹ năng.
    for (const u of db.users) u.skills = u.skills.map((s: string) => (s === old ? v : s))
    for (const tk of db.tasks) tk.skills = tk.skills.map((s: string) => (s === old ? v : s))
    logMutation(db, request, 'skills', 'đổi tên', `${old} → ${v}`)
    saveDb(db)
    return HttpResponse.json(db.skills)
  }),
  http.delete(`/api/skills/:index`, ({ params, request }) => {
    const db = loadDb()
    const i = Number(params.index)
    if (!Number.isInteger(i) || i < 0 || i >= db.skills.length)
      return new HttpResponse(null, { status: 404 })
    const v = db.skills[i]
    // Chặn xoá khi còn tham chiếu (user hoặc task đang dùng kỹ năng).
    const used =
      db.users.some((u: { skills: string[] }) => u.skills.includes(v)) ||
      db.tasks.some((tk: { skills: string[] }) => tk.skills.includes(v))
    if (used)
      return HttpResponse.json(
        { message: `Kỹ năng "${v}" đang được dùng — không thể xoá` },
        { status: 409 },
      )
    db.skills.splice(i, 1)
    logMutation(db, request, 'skills', 'xoá', v)
    saveDb(db)
    return new HttpResponse(null, { status: 204 })
  }),
  // parish là object đơn (không phải mảng) — GET ở dưới; PATCH đổi tên.
  http.patch('/api/parish', async ({ request }) => {
    const db = loadDb()
    const { name } = (await request.json()) as { name?: string }
    const v = (name ?? '').trim()
    if (!v) return HttpResponse.json({ message: 'Thiếu tên giáo xứ' }, { status: 400 })
    db.parish.name = v
    logMutation(db, request, 'parish', 'đổi tên', v)
    saveDb(db)
    return HttpResponse.json(db.parish)
  }),
  http.get('/api/parish', () => HttpResponse.json(loadDb().parish)),
  // skills là string[] (danh mục, không phải record) — GET-only nguyên dạng.
  http.get('/api/skills', () => HttpResponse.json(loadDb().skills)),
  // CRUD cho mọi resource key mảng của seed.
  ...crud('users'),
  ...crud('seasons'),
  ...crud('communities'),
  ...crud('areas'),
  ...crud('tasks'),
  ...crud('volunteerRegs'),
  ...crud('materials'),
  ...crud('purchaseRequests'),
  ...crud('purchaseRecords'),
  ...crud('donations'),
  ...crud('borrowedItems'),
  ...crud('allocations'),
  ...crud('timesheets'),
  ...crud('supportRequests'),
  ...crud('supportRegs'),
  ...crud('checklists'),
  ...crud('activityLogs'),
]
