// Design Review qua MSW node handlers thật: design → version → comment.
// fetch của Node cần URL tuyệt đối → dùng location.origin của jsdom.
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest'
import { setupServer } from 'msw/node'
import { resetDb } from '@/lib/db'
import { handlers } from '@/mocks/handlers'

const base = location.origin
const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => resetDb())
afterAll(() => server.close())

const json = async (res: Response) => res.json()

async function post(path: string, body: unknown) {
  return fetch(`${base}/api${path}`, { method: 'POST', body: JSON.stringify(body) })
}

test('tạo design → version → comment, id theo prefix riêng', async () => {
  const designRes = await post('/designs', {
    areaId: 'a1',
    title: 'Phương án hang đá mặt tiền',
    designType: 'TWO_D',
    createdBy: 'u3',
  })
  expect(designRes.status).toBe(201)
  const design = await json(designRes)
  expect(design.id).toBe('dg1')

  const versionRes = await post('/designVersions', {
    designId: 'dg1',
    versionNumber: 1,
    fileKey: 'design_abc',
    fileName: 'ban-ve.png',
    mimeType: 'image/png',
    fileSize: 12345,
    status: 'IN_REVIEW',
    uploadedBy: 'u3',
  })
  expect(versionRes.status).toBe(201)
  const version = await json(versionRes)
  expect(version.id).toBe('dv1')

  const commentRes = await post('/designComments', {
    designVersionId: 'dv1',
    title: 'Mặt tiền cao quá',
    priority: 'HIGH',
    status: 'OPEN',
    positionType: 'IMAGE_2D',
    position2D: { x: 0.5, y: 0.25 },
    createdBy: 'u3',
  })
  expect(commentRes.status).toBe(201)
  const comment = await json(commentRes)
  expect(comment.id).toBe('dc1')
  expect(comment.position2D).toEqual({ x: 0.5, y: 0.25 })
})

test('duyệt phiên bản: PATCH giữ lịch sử, chỉ đổi status + approvedBy', async () => {
  await post('/designVersions', {
    designId: 'dg1',
    versionNumber: 1,
    fileKey: 'k1',
    fileName: 'v1.png',
    mimeType: 'image/png',
    fileSize: 10,
    status: 'IN_REVIEW',
    uploadedBy: 'u3',
  })
  await post('/designVersions', {
    designId: 'dg1',
    versionNumber: 2,
    fileKey: 'k2',
    fileName: 'v2.png',
    mimeType: 'image/png',
    fileSize: 20,
    status: 'IN_REVIEW',
    uploadedBy: 'u3',
  })

  const res = await fetch(`${base}/api/designVersions/dv2`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'APPROVED', approvedBy: 'u1' }),
  })
  expect(res.status).toBe(200)
  const approved = await json(res)
  expect(approved.status).toBe('APPROVED')
  expect(approved.approvedBy).toBe('u1')
  expect(approved.fileName).toBe('v2.png') // dữ liệu file không bị ghi đè

  const list = await json(await fetch(`${base}/api/designVersions`))
  expect(list).toHaveLength(2) // phiên bản cũ vẫn còn
  expect(list.find((v: { id: string }) => v.id === 'dv1').status).toBe('IN_REVIEW')
})

test('xoá comment trả 204 và không còn trong danh sách', async () => {
  await post('/designComments', {
    designVersionId: 'dv1',
    title: 'X',
    priority: 'LOW',
    status: 'OPEN',
    positionType: 'NONE',
    createdBy: 'u3',
  })
  const del = await fetch(`${base}/api/designComments/dc1`, { method: 'DELETE' })
  expect(del.status).toBe(204)
  const list = await json(await fetch(`${base}/api/designComments`))
  expect(list).toHaveLength(0)
})

test('mutation ghi activity log với nhãn tiếng Việt đúng', async () => {
  await post('/designs', { areaId: 'a1', title: 'A', designType: 'TWO_D', createdBy: 'u3' })
  const activity = await json(await fetch(`${base}/api/activity`))
  expect(
    activity.some(
      (l: { action: string; target: string }) =>
        l.action === 'tạo bản thiết kế' && l.target === 'dg1',
    ),
  ).toBe(true)
})
