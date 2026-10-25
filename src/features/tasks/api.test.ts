import { expect, test } from 'vitest'
import { mapTaskDtoToTask, type TaskDto } from './api'

const base: TaskDto = {
  id: 't1',
  workAreaId: 'a1',
  name: 'Việc A',
  description: null,
  completionCriteria: null,
  taskType: 'WORK',
  purchaseRequestId: null,
  priority: 'MEDIUM',
  estimatedMinutes: 60,
  requiredVolunteers: 1,
  startAt: null,
  deadline: '2026-11-01T00:00:00Z',
  status: 'OPEN',
  version: 1,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: null,
}

test('OPEN (chưa ai nhận) map thành TODO', () => {
  expect(mapTaskDtoToTask({ ...base, status: 'OPEN' }).status).toBe('TODO')
})

test('NOT_STARTED (đã chốt tuyển) map thành READY, KHÔNG gộp vào TODO', () => {
  expect(mapTaskDtoToTask({ ...base, status: 'NOT_STARTED' }).status).toBe('READY')
})
